import {
  ForkliftTaskStatus,
  ForkliftTaskType,
  MovimentPalletTripSuggestionStatus,
  PriorityLevel,
  RequestStatus,
  RoleUser,
  TypeMovimentPallet,
} from '../generated/prisma/enums.js'
import {
  MachineReplenishmentRequestNotFoundError,
  MovimentPalletDeliverTaskCompletionError,
  MovimentPalletNotFoundError,
  MovimentPalletNotInOperatorSectorError,
  MovimentPalletPickupTaskAcceptError,
  MovimentPalletPickupTaskCompletionError,
  MovimentPalletTaskNotFoundError,
  MovimentPalletTypeNotAllowedForRoleError,
  MovimentOperatorHasIncompleteTasksError,
  OperatorWithoutBoundMovimentPalletError,
  OperatorWithoutSectorError,
  ReplenishmentRequestAlreadyAssignedError,
  ReplenishmentRequestTypeMismatchError,
  TripRouteSuggestionAcceptForbiddenError,
  TripRouteSuggestionNotFoundError,
  TripRouteSuggestionNotOpenError,
} from '../errors/domain-errors.js'
import { prisma } from '../lib/prisma.js'
import { requestStatusPatch } from '../utils/request-status-since.js'
import { machineReplenishmentRequestRepository } from '../repositories/machine-replenishment-request.repository.js'
import { movimentPalletRepository } from '../repositories/moviment-pallet.repository.js'
import {
  isOpenTripTaskPairValid,
  movimentPalletTripSuggestionRepository,
} from '../repositories/moviment-pallet-trip-suggestion.repository.js'
import { movimentPalletTaskRepository } from '../repositories/moviment-pallet-task.repository.js'
import { userRepository } from '../repositories/user.repository.js'

function typesAllowedForRole(role: RoleUser): TypeMovimentPallet[] {
  switch (role) {
    case RoleUser.FORKLIFT_OPERATOR:
      return [TypeMovimentPallet.FORKLIFT]
    case RoleUser.FOLLOW_UP_OPERATOR:
      return [TypeMovimentPallet.PALLET_TRUCK]
    case RoleUser.ADMIN:
      return [TypeMovimentPallet.FORKLIFT, TypeMovimentPallet.PALLET_TRUCK]
    default:
      return []
  }
}

const priorityRank: Record<PriorityLevel, number> = {
  [PriorityLevel.VERY_HIGH]: 0,
  [PriorityLevel.HIGH]: 1,
  [PriorityLevel.NORMAL]: 2,
}

/** Retorna a prioridade mais urgente (ex.: VERY_HIGH vence HIGH e NORMAL). */
function mostUrgentPriority(
  a: PriorityLevel,
  b: PriorityLevel,
): PriorityLevel {
  return priorityRank[a] <= priorityRank[b] ? a : b
}

async function assertNoIncompleteTasksBlockingNewAccept(
  palletId: string,
  excludeTaskIds?: string[],
) {
  const count =
    await movimentPalletTaskRepository.countIncompleteTasksAssignedToPallet(
      palletId,
      excludeTaskIds,
    )
  if (count > 0) {
    throw new MovimentOperatorHasIncompleteTasksError()
  }
}

export async function listMovimentPalletsForOperatorPicker(
  operatorUserId: string,
  role: RoleUser,
) {
  const types = typesAllowedForRole(role)
  if (types.length === 0) {
    return []
  }
  const user = await userRepository.findUniqueByIdWithSector(operatorUserId)
  if (!user?.sectorId) {
    return []
  }
  return movimentPalletRepository.findManyForOperatorPicker({
    sectorId: user.sectorId,
    types,
    operatorUserId,
  })
}

export async function getOperatorCurrentMovimentPallet(operatorUserId: string) {
  return movimentPalletRepository.findFirstByOperatorUserId(operatorUserId)
}

export async function bindOperatorToMovimentPallet(
  operatorUserId: string,
  role: RoleUser,
  movimentPalletId: string,
) {
  const allowed = typesAllowedForRole(role)
  if (allowed.length === 0) {
    throw new MovimentPalletTypeNotAllowedForRoleError()
  }

  const user = await userRepository.findUniqueByIdWithSector(operatorUserId)
  if (!user?.sectorId) {
    throw new OperatorWithoutSectorError()
  }

  const pallet = await movimentPalletRepository.findUniqueById(movimentPalletId)
  if (!pallet) {
    throw new MovimentPalletNotFoundError()
  }
  if (!pallet.sectorId || pallet.sectorId !== user.sectorId) {
    throw new MovimentPalletNotInOperatorSectorError()
  }
  if (!allowed.includes(pallet.type)) {
    throw new MovimentPalletTypeNotAllowedForRoleError(
      'Este equipamento nao corresponde ao tipo permitido para o seu perfil.',
    )
  }

  return movimentPalletRepository.assignOperatorExclusive(
    movimentPalletId,
    operatorUserId,
  )
}

export async function unbindOperatorFromMovimentPallets(operatorUserId: string) {
  await movimentPalletRepository.disconnectOperatorFromAllMovimentPallets(
    operatorUserId,
  )
}

/** Itens na fila de entrega do tipo do equipamento (substituto leve de push). */
export async function listMovimentOperatorTransportNotifications(
  operatorUserId: string,
) {
  const { requests, onMachinePickupTasks } =
    await listOpenReplenishmentRequestsForMyMovimentType(operatorUserId)
  return {
    deliverRequestsAvailable: requests.length,
    onMachinePickupTasksAvailable: onMachinePickupTasks.length,
    deliverRequests: requests,
    onMachinePickupTasks,
  }
}

export async function listOpenReplenishmentRequestsForMyMovimentType(
  operatorUserId: string,
) {
  const pallet = await movimentPalletRepository.findFirstByOperatorUserId(
    operatorUserId,
  )
  if (!pallet) {
    return { requests: [], onMachinePickupTasks: [] }
  }

  const user = await userRepository.findUniqueByIdWithSector(operatorUserId)
  const sectorId = user?.sectorId

  const requests =
    await machineReplenishmentRequestRepository.findManyOpenPoolForMovimentType(
      pallet.type,
    )

  if (sectorId == null || sectorId === '') {
    return { requests, onMachinePickupTasks: [] }
  }

  const onMachinePickupTasks =
    await movimentPalletTaskRepository.findManyOpenPickupTasksForSectorAndMovimentType(
      sectorId,
      pallet.type,
    )

  return { requests, onMachinePickupTasks }
}

/**
 * Equipamento vinculado ao operador + tarefas atribuídas a esse equipamento
 * (mesma ordenação que `listMyMovimentPalletTasks`). Útil para montar linha do
 * tempo no front após aceitar sugestão, retirada avulsa ou pedido de entrega.
 */
export async function getOperatorMovimentPalletActiveFlow(operatorUserId: string) {
  const movimentPallet =
    await movimentPalletRepository.findFirstByOperatorUserId(operatorUserId)
  if (!movimentPallet) {
    return { movimentPallet: null, tasks: [] }
  }
  const tasks = await movimentPalletTaskRepository.findManyForAssignedPallet(
    movimentPallet.id,
  )
  const sorted = [...tasks].sort((a, b) => {
    const pa = priorityRank[a.request.priorityLevel]
    const pb = priorityRank[b.request.priorityLevel]
    if (pa !== pb) {
      return pa - pb
    }
    return (
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )
  })
  return { movimentPallet, tasks: sorted }
}

export async function listMyMovimentPalletTasks(operatorUserId: string) {
  const { tasks } = await getOperatorMovimentPalletActiveFlow(operatorUserId)
  return tasks
}

type TaskWithReq = Awaited<
  ReturnType<
    typeof movimentPalletTaskRepository.findManyOpenDeliverTasksForSectorAndMovimentType
  >
>[number]

type ComputedTripPair = {
  deliverTask: TaskWithReq
  pickupTask: TaskWithReq
  typeMovimentPallet: TypeMovimentPallet
}

type TripRouteSuggestionRow = {
  kind: 'COMBINE_DELIVER_AND_PICKUP_AT_MACHINE'
  typeMovimentPallet: TypeMovimentPallet
  effectivePriority: PriorityLevel
  deferRecommended: boolean
  machine: { id: string; name: string; position: string }
  message: string
  suggestedOrder: Array<{
    step: number
    taskType: ForkliftTaskType
    taskId: string
    requestId: string
    movementCube: string
  }>
  deliverTask: TaskWithReq
  pickupTask: TaskWithReq
  tripSuggestion: {
    id: string
    status: MovimentPalletTripSuggestionStatus
    acceptedAt: Date | null
    acceptedByUserId: string | null
    assignedMovimentPalletId: string | null
    createdAt: Date
    updatedAt: Date
  }
}

type StandalonePickupRow = {
  kind: 'PICKUP_ONLY_AT_MACHINE'
  typeMovimentPallet: TypeMovimentPallet
  effectivePriority: PriorityLevel
  deferRecommended: boolean
  machine: { id: string; name: string; position: string }
  message: string
  suggestedOrder: Array<{
    step: number
    taskType: ForkliftTaskType
    taskId: string
    requestId: string
    movementCube: string
  }>
  pickupTask: TaskWithReq
}

type StandalonePickupEntry = {
  pickupTask: TaskWithReq
  typeMovimentPallet: TypeMovimentPallet
}

/** Candidatos a um unico par 1× entrega + 1× retirada por tipo/setor — sem criar DELIVER ate escolher o melhor. */
type TripPairCandidate =
  | {
      kind: 'POOL'
      pickupTask: TaskWithReq
      poolRequest: PoolRequestRow
      typeMovimentPallet: TypeMovimentPallet
    }
  | {
      kind: 'EXISTING_DELIVER'
      pickupTask: TaskWithReq
      deliverTask: TaskWithReq
      typeMovimentPallet: TypeMovimentPallet
    }

function effectivePriorityForTripCandidate(candidate: TripPairCandidate): PriorityLevel {
  const pickupPri = candidate.pickupTask.request.priorityLevel
  if (candidate.kind === 'POOL') {
    return mostUrgentPriority(pickupPri, candidate.poolRequest.priorityLevel)
  }
  return mostUrgentPriority(pickupPri, candidate.deliverTask.request.priorityLevel)
}

function compareTripCandidates(a: TripPairCandidate, b: TripPairCandidate): number {
  const effA = priorityRank[effectivePriorityForTripCandidate(a)]
  const effB = priorityRank[effectivePriorityForTripCandidate(b)]
  if (effA !== effB) {
    return effA - effB
  }
  const ta = new Date(a.pickupTask.createdAt).getTime()
  const tb = new Date(b.pickupTask.createdAt).getTime()
  if (ta !== tb) {
    return ta - tb
  }
  /** Empate: prioriza recebimento CREATED (POOL) antes de entrega DELIVER ja aberta — alinha ao comportamento anterior. */
  const kindPri = (c: TripPairCandidate) => (c.kind === 'POOL' ? 0 : 1)
  const kdiff = kindPri(a) - kindPri(b)
  if (kdiff !== 0) {
    return kdiff
  }
  const destA =
    a.kind === 'POOL' ? a.poolRequest.destinationId : a.deliverTask.request.destinationId
  const destB =
    b.kind === 'POOL' ? b.poolRequest.destinationId : b.deliverTask.request.destinationId
  const dCmp = destA.localeCompare(destB)
  if (dCmp !== 0) {
    return dCmp
  }
  if (a.kind === 'POOL' && b.kind === 'POOL') {
    return a.poolRequest.id.localeCompare(b.poolRequest.id)
  }
  if (a.kind === 'EXISTING_DELIVER' && b.kind === 'EXISTING_DELIVER') {
    const dca = new Date(a.deliverTask.createdAt).getTime()
    const dcb = new Date(b.deliverTask.createdAt).getTime()
    if (dca !== dcb) {
      return dca - dcb
    }
    return a.deliverTask.id.localeCompare(b.deliverTask.id)
  }
  return a.pickupTask.id.localeCompare(b.pickupTask.id)
}

function emptyPriorityContext() {
  return {
    mostUrgentOpenInSector: null as PriorityLevel | null,
    hint: undefined as string | undefined,
  }
}

function buildTripPriorityContext(
  mostUrgentOpenInSector: PriorityLevel | null,
) {
  if (mostUrgentOpenInSector === null) {
    return emptyPriorityContext()
  }
  if (mostUrgentOpenInSector === PriorityLevel.VERY_HIGH) {
    return {
      mostUrgentOpenInSector,
      hint:
        'Existe pelo menos uma tarefa ou solicitacao VERY_HIGH em aberto no seu setor; atenda essas antes das demais — inclusive antes de sugestoes de viagem com prioridade HIGH ou NORMAL.',
    }
  }
  if (mostUrgentOpenInSector === PriorityLevel.HIGH) {
    return {
      mostUrgentOpenInSector,
      hint:
        'Existe atividade HIGH em aberto no setor; priorize antes das sugestoes e tarefas apenas NORMAL.',
    }
  }
  return {
    mostUrgentOpenInSector,
    hint: undefined as string | undefined,
  }
}

async function ensureOpenDeliverTaskForPoolRequest(
  requestId: string,
  requestedById: string,
): Promise<TaskWithReq> {
  const existing =
    await movimentPalletTaskRepository.findOpenDeliverForRequest(requestId)
  if (existing) {
    return existing
  }
  return movimentPalletTaskRepository.createOpenDeliverTaskForRequest(
    requestId,
    requestedById,
  )
}

function sortTasksByRequestPriority(tasks: TaskWithReq[]) {
  return [...tasks].sort((a, b) => {
    const pa = priorityRank[a.request.priorityLevel]
    const pb = priorityRank[b.request.priorityLevel]
    if (pa !== pb) {
      return pa - pb
    }
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  })
}

type PoolRequestRow = Awaited<
  ReturnType<
    typeof machineReplenishmentRequestRepository.findManyOpenPoolForSectorAndMovimentType
  >
>[number]

function sortPoolByPriority(requests: PoolRequestRow[]) {
  return [...requests].sort((a, b) => {
    const pa = priorityRank[a.priorityLevel]
    const pb = priorityRank[b.priorityLevel]
    if (pa !== pb) {
      return pa - pb
    }
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  })
}

async function computeTripPairsAndSectorUrgency(
  sectorId: string,
  types: TypeMovimentPallet[],
): Promise<{
  pairs: ComputedTripPair[]
  standalonePickups: StandalonePickupEntry[]
  mostUrgentOpenInSector: PriorityLevel | null
}> {
  let mostUrgentOpenInSector: PriorityLevel | null = null
  const pairs: ComputedTripPair[] = []
  const standalonePickups: StandalonePickupEntry[] = []

  for (const type of types) {
    const [pickups, delivers, poolRequests] = await Promise.all([
      movimentPalletTaskRepository.findManyOpenPickupTasksForSectorAndMovimentType(
        sectorId,
        type,
      ),
      movimentPalletTaskRepository.findManyOpenDeliverTasksForSectorAndMovimentType(
        sectorId,
        type,
      ),
      machineReplenishmentRequestRepository.findManyOpenPoolForSectorAndMovimentType(
        sectorId,
        type,
      ),
    ])

    for (const t of pickups) {
      mostUrgentOpenInSector =
        mostUrgentOpenInSector === null
          ? t.request.priorityLevel
          : mostUrgentPriority(mostUrgentOpenInSector, t.request.priorityLevel)
    }
    for (const t of delivers) {
      mostUrgentOpenInSector =
        mostUrgentOpenInSector === null
          ? t.request.priorityLevel
          : mostUrgentPriority(mostUrgentOpenInSector, t.request.priorityLevel)
    }
    for (const r of poolRequests) {
      mostUrgentOpenInSector =
        mostUrgentOpenInSector === null
          ? r.priorityLevel
          : mostUrgentPriority(mostUrgentOpenInSector, r.priorityLevel)
    }

    const pairedPickupIds = new Set<string>()
    /** No maximo **uma** sugestao combinada por `typeMovimentPallet` neste setor (1 DELIVER + 1 PICKUP). */
    const candidates: TripPairCandidate[] = []

    if (pickups.length === 0) {
      continue
    }

    const pickupsByMachine = new Map<string, TaskWithReq[]>()
    for (const t of pickups) {
      const mid = t.request.destinationId
      const list = pickupsByMachine.get(mid) ?? []
      list.push(t)
      pickupsByMachine.set(mid, list)
    }

    const deliversByMachine = new Map<string, TaskWithReq[]>()
    for (const t of delivers) {
      const mid = t.request.destinationId
      const list = deliversByMachine.get(mid) ?? []
      list.push(t)
      deliversByMachine.set(mid, list)
    }

    const poolByMachine = new Map<string, PoolRequestRow[]>()
    for (const r of poolRequests) {
      const mid = r.destinationId
      const list = poolByMachine.get(mid) ?? []
      list.push(r)
      poolByMachine.set(mid, list)
    }

    for (const [machineId, machinePickups] of pickupsByMachine) {
      const machineDelivers = deliversByMachine.get(machineId) ?? []
      const machinePool = poolByMachine.get(machineId) ?? []

      const sortedDeliver = sortTasksByRequestPriority(machineDelivers)
      const sortedPickups = sortTasksByRequestPriority(machinePickups)
      const sortedPool = sortPoolByPriority(machinePool)

      for (const pickupTask of sortedPickups) {
        for (const poolReq of sortedPool) {
          if (poolReq.id === pickupTask.requestId) {
            continue
          }
          candidates.push({
            kind: 'POOL',
            pickupTask,
            poolRequest: poolReq,
            typeMovimentPallet: type,
          })
        }
        for (const deliverTask of sortedDeliver) {
          if (deliverTask.requestId === pickupTask.requestId) {
            continue
          }
          candidates.push({
            kind: 'EXISTING_DELIVER',
            pickupTask,
            deliverTask,
            typeMovimentPallet: type,
          })
        }
      }
    }

    candidates.sort(compareTripCandidates)

    const pairsForType: ComputedTripPair[] = []
    if (candidates.length > 0) {
      const best = candidates[0]!
      if (best.kind === 'POOL') {
        const deliverTask = await ensureOpenDeliverTaskForPoolRequest(
          best.poolRequest.id,
          best.poolRequest.requestedById,
        )
        pairsForType.push({
          deliverTask,
          pickupTask: best.pickupTask,
          typeMovimentPallet: type,
        })
      } else {
        pairsForType.push({
          deliverTask: best.deliverTask,
          pickupTask: best.pickupTask,
          typeMovimentPallet: type,
        })
      }
    }

    if (pairsForType.length > 0) {
      pairedPickupIds.add(pairsForType[0]!.pickupTask.id)
    }
    pairs.push(...pairsForType)

    for (const pickupTask of pickups) {
      if (!pairedPickupIds.has(pickupTask.id)) {
        standalonePickups.push({ pickupTask, typeMovimentPallet: type })
      }
    }
  }

  return { pairs, standalonePickups, mostUrgentOpenInSector }
}

async function tryCompleteTripSuggestionForPickupTask(pickupTaskId: string) {
  const suggestion =
    await movimentPalletTripSuggestionRepository.findAcceptedByPickupTaskId(
      pickupTaskId,
    )
  if (!suggestion) {
    return
  }
  if (
    suggestion.deliverTask.status === ForkliftTaskStatus.COMPLETED &&
    suggestion.pickupTask.status === ForkliftTaskStatus.COMPLETED
  ) {
    await movimentPalletTripSuggestionRepository.markCompleted(suggestion.id)
  }
}

async function syncTripSuggestionsToDb(
  sectorId: string,
  types: TypeMovimentPallet[],
  pairs: ComputedTripPair[],
) {
  const openRows =
    await movimentPalletTripSuggestionRepository.findManyOpenForSector(
      sectorId,
      types,
    )
  const validKeys = new Set(
    pairs.map((p) => `${p.deliverTask.id}:${p.pickupTask.id}`),
  )
  const toExpire: string[] = []
  for (const row of openRows) {
    const key = `${row.deliverTaskId}:${row.pickupTaskId}`
    if (!validKeys.has(key)) {
      toExpire.push(row.id)
      continue
    }
    const { deliverTask, pickupTask } = row
    if (
      !isOpenTripTaskPairValid(
        deliverTask.type,
        deliverTask.status,
        pickupTask.type,
        pickupTask.status,
        deliverTask.requestId,
        pickupTask.requestId,
        deliverTask.request.destinationId,
        pickupTask.request.destinationId,
        deliverTask.request.status,
        pickupTask.request.status,
      )
    ) {
      toExpire.push(row.id)
    }
  }
  await movimentPalletTripSuggestionRepository.expireByIds(toExpire)
  for (const p of pairs) {
    await movimentPalletTripSuggestionRepository.upsertOpenPair({
      deliverTaskId: p.deliverTask.id,
      pickupTaskId: p.pickupTask.id,
      machineId: p.deliverTask.request.destinationId,
      typeMovimentPallet: p.typeMovimentPallet,
    })
  }
}

function mapDbRowToTripRouteSuggestion(
  row: {
    id: string
    status: MovimentPalletTripSuggestionStatus
    acceptedAt: Date | null
    acceptedByUserId: string | null
    assignedMovimentPalletId: string | null
    createdAt: Date
    updatedAt: Date
    deliverTask: TaskWithReq
    pickupTask: TaskWithReq
    typeMovimentPallet: TypeMovimentPallet
  },
  mostUrgentOpenInSector: PriorityLevel | null,
): TripRouteSuggestionRow {
  const effectivePriority = mostUrgentPriority(
    row.pickupTask.request.priorityLevel,
    row.deliverTask.request.priorityLevel,
  )
  const deferRecommended =
    mostUrgentOpenInSector !== null &&
    priorityRank[effectivePriority] > priorityRank[mostUrgentOpenInSector]

  const machine = row.pickupTask.request.destination
  const baseMessage =
    `Na maquina ${machine.name} (${machine.position}): ha pallet no recebimento destinado a esta maquina e retirada ja solicitada pelo operador da maquina. ` +
    `Sugestao: uma unica ida — buscar no recebimento, entregar na maquina, retirar o cubo finalizado e levar a expedicao.`

  const prioritySuffix = deferRecommended
    ? ` Prioridade desta sugestao: ${effectivePriority}; ha itens mais urgentes em aberto no setor (${mostUrgentOpenInSector}).`
    : ''

  return {
    kind: 'COMBINE_DELIVER_AND_PICKUP_AT_MACHINE',
    typeMovimentPallet: row.typeMovimentPallet,
    effectivePriority,
    deferRecommended,
    machine: {
      id: machine.id,
      name: machine.name,
      position: machine.position,
    },
    message: baseMessage + prioritySuffix,
    suggestedOrder: [
      {
        step: 1,
        taskType: ForkliftTaskType.DELIVER_TO_MACHINE,
        taskId: row.deliverTask.id,
        requestId: row.deliverTask.requestId,
        movementCube: row.deliverTask.request.movementCube,
      },
      {
        step: 2,
        taskType: ForkliftTaskType.PICKUP_TO_EXPEDITION,
        taskId: row.pickupTask.id,
        requestId: row.pickupTask.requestId,
        movementCube: row.pickupTask.request.movementCube,
      },
    ],
    deliverTask: row.deliverTask,
    pickupTask: row.pickupTask,
    tripSuggestion: {
      id: row.id,
      status: row.status,
      acceptedAt: row.acceptedAt,
      acceptedByUserId: row.acceptedByUserId,
      assignedMovimentPalletId: row.assignedMovimentPalletId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    },
  }
}

function mapStandalonePickupToRow(
  entry: StandalonePickupEntry,
  mostUrgentOpenInSector: PriorityLevel | null,
): StandalonePickupRow {
  const { pickupTask, typeMovimentPallet } = entry
  const effectivePriority = pickupTask.request.priorityLevel
  const deferRecommended =
    mostUrgentOpenInSector !== null &&
    priorityRank[effectivePriority] > priorityRank[mostUrgentOpenInSector]

  const machine = pickupTask.request.destination
  const baseMessage =
    `Na maquina ${machine.name} (${machine.position}): retirada ja solicitada pelo operador da maquina (cubo em ON_MACHINE). ` +
    `Aceite esta retirada para ir buscar o pallet na maquina (PICKUP_TO_EXPEDITION).`

  const prioritySuffix = deferRecommended
    ? ` Prioridade: ${effectivePriority}; ha itens mais urgentes em aberto no setor (${mostUrgentOpenInSector}).`
    : ''

  return {
    kind: 'PICKUP_ONLY_AT_MACHINE',
    typeMovimentPallet,
    effectivePriority,
    deferRecommended,
    machine: {
      id: machine.id,
      name: machine.name,
      position: machine.position,
    },
    message: baseMessage + prioritySuffix,
    suggestedOrder: [
      {
        step: 1,
        taskType: ForkliftTaskType.PICKUP_TO_EXPEDITION,
        taskId: pickupTask.id,
        requestId: pickupTask.requestId,
        movementCube: pickupTask.request.movementCube,
      },
    ],
    pickupTask,
  }
}

/**
 * Sugestoes de viagem persistidas em `MovimentPalletTripSuggestion`, sincronizadas
 * a partir do par entrega+retirada na mesma maquina.
 */
export async function listTripRouteSuggestionsForOperator(
  operatorUserId: string,
  role: RoleUser,
) {
  const types = typesAllowedForRole(role)
  if (types.length === 0) {
    return {
      suggestions: [] as TripRouteSuggestionRow[],
      standalonePickupTasks: [] as StandalonePickupRow[],
      priorityContext: emptyPriorityContext(),
    }
  }

  const user = await userRepository.findUniqueByIdWithSector(operatorUserId)
  if (!user?.sectorId) {
    return {
      suggestions: [],
      standalonePickupTasks: [],
      priorityContext: emptyPriorityContext(),
    }
  }

  const { pairs, standalonePickups, mostUrgentOpenInSector } =
    await computeTripPairsAndSectorUrgency(user.sectorId, types)

  await syncTripSuggestionsToDb(user.sectorId, types, pairs)

  await movimentPalletTripSuggestionRepository.reconcileCompletedAcceptedInSector(
    user.sectorId,
    types,
  )

  const dbRows =
    await movimentPalletTripSuggestionRepository.findManyOpenListableForOperator(
      user.sectorId,
      types,
    )

  const suggestions: TripRouteSuggestionRow[] = []
  for (const row of dbRows) {
    if (row.status === MovimentPalletTripSuggestionStatus.OPEN) {
      if (
        !isOpenTripTaskPairValid(
          row.deliverTask.type,
          row.deliverTask.status,
          row.pickupTask.type,
          row.pickupTask.status,
          row.deliverTask.requestId,
          row.pickupTask.requestId,
          row.deliverTask.request.destinationId,
          row.pickupTask.request.destinationId,
          row.deliverTask.request.status,
          row.pickupTask.request.status,
        )
      ) {
        continue
      }
    }
    suggestions.push(
      mapDbRowToTripRouteSuggestion(row, mostUrgentOpenInSector),
    )
  }

  suggestions.sort((a, b) => {
    const ra = priorityRank[a.effectivePriority]
    const rb = priorityRank[b.effectivePriority]
    if (ra !== rb) {
      return ra - rb
    }
    return a.machine.id.localeCompare(b.machine.id)
  })

  const standalonePickupTasks: StandalonePickupRow[] = standalonePickups.map(
    (s) => mapStandalonePickupToRow(s, mostUrgentOpenInSector),
  )
  standalonePickupTasks.sort((a, b) => {
    const ra = priorityRank[a.effectivePriority]
    const rb = priorityRank[b.effectivePriority]
    if (ra !== rb) {
      return ra - rb
    }
    return a.machine.id.localeCompare(b.machine.id)
  })

  const priorityContext = buildTripPriorityContext(mostUrgentOpenInSector)

  return { suggestions, standalonePickupTasks, priorityContext }
}

export async function acceptTripRouteSuggestion(
  operatorUserId: string,
  role: RoleUser,
  tripSuggestionId: string,
) {
  const allowed = typesAllowedForRole(role)
  if (allowed.length === 0) {
    throw new MovimentPalletTypeNotAllowedForRoleError()
  }

  const user = await userRepository.findUniqueByIdWithSector(operatorUserId)
  if (!user?.sectorId) {
    throw new OperatorWithoutSectorError()
  }

  const full =
    await movimentPalletTripSuggestionRepository.findByIdWithTasks(
      tripSuggestionId,
    )
  if (!full) {
    throw new TripRouteSuggestionNotFoundError()
  }
  if (full.status !== MovimentPalletTripSuggestionStatus.OPEN) {
    throw new TripRouteSuggestionNotOpenError()
  }
  if (full.machine.sectorId !== user.sectorId) {
    throw new TripRouteSuggestionAcceptForbiddenError(
      'Sugestao nao pertence ao seu setor.',
    )
  }
  if (!allowed.includes(full.typeMovimentPallet)) {
    throw new MovimentPalletTypeNotAllowedForRoleError()
  }

  const pallet = await movimentPalletRepository.findFirstByOperatorUserId(
    operatorUserId,
  )
  if (!pallet) {
    throw new OperatorWithoutBoundMovimentPalletError()
  }
  if (pallet.type !== full.typeMovimentPallet) {
    throw new MovimentPalletTypeNotAllowedForRoleError()
  }

  const dt = full.deliverTask
  const pt = full.pickupTask
  if (
    dt.assignedMovimentPalletId &&
    dt.assignedMovimentPalletId !== pallet.id
  ) {
    throw new TripRouteSuggestionAcceptForbiddenError(
      'A entrega ja esta vinculada a outro equipamento.',
    )
  }
  if (
    pt.assignedMovimentPalletId &&
    pt.assignedMovimentPalletId !== pallet.id
  ) {
    throw new TripRouteSuggestionAcceptForbiddenError(
      'A retirada ja esta vinculada a outro equipamento.',
    )
  }
  if (
    !isOpenTripTaskPairValid(
      dt.type,
      dt.status,
      pt.type,
      pt.status,
      dt.requestId,
      pt.requestId,
      dt.request.destinationId,
      pt.request.destinationId,
      dt.request.status,
      pt.request.status,
    )
  ) {
    throw new TripRouteSuggestionNotOpenError(
      'Par de tarefas nao esta mais disponivel para aceite.',
    )
  }

  await assertNoIncompleteTasksBlockingNewAccept(pallet.id)

  await prisma.$transaction(async (tx) => {
    if (dt.request.status === RequestStatus.CREATED) {
      const claimedRequest = await tx.machineReplenishmentRequest.updateMany({
        where: {
          id: dt.requestId,
          status: RequestStatus.CREATED,
          typeMovimentPallet: pallet.type,
        },
        data: requestStatusPatch(RequestStatus.IN_PROGRESS),
      })
      if (claimedRequest.count !== 1) {
        throw new ReplenishmentRequestAlreadyAssignedError()
      }
    }

    const claimed = await tx.movimentPalletTripSuggestion.updateMany({
      where: {
        id: tripSuggestionId,
        status: MovimentPalletTripSuggestionStatus.OPEN,
      },
      data: {
        status: MovimentPalletTripSuggestionStatus.ACCEPTED,
        acceptedByUserId: operatorUserId,
        assignedMovimentPalletId: pallet.id,
        acceptedAt: new Date(),
      },
    })
    if (claimed.count !== 1) {
      throw new TripRouteSuggestionNotOpenError()
    }

    const deliverData: {
      assignedMovimentPalletId: string
      status?: ForkliftTaskStatus
    } = { assignedMovimentPalletId: pallet.id }
    if (dt.status === ForkliftTaskStatus.CREATED) {
      deliverData.status = ForkliftTaskStatus.ASSIGNED
    }
    await tx.movimentPalletTask.update({
      where: { id: dt.id },
      data: deliverData,
    })

    const pickupData: {
      assignedMovimentPalletId: string
      status?: ForkliftTaskStatus
    } = { assignedMovimentPalletId: pallet.id }
    if (pt.status === ForkliftTaskStatus.CREATED) {
      pickupData.status = ForkliftTaskStatus.ASSIGNED
    }
    await tx.movimentPalletTask.update({
      where: { id: pt.id },
      data: pickupData,
    })
  })

  const tripSuggestion = await movimentPalletTripSuggestionRepository.findByIdWithTasks(
    tripSuggestionId,
  )
  if (!tripSuggestion) {
    throw new Error('Inconsistencia ao carregar sugestao apos aceite.')
  }

  return {
    tripSuggestion,
    deliverTask: tripSuggestion.deliverTask,
    pickupTask: tripSuggestion.pickupTask,
  }
}

const openPickupTaskStatusesAccept: ForkliftTaskStatus[] = [
  ForkliftTaskStatus.CREATED,
  ForkliftTaskStatus.ASSIGNED,
  ForkliftTaskStatus.IN_PROGRESS,
]

/**
 * Operador de empilhadeira aceita retirada ja solicitada (ON_MACHINE) quando
 * nao ha sugestao de viagem combinada — tarefa fica vinculada ao equipamento.
 */
export async function acceptOpenPickupTaskForMovimentOperator(
  operatorUserId: string,
  role: RoleUser,
  taskId: string,
) {
  const allowed = typesAllowedForRole(role)
  if (allowed.length === 0) {
    throw new MovimentPalletTypeNotAllowedForRoleError()
  }

  const user = await userRepository.findUniqueByIdWithSector(operatorUserId)
  if (!user?.sectorId) {
    throw new OperatorWithoutSectorError()
  }

  const pallet = await movimentPalletRepository.findFirstByOperatorUserId(
    operatorUserId,
  )
  if (!pallet) {
    throw new OperatorWithoutBoundMovimentPalletError()
  }
  if (!allowed.includes(pallet.type)) {
    throw new MovimentPalletTypeNotAllowedForRoleError()
  }

  const task = await movimentPalletTaskRepository.findByIdWithRequest(taskId)
  if (!task) {
    throw new MovimentPalletTaskNotFoundError()
  }

  if (task.type !== ForkliftTaskType.PICKUP_TO_EXPEDITION) {
    throw new MovimentPalletPickupTaskAcceptError(
      'Somente tarefas de retirada (PICKUP_TO_EXPEDITION) podem ser aceitas por este endpoint.',
    )
  }

  if (!openPickupTaskStatusesAccept.includes(task.status)) {
    throw new MovimentPalletPickupTaskAcceptError(
      'Esta retirada nao esta mais disponivel (ja concluida ou cancelada).',
    )
  }

  if (task.request.typeMovimentPallet !== pallet.type) {
    throw new ReplenishmentRequestTypeMismatchError()
  }

  if (task.request.status !== RequestStatus.ON_MACHINE) {
    throw new MovimentPalletPickupTaskAcceptError(
      'A solicitacao precisa estar em ON_MACHINE para aceitar a retirada.',
    )
  }

  const destSectorId = task.request.destination.sector?.id
  if (!destSectorId || destSectorId !== user.sectorId) {
    throw new MovimentPalletPickupTaskAcceptError(
      'Esta retirada nao pertence ao seu setor.',
    )
  }

  if (
    task.assignedMovimentPalletId &&
    task.assignedMovimentPalletId !== pallet.id
  ) {
    throw new MovimentPalletPickupTaskAcceptError(
      'Esta retirada ja esta vinculada a outro equipamento.',
    )
  }

  if (
    task.assignedMovimentPalletId === pallet.id &&
    task.status !== ForkliftTaskStatus.CREATED
  ) {
    const reloaded = await movimentPalletTaskRepository.findByIdWithRequest(
      taskId,
    )
    if (!reloaded) {
      throw new MovimentPalletTaskNotFoundError()
    }
    return { task: reloaded }
  }

  await assertNoIncompleteTasksBlockingNewAccept(pallet.id, [taskId])

  const claimed = await prisma.movimentPalletTask.updateMany({
    where: {
      id: taskId,
      type: ForkliftTaskType.PICKUP_TO_EXPEDITION,
      status: ForkliftTaskStatus.CREATED,
      assignedMovimentPalletId: null,
      request: {
        status: RequestStatus.ON_MACHINE,
        typeMovimentPallet: pallet.type,
        destination: { sectorId: user.sectorId },
      },
    },
    data: {
      assignedMovimentPalletId: pallet.id,
      status: ForkliftTaskStatus.ASSIGNED,
    },
  })

  if (claimed.count !== 1) {
    const reloaded = await movimentPalletTaskRepository.findByIdWithRequest(
      taskId,
    )
    if (
      reloaded &&
      reloaded.type === ForkliftTaskType.PICKUP_TO_EXPEDITION &&
      reloaded.assignedMovimentPalletId === pallet.id &&
      openPickupTaskStatusesAccept.includes(reloaded.status)
    ) {
      return { task: reloaded }
    }
    throw new MovimentPalletPickupTaskAcceptError(
      'Esta retirada nao esta mais disponivel ou foi aceita por outro operador.',
    )
  }

  const updated = await movimentPalletTaskRepository.findByIdWithRequest(taskId)
  if (!updated) {
    throw new MovimentPalletTaskNotFoundError()
  }

  return { task: updated }
}

export async function acceptReplenishmentRequestAsMovimentOperator(
  operatorUserId: string,
  role: RoleUser,
  requestId: string,
) {
  const allowed = typesAllowedForRole(role)
  if (allowed.length === 0) {
    throw new MovimentPalletTypeNotAllowedForRoleError()
  }

  const pallet = await movimentPalletRepository.findFirstByOperatorUserId(
    operatorUserId,
  )
  if (!pallet) {
    throw new OperatorWithoutBoundMovimentPalletError()
  }
  if (!allowed.includes(pallet.type)) {
    throw new MovimentPalletTypeNotAllowedForRoleError()
  }

  const request = await machineReplenishmentRequestRepository.findUniqueById(
    requestId,
  )
  if (!request) {
    throw new MachineReplenishmentRequestNotFoundError()
  }
  if (request.typeMovimentPallet !== pallet.type) {
    throw new ReplenishmentRequestTypeMismatchError()
  }

  await assertNoIncompleteTasksBlockingNewAccept(pallet.id)

  const created = await prisma.$transaction(async (tx) => {
    const claimed = await tx.machineReplenishmentRequest.updateMany({
      where: {
        id: requestId,
        status: {
          in: [RequestStatus.PALLET_READY, RequestStatus.CREATED],
        },
        typeMovimentPallet: pallet.type,
      },
      data: requestStatusPatch(RequestStatus.IN_PROGRESS),
    })
    if (claimed.count !== 1) {
      throw new ReplenishmentRequestAlreadyAssignedError()
    }

    return tx.movimentPalletTask.create({
      data: {
        type: ForkliftTaskType.DELIVER_TO_MACHINE,
        status: ForkliftTaskStatus.ASSIGNED,
        request: { connect: { id: requestId } },
        requestedBy: { connect: { id: request.requestedById } },
        assignedMovimentPallet: { connect: { id: pallet.id } },
      },
    })
  })

  const task = await movimentPalletTaskRepository.findByIdWithRequest(created.id)
  if (!task) {
    throw new Error('Inconsistencia ao carregar tarefa apos aceite.')
  }
  const updatedRequest =
    await machineReplenishmentRequestRepository.findUniqueById(requestId)

  return { task, request: updatedRequest }
}

const openDeliverTaskStatuses: ForkliftTaskStatus[] = [
  ForkliftTaskStatus.CREATED,
  ForkliftTaskStatus.ASSIGNED,
  ForkliftTaskStatus.IN_PROGRESS,
]

/**
 * Operador de empilhadeira / transpaleteira confirma que entregou o cubo na maquina:
 * conclui a tarefa DELIVER_TO_MACHINE e coloca a solicitacao em ON_MACHINE
 * (habilita retirada pelo operador de maquina).
 */
export async function completeDeliverTaskToMachine(
  operatorUserId: string,
  role: RoleUser,
  taskId: string,
) {
  const allowed = typesAllowedForRole(role)
  if (allowed.length === 0) {
    throw new MovimentPalletTypeNotAllowedForRoleError()
  }

  const pallet = await movimentPalletRepository.findFirstByOperatorUserId(
    operatorUserId,
  )
  if (!pallet) {
    throw new OperatorWithoutBoundMovimentPalletError()
  }
  if (!allowed.includes(pallet.type)) {
    throw new MovimentPalletTypeNotAllowedForRoleError()
  }

  const task = await movimentPalletTaskRepository.findByIdWithRequest(taskId)
  if (!task) {
    throw new MovimentPalletTaskNotFoundError()
  }

  if (task.type !== ForkliftTaskType.DELIVER_TO_MACHINE) {
    throw new MovimentPalletDeliverTaskCompletionError(
      'Somente tarefas de entrega (DELIVER_TO_MACHINE) podem ser concluidas aqui.',
    )
  }

  if (task.request.typeMovimentPallet !== pallet.type) {
    throw new ReplenishmentRequestTypeMismatchError()
  }

  if (task.assignedMovimentPalletId !== pallet.id) {
    throw new MovimentPalletDeliverTaskCompletionError(
      'Esta entrega nao esta atribuida ao equipamento que voce esta operando.',
    )
  }

  if (!openDeliverTaskStatuses.includes(task.status)) {
    if (
      task.status === ForkliftTaskStatus.COMPLETED &&
      task.request.status === RequestStatus.ON_MACHINE
    ) {
      const request = await machineReplenishmentRequestRepository.findUniqueById(
        task.requestId,
      )
      if (!request) {
        throw new MovimentPalletTaskNotFoundError()
      }
      return { task, request }
    }
    throw new MovimentPalletDeliverTaskCompletionError(
      'Esta entrega ja foi concluida ou esta cancelada.',
    )
  }

  if (task.request.status !== RequestStatus.IN_PROGRESS) {
    throw new MovimentPalletDeliverTaskCompletionError(
      'A solicitacao precisa estar em andamento (IN_PROGRESS) para registrar a entrega na maquina.',
    )
  }

  await prisma.$transaction(async (tx) => {
    const taskUpdate = await tx.movimentPalletTask.updateMany({
      where: {
        id: taskId,
        assignedMovimentPalletId: pallet.id,
        type: ForkliftTaskType.DELIVER_TO_MACHINE,
        status: { in: openDeliverTaskStatuses },
      },
      data: {
        status: ForkliftTaskStatus.COMPLETED,
        completedAt: new Date(),
      },
    })
    if (taskUpdate.count !== 1) {
      throw new MovimentPalletDeliverTaskCompletionError()
    }

    const requestUpdate = await tx.machineReplenishmentRequest.updateMany({
      where: {
        id: task.requestId,
        status: RequestStatus.IN_PROGRESS,
      },
      data: requestStatusPatch(RequestStatus.ON_MACHINE),
    })
    if (requestUpdate.count !== 1) {
      throw new Error(
        'Inconsistencia ao atualizar solicitacao apos entrega; tente novamente ou contate o suporte.',
      )
    }
  })

  const updatedTask = await movimentPalletTaskRepository.findByIdWithRequest(taskId)
  const updatedRequest =
    await machineReplenishmentRequestRepository.findUniqueById(task.requestId)
  if (!updatedTask || !updatedRequest) {
    throw new Error('Inconsistencia ao carregar dados apos entrega.')
  }

  return { task: updatedTask, request: updatedRequest }
}

/**
 * Operador confirma que retirou o cubo da maquina (expedicao): conclui PICKUP_TO_EXPEDITION
 * e encerra a solicitacao (COMPLETED).
 */
export async function completePickupTaskToExpedition(
  operatorUserId: string,
  role: RoleUser,
  taskId: string,
) {
  const allowed = typesAllowedForRole(role)
  if (allowed.length === 0) {
    throw new MovimentPalletTypeNotAllowedForRoleError()
  }

  const pallet = await movimentPalletRepository.findFirstByOperatorUserId(
    operatorUserId,
  )
  if (!pallet) {
    throw new OperatorWithoutBoundMovimentPalletError()
  }
  if (!allowed.includes(pallet.type)) {
    throw new MovimentPalletTypeNotAllowedForRoleError()
  }

  const task = await movimentPalletTaskRepository.findByIdWithRequest(taskId)
  if (!task) {
    throw new MovimentPalletTaskNotFoundError()
  }

  if (task.type !== ForkliftTaskType.PICKUP_TO_EXPEDITION) {
    throw new MovimentPalletPickupTaskCompletionError(
      'Somente tarefas de retirada (PICKUP_TO_EXPEDITION) podem ser concluidas aqui.',
    )
  }

  if (task.request.typeMovimentPallet !== pallet.type) {
    throw new ReplenishmentRequestTypeMismatchError()
  }

  if (task.assignedMovimentPalletId !== pallet.id) {
    throw new MovimentPalletPickupTaskCompletionError(
      'Esta retirada nao esta atribuida ao equipamento que voce esta operando.',
    )
  }

  if (!openPickupTaskStatusesAccept.includes(task.status)) {
    if (
      task.status === ForkliftTaskStatus.COMPLETED &&
      task.request.status === RequestStatus.COMPLETED
    ) {
      const request = await machineReplenishmentRequestRepository.findUniqueById(
        task.requestId,
      )
      if (!request) {
        throw new MovimentPalletTaskNotFoundError()
      }
      return { task, request }
    }
    throw new MovimentPalletPickupTaskCompletionError(
      'Esta retirada ja foi concluida ou esta cancelada.',
    )
  }

  if (task.request.status !== RequestStatus.ON_MACHINE) {
    throw new MovimentPalletPickupTaskCompletionError(
      'A solicitacao precisa estar em ON_MACHINE para registrar a retirada na expedicao.',
    )
  }

  await prisma.$transaction(async (tx) => {
    const taskUpdate = await tx.movimentPalletTask.updateMany({
      where: {
        id: taskId,
        assignedMovimentPalletId: pallet.id,
        type: ForkliftTaskType.PICKUP_TO_EXPEDITION,
        status: { in: openPickupTaskStatusesAccept },
      },
      data: {
        status: ForkliftTaskStatus.COMPLETED,
        completedAt: new Date(),
      },
    })
    if (taskUpdate.count !== 1) {
      throw new MovimentPalletPickupTaskCompletionError()
    }

    const requestUpdate = await tx.machineReplenishmentRequest.updateMany({
      where: {
        id: task.requestId,
        status: RequestStatus.ON_MACHINE,
      },
      data: {
        ...requestStatusPatch(RequestStatus.COMPLETED),
        completedAt: new Date(),
      },
    })
    if (requestUpdate.count !== 1) {
      throw new Error(
        'Inconsistencia ao atualizar solicitacao apos retirada; tente novamente ou contate o suporte.',
      )
    }
  })

  const updatedTask = await movimentPalletTaskRepository.findByIdWithRequest(taskId)
  const updatedRequest =
    await machineReplenishmentRequestRepository.findUniqueById(task.requestId)
  if (!updatedTask || !updatedRequest) {
    throw new Error('Inconsistencia ao carregar dados apos retirada.')
  }

  await tryCompleteTripSuggestionForPickupTask(taskId)

  return { task: updatedTask, request: updatedRequest }
}

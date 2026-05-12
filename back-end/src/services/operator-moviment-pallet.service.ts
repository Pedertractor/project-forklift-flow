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
  MovimentPalletNotFoundError,
  MovimentPalletNotInOperatorSectorError,
  MovimentPalletTypeNotAllowedForRoleError,
  OperatorWithoutBoundMovimentPalletError,
  OperatorWithoutSectorError,
  ReplenishmentRequestAlreadyAssignedError,
  ReplenishmentRequestTypeMismatchError,
  TripRouteSuggestionAcceptForbiddenError,
  TripRouteSuggestionNotFoundError,
  TripRouteSuggestionNotOpenError,
} from '../errors/domain-errors.js'
import { prisma } from '../lib/prisma.js'
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

export async function listOpenReplenishmentRequestsForMyMovimentType(
  operatorUserId: string,
) {
  const pallet = await movimentPalletRepository.findFirstByOperatorUserId(
    operatorUserId,
  )
  if (!pallet) {
    return []
  }
  return machineReplenishmentRequestRepository.findManyOpenPoolForMovimentType(
    pallet.type,
  )
}

export async function listMyMovimentPalletTasks(operatorUserId: string) {
  const pallet = await movimentPalletRepository.findFirstByOperatorUserId(
    operatorUserId,
  )
  if (!pallet) {
    return []
  }
  const tasks = await movimentPalletTaskRepository.findManyForAssignedPallet(
    pallet.id,
  )
  return [...tasks].sort((a, b) => {
    const pa = priorityRank[a.request.priorityLevel]
    const pb = priorityRank[b.request.priorityLevel]
    if (pa !== pb) {
      return pa - pb
    }
    return (
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )
  })
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

async function computeTripPairsAndSectorUrgency(
  sectorId: string,
  types: TypeMovimentPallet[],
): Promise<{
  pairs: ComputedTripPair[]
  mostUrgentOpenInSector: PriorityLevel | null
}> {
  let mostUrgentOpenInSector: PriorityLevel | null = null
  const pairs: ComputedTripPair[] = []

  for (const type of types) {
    const [pickups, delivers] = await Promise.all([
      movimentPalletTaskRepository.findManyOpenPickupTasksForSectorAndMovimentType(
        sectorId,
        type,
      ),
      movimentPalletTaskRepository.findManyOpenDeliverTasksForSectorAndMovimentType(
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

    if (pickups.length === 0 || delivers.length === 0) {
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

    for (const [machineId, machinePickups] of pickupsByMachine) {
      const machineDelivers = deliversByMachine.get(machineId)
      if (!machineDelivers?.length) {
        continue
      }

      const sortedDeliver = [...machineDelivers].sort((a, b) => {
        const pa = priorityRank[a.request.priorityLevel]
        const pb = priorityRank[b.request.priorityLevel]
        if (pa !== pb) {
          return pa - pb
        }
        return (
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        )
      })

      const sortedPickups = [...machinePickups].sort((a, b) => {
        const pa = priorityRank[a.request.priorityLevel]
        const pb = priorityRank[b.request.priorityLevel]
        if (pa !== pb) {
          return pa - pb
        }
        return (
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        )
      })

      const usedDeliverIds = new Set<string>()
      for (const pickupTask of sortedPickups) {
        const deliverTask = sortedDeliver.find(
          (d) =>
            d.requestId !== pickupTask.requestId &&
            !usedDeliverIds.has(d.id),
        )
        if (!deliverTask) {
          continue
        }
        usedDeliverIds.add(deliverTask.id)
        pairs.push({ deliverTask, pickupTask, typeMovimentPallet: type })
      }
    }
  }

  return { pairs, mostUrgentOpenInSector }
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
    `Na maquina ${machine.name} (${machine.position}): ha cubo para ENTREGAR nesta maquina e RETIRADA ja solicitada pelo operador. ` +
    `Sugestao: uma unica ida — primeiro conclua a entrega (DELIVER_TO_MACHINE) e em seguida execute a retirada (PICKUP_TO_EXPEDITION), aproveitando o trajeto.`

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
      priorityContext: emptyPriorityContext(),
    }
  }

  const user = await userRepository.findUniqueByIdWithSector(operatorUserId)
  if (!user?.sectorId) {
    return {
      suggestions: [],
      priorityContext: emptyPriorityContext(),
    }
  }

  const { pairs, mostUrgentOpenInSector } =
    await computeTripPairsAndSectorUrgency(user.sectorId, types)

  await syncTripSuggestionsToDb(user.sectorId, types, pairs)

  const dbRows =
    await movimentPalletTripSuggestionRepository.findManyListableForOperator(
      user.sectorId,
      types,
      operatorUserId,
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

  const priorityContext = buildTripPriorityContext(mostUrgentOpenInSector)

  return { suggestions, priorityContext }
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
      pt.request.status,
    )
  ) {
    throw new TripRouteSuggestionNotOpenError(
      'Par de tarefas nao esta mais disponivel para aceite.',
    )
  }

  await prisma.$transaction(async (tx) => {
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

  const created = await prisma.$transaction(async (tx) => {
    const claimed = await tx.machineReplenishmentRequest.updateMany({
      where: {
        id: requestId,
        status: RequestStatus.CREATED,
        typeMovimentPallet: pallet.type,
      },
      data: { status: RequestStatus.IN_PROGRESS },
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

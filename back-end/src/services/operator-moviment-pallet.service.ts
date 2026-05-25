import {
  MachineTaskStatus,
  MovimentPalletEquipmentType,
  MovimentPalletTripSuggestionStatus,
  RoleUser,
  TypeMovimentPallet,
} from '../generated/prisma/enums.js'
import {
  DeliveryTaskNotFoundError,
  MovimentPalletDeliverTaskAcceptError,
  MovimentPalletDeliverTaskCompletionError,
  MovimentPalletNotFoundError,
  MovimentPalletNotInOperatorSectorError,
  MovimentPalletOccupiedByOtherOperatorError,
  MovimentPalletPickupTaskAcceptError,
  MovimentPalletPickupTaskCompletionError,
  MovimentPalletTaskNotFoundError,
  MovimentPalletTypeNotAllowedForRoleError,
  MovimentOperatorHasIncompleteTasksError,
  OperatorWithoutBoundMovimentPalletError,
  OperatorWithoutSectorError,
  PickupTaskNotFoundError,
  ReplenishmentRequestTypeMismatchError,
  TripRouteSuggestionAcceptForbiddenError,
  TripRouteSuggestionNotFoundError,
  TripRouteSuggestionNotOpenError,
} from '../errors/domain-errors.js'
import { prisma } from '../lib/prisma.js'
import {
  operatorMovimentPalletWsBroadcastQueueUpdated,
  operatorMovimentPalletWsBroadcastTripSuggestionsUpdated,
  operatorMovimentPalletWsNotifyDeliveryTaskChange,
  operatorMovimentPalletWsNotifyPickupTaskChange,
} from '../ws/operator-moviment-pallet-ws.hub.js'
import { openMachineTaskStatuses, incompleteAssignedMachineTaskStatuses } from '../constants/machine-task-status.js'
import { deliveryTaskRepository } from '../repositories/delivery-task.repository.js'
import { pickupTaskRepository } from '../repositories/pickup-task.repository.js'
import {
  isOpenTripTaskPairValid,
  movimentPalletTripSuggestionRepository,
  type MovimentPalletTripSuggestionWithTasks,
} from '../repositories/moviment-pallet-trip-suggestion.repository.js'
import type { DeliveryTaskListRow } from '../repositories/delivery-task.repository.js'
import type { PickupTaskListRow } from '../repositories/pickup-task.repository.js'
import { movimentPalletRepository } from '../repositories/moviment-pallet.repository.js'
import { userRepository } from '../repositories/user.repository.js'
import {
  assertEquipmentMovimentType,
  openPoolTypesForEquipment,
  requestTypeMatchesEquipment,
  type EquipmentMovimentType,
} from '../utils/replenishment-moviment-type.js'

function equipmentTypesAllowedForRole(role: RoleUser): MovimentPalletEquipmentType[] {
  switch (role) {
    case RoleUser.FORKLIFT_OPERATOR:
      return [MovimentPalletEquipmentType.FORKLIFT]
    case RoleUser.FOLLOW_UP_OPERATOR:
      return [MovimentPalletEquipmentType.PALLET_TRUCK]
    case RoleUser.ADMIN:
      return [MovimentPalletEquipmentType.FORKLIFT, MovimentPalletEquipmentType.PALLET_TRUCK]
    default:
      return []
  }
}

function poolTypesForRole(role: RoleUser): TypeMovimentPallet[] {
  const types = equipmentTypesAllowedForRole(role)
  const result = new Set<TypeMovimentPallet>()
  for (const t of types) {
    for (const p of openPoolTypesForEquipment(t)) {
      result.add(p)
    }
  }
  return [...result]
}

function sortByCritical<T extends { isCritical: boolean; createdAt: Date }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    if (a.isCritical !== b.isCritical) {
      return a.isCritical ? -1 : 1
    }
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  })
}

type LinkedOpenTripTaskIds = {
  deliverIds: Set<string>
  pickupIds: Set<string>
}

function linkedOpenTripTaskIdsFromRows(
  rows: MovimentPalletTripSuggestionWithTasks[],
): LinkedOpenTripTaskIds {
  const deliverIds = new Set<string>()
  const pickupIds = new Set<string>()
  for (const row of rows) {
    const d = row.deliverTask
    const p = row.pickupTask
    if (
      !isOpenTripTaskPairValid(
        d.status,
        p.status,
        d.machineId,
        p.machineId,
        d.preparedAt != null,
      )
    ) {
      continue
    }
    deliverIds.add(row.deliverTaskId)
    pickupIds.add(row.pickupTaskId)
  }
  return { deliverIds, pickupIds }
}

async function linkedOpenTripTaskIdsForSector(
  sectorId: string,
  types: TypeMovimentPallet[],
): Promise<LinkedOpenTripTaskIds> {
  const rows =
    await movimentPalletTripSuggestionRepository.findManyOpenListableForOperator(
      sectorId,
      types,
    )
  return linkedOpenTripTaskIdsFromRows(rows)
}

type StandalonePickupSuggestionRow = {
  kind: 'PICKUP_ONLY_AT_MACHINE'
  typeMovimentPallet: TypeMovimentPallet
  effectiveCritical: boolean
  deferRecommended: boolean
  machine: { id: string; name: string; position: string }
  message: string
  suggestedOrder: []
  pickupTask: PickupTaskListRow
}

type StandaloneDeliverSuggestionRow = {
  kind: 'DELIVER_ONLY_TO_MACHINE'
  typeMovimentPallet: TypeMovimentPallet
  effectiveCritical: boolean
  deferRecommended: boolean
  machine: { id: string; name: string; position: string }
  message: string
  suggestedOrder: []
  requestId: string
  deliverTask: DeliveryTaskListRow
}

function mapStandalonePickupRow(task: PickupTaskListRow): StandalonePickupSuggestionRow {
  const machine = task.machine!
  return {
    kind: 'PICKUP_ONLY_AT_MACHINE',
    typeMovimentPallet: task.typeMovimentPallet,
    effectiveCritical: task.isCritical,
    deferRecommended: false,
    machine: {
      id: machine.id,
      name: machine.name,
      position: machine.position,
    },
    message: `Na maquina ${machine.name} (${machine.position}): retirada solicitada — aceite para levar o pallet a expedicao.`,
    suggestedOrder: [],
    pickupTask: task,
  }
}

function mapStandaloneDeliverRow(task: DeliveryTaskListRow): StandaloneDeliverSuggestionRow {
  const machine = task.machine!
  return {
    kind: 'DELIVER_ONLY_TO_MACHINE',
    typeMovimentPallet: task.typeMovimentPallet,
    effectiveCritical: task.isCritical,
    deferRecommended: false,
    machine: {
      id: machine.id,
      name: machine.name,
      position: machine.position,
    },
    message: `Entregar prisma ${task.movementCube} na maquina ${machine.name} (${machine.position}).`,
    suggestedOrder: [],
    requestId: task.id,
    deliverTask: task,
  }
}

async function listStandaloneTripTasksForSector(
  sectorId: string,
  role: RoleUser,
  linked: LinkedOpenTripTaskIds,
): Promise<{
  standalonePickupTasks: StandalonePickupSuggestionRow[]
  standaloneDeliverTasks: StandaloneDeliverSuggestionRow[]
}> {
  const standalonePickupTasks: StandalonePickupSuggestionRow[] = []
  const standaloneDeliverTasks: StandaloneDeliverSuggestionRow[] = []
  const equipmentTypes = equipmentTypesAllowedForRole(role)

  for (const equipmentType of equipmentTypes) {
    const [deliveries, pickups] = await Promise.all([
      deliveryTaskRepository.findManyOpenPoolForSectorAndMovimentType(
        sectorId,
        equipmentType,
      ),
      pickupTaskRepository.findManyOpenPickupForSectorAndMovimentType(
        sectorId,
        equipmentType,
      ),
    ])

    for (const pickup of pickups) {
      if (pickup.status !== MachineTaskStatus.CREATED) continue
      if (pickup.assignedMovimentPalletId) continue
      if (linked.pickupIds.has(pickup.id)) continue
      if (!pickup.isCritical) continue
      if (!pickup.machine) continue
      standalonePickupTasks.push(mapStandalonePickupRow(pickup))
    }

    for (const deliver of deliveries) {
      if (linked.deliverIds.has(deliver.id)) continue
      if (!deliver.isCritical) continue
      if (!deliver.machine) continue
      standaloneDeliverTasks.push(mapStandaloneDeliverRow(deliver))
    }
  }

  const byTaskUrgency = (
    a: { effectiveCritical: boolean; createdAt: Date },
    b: { effectiveCritical: boolean; createdAt: Date },
  ) => {
    if (a.effectiveCritical !== b.effectiveCritical) {
      return a.effectiveCritical ? -1 : 1
    }
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  }

  standalonePickupTasks.sort((a, b) =>
    byTaskUrgency(
      { effectiveCritical: a.effectiveCritical, createdAt: a.pickupTask.createdAt },
      { effectiveCritical: b.effectiveCritical, createdAt: b.pickupTask.createdAt },
    ),
  )
  standaloneDeliverTasks.sort((a, b) =>
    byTaskUrgency(
      { effectiveCritical: a.effectiveCritical, createdAt: a.deliverTask.createdAt },
      { effectiveCritical: b.effectiveCritical, createdAt: b.deliverTask.createdAt },
    ),
  )

  return { standalonePickupTasks, standaloneDeliverTasks }
}

async function assertNoIncompleteTasks(palletId: string, excludeIds: string[] = []) {
  const [deliverCount, pickupCount] = await Promise.all([
    deliveryTaskRepository.countIncompleteAssignedToPallet(palletId, excludeIds),
    pickupTaskRepository.countIncompleteAssignedToPallet(palletId, excludeIds),
  ])
  if (deliverCount + pickupCount > 0) {
    throw new MovimentOperatorHasIncompleteTasksError()
  }
}

export async function listMovimentPalletsForOperatorPicker(
  operatorUserId: string,
  role: RoleUser,
) {
  const types = equipmentTypesAllowedForRole(role)
  if (types.length === 0) return []
  const user = await userRepository.findUniqueByIdWithSector(operatorUserId)
  if (!user?.sectorId) return []
  return movimentPalletRepository.findManyForOperatorPicker({
    sectorId: user.sectorId,
    types,
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
  const allowed = equipmentTypesAllowedForRole(role)
  if (allowed.length === 0) throw new MovimentPalletTypeNotAllowedForRoleError()

  const user = await userRepository.findUniqueByIdWithSector(operatorUserId)
  if (!user?.sectorId) throw new OperatorWithoutSectorError()

  const pallet = await movimentPalletRepository.findUniqueById(movimentPalletId)
  if (!pallet) throw new MovimentPalletNotFoundError()
  if (!pallet.sectorId || pallet.sectorId !== user.sectorId) {
    throw new MovimentPalletNotInOperatorSectorError()
  }
  if (!allowed.includes(pallet.type)) {
    throw new MovimentPalletTypeNotAllowedForRoleError()
  }
  if (pallet.operatorId !== null && pallet.operatorId !== operatorUserId) {
    throw new MovimentPalletOccupiedByOtherOperatorError()
  }

  return movimentPalletRepository.assignOperatorExclusive(
    movimentPalletId,
    operatorUserId,
  )
}

export async function unbindOperatorFromMovimentPallets(operatorUserId: string) {
  await movimentPalletRepository.disconnectOperatorFromAllMovimentPallets(operatorUserId)
}

export async function listOpenReplenishmentRequestsForMyMovimentType(
  operatorUserId: string,
) {
  const pallet = await movimentPalletRepository.findFirstByOperatorUserId(operatorUserId)
  if (!pallet) return { deliveryTasks: [], pickupTasks: [] }

  const user = await userRepository.findUniqueByIdWithSector(operatorUserId)
  if (!user?.sectorId) return { deliveryTasks: [], pickupTasks: [] }

  const poolTypes = openPoolTypesForEquipment(pallet.type)
  await syncTripSuggestions(user.sectorId, poolTypes)
  const linked = await linkedOpenTripTaskIdsForSector(user.sectorId, poolTypes)

  const [deliveryTasks, pickupTasks] = await Promise.all([
    deliveryTaskRepository.findManyOpenPoolForSectorAndMovimentType(
      user.sectorId,
      pallet.type,
    ),
    pickupTaskRepository.findManyOpenPickupForSectorAndMovimentType(
      user.sectorId,
      pallet.type,
    ),
  ])

  /** Fila manual: avulsas nao criticas e fora de sugestao combinada (criticas vao na tela principal). */
  const openDeliveryTasks = deliveryTasks.filter(
    (t) => !linked.deliverIds.has(t.id) && !t.isCritical,
  )
  const openPickupTasks = pickupTasks.filter(
    (t) =>
      t.status === MachineTaskStatus.CREATED &&
      !t.assignedMovimentPalletId &&
      !linked.pickupIds.has(t.id) &&
      !t.isCritical,
  )

  return {
    deliveryTasks: sortByCritical(openDeliveryTasks),
    pickupTasks: sortByCritical(openPickupTasks),
    requests: openDeliveryTasks,
    onMachinePickupTasks: openPickupTasks,
  }
}

export async function listMovimentOperatorTransportNotifications(
  operatorUserId: string,
) {
  const { deliveryTasks, pickupTasks } =
    await listOpenReplenishmentRequestsForMyMovimentType(operatorUserId)
  return {
    deliverRequestsAvailable: deliveryTasks.length,
    onMachinePickupTasksAvailable: pickupTasks.length,
    deliverRequests: deliveryTasks,
    deliveryTasks,
    onMachinePickupTasks: pickupTasks,
    pickupTasks,
  }
}

async function listAssignedTasks(operatorUserId: string) {
  const movimentPallet =
    await movimentPalletRepository.findFirstByOperatorUserId(operatorUserId)
  if (!movimentPallet) return { movimentPallet: null, deliveryTasks: [], pickupTasks: [] }

  const [deliveryTasks, pickupTasks] = await Promise.all([
    deliveryTaskRepository.findManyForAssignedPallet(movimentPallet.id),
    pickupTaskRepository.findManyForAssignedPallet(movimentPallet.id),
  ])

  return {
    movimentPallet,
    deliveryTasks: sortByCritical(
      deliveryTasks.filter((t) => incompleteAssignedMachineTaskStatuses.includes(t.status)),
    ),
    pickupTasks: sortByCritical(
      pickupTasks.filter((t) => incompleteAssignedMachineTaskStatuses.includes(t.status)),
    ),
  }
}

export async function getOperatorMovimentPalletActiveFlow(
  operatorUserId: string,
  _role: RoleUser,
) {
  const { movimentPallet, deliveryTasks, pickupTasks } =
    await listAssignedTasks(operatorUserId)
  return {
    movimentPallet,
    deliveryTasks,
    pickupTasks,
    tasks: [
      ...deliveryTasks.map((t) => ({ kind: 'DELIVERY' as const, task: t })),
      ...pickupTasks.map((t) => ({ kind: 'PICKUP' as const, task: t })),
    ],
  }
}

export async function listMyMovimentPalletTasks(
  operatorUserId: string,
  role: RoleUser,
) {
  const flow = await getOperatorMovimentPalletActiveFlow(operatorUserId, role)
  return flow.tasks
}

async function syncTripSuggestions(sectorId: string, types: TypeMovimentPallet[]) {
  for (const type of types) {
    const pickups = await pickupTaskRepository.findManyOpenWithReplenishmentForSector(
      sectorId,
      type === TypeMovimentPallet.FORKLIFT
        ? MovimentPalletEquipmentType.FORKLIFT
        : MovimentPalletEquipmentType.PALLET_TRUCK,
    )
    for (const pickup of pickups) {
      const deliver = await deliveryTaskRepository.findOpenPreparedForMachine(
        pickup.machineId,
      )
      if (
        deliver &&
        isOpenTripTaskPairValid(
          deliver.status,
          pickup.status,
          deliver.machineId,
          pickup.machineId,
          deliver.preparedAt != null,
        )
      ) {
        await movimentPalletTripSuggestionRepository.upsertOpenPair({
          deliverTaskId: deliver.id,
          pickupTaskId: pickup.id,
          machineId: pickup.machineId,
          typeMovimentPallet: deliver.typeMovimentPallet,
        })
      }
    }
  }
}

export async function listTripRouteSuggestionsForOperator(
  operatorUserId: string,
  role: RoleUser,
) {
  const types = poolTypesForRole(role)
  if (types.length === 0) {
    return {
      suggestions: [],
      standalonePickupTasks: [],
      standaloneDeliverTasks: [],
      priorityContext: { hasCritical: false },
    }
  }

  const user = await userRepository.findUniqueByIdWithSector(operatorUserId)
  if (!user?.sectorId) {
    return {
      suggestions: [],
      standalonePickupTasks: [],
      standaloneDeliverTasks: [],
      priorityContext: { hasCritical: false },
    }
  }

  await syncTripSuggestions(user.sectorId, types)
  await movimentPalletTripSuggestionRepository.reconcileCompletedAcceptedInSector(
    user.sectorId,
    types,
  )

  const rows =
    await movimentPalletTripSuggestionRepository.findManyOpenListableForOperator(
      user.sectorId,
      types,
    )

  const suggestions = rows
    .filter((row) => {
      const d = row.deliverTask
      const p = row.pickupTask
      return isOpenTripTaskPairValid(
        d.status,
        p.status,
        d.machineId,
        p.machineId,
        d.preparedAt != null,
      )
    })
    .map((row) => ({
      kind: 'COMBINE_DELIVER_AND_PICKUP_AT_MACHINE' as const,
      machine: row.machine,
      effectiveCritical: row.deliverTask.isCritical || row.pickupTask.isCritical,
      message: `Entregar prisma na ${row.machine.name} e retirar o pallet finalizado na mesma maquina.`,
      deliverTask: row.deliverTask,
      pickupTask: row.pickupTask,
      tripSuggestion: {
        id: row.id,
        status: row.status,
        acceptedAt: null,
        acceptedByUserId: null,
        assignedMovimentPalletId: null,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      },
    }))
    .sort((a, b) => {
      if (a.effectiveCritical !== b.effectiveCritical) {
        return a.effectiveCritical ? -1 : 1
      }
      const aAt = Math.min(
        new Date(a.deliverTask.createdAt).getTime(),
        new Date(a.pickupTask.createdAt).getTime(),
      )
      const bAt = Math.min(
        new Date(b.deliverTask.createdAt).getTime(),
        new Date(b.pickupTask.createdAt).getTime(),
      )
      return aAt - bAt
    })

  const linked = linkedOpenTripTaskIdsFromRows(rows)
  const { standalonePickupTasks, standaloneDeliverTasks } =
    await listStandaloneTripTasksForSector(user.sectorId, role, linked)

  const hasCritical =
    suggestions.some((s) => s.effectiveCritical) ||
    standalonePickupTasks.some((s) => s.effectiveCritical) ||
    standaloneDeliverTasks.some((s) => s.effectiveCritical)

  return {
    suggestions,
    standalonePickupTasks,
    standaloneDeliverTasks,
    priorityContext: {
      hasCritical,
      hint: hasCritical
        ? 'Existem tarefas criticas no setor — priorize-as.'
        : undefined,
    },
  }
}

export async function acceptTripRouteSuggestion(
  operatorUserId: string,
  role: RoleUser,
  tripSuggestionId: string,
) {
  const allowed = equipmentTypesAllowedForRole(role)
  if (allowed.length === 0) throw new MovimentPalletTypeNotAllowedForRoleError()

  const user = await userRepository.findUniqueByIdWithSector(operatorUserId)
  if (!user?.sectorId) throw new OperatorWithoutSectorError()

  const full = await movimentPalletTripSuggestionRepository.findByIdWithTasks(
    tripSuggestionId,
  )
  if (!full) throw new TripRouteSuggestionNotFoundError()
  if (full.status !== MovimentPalletTripSuggestionStatus.OPEN) {
    throw new TripRouteSuggestionNotOpenError()
  }
  if (full.machine.sectorId !== user.sectorId) {
    throw new TripRouteSuggestionAcceptForbiddenError()
  }

  const pallet = await movimentPalletRepository.findFirstByOperatorUserId(operatorUserId)
  if (!pallet) throw new OperatorWithoutBoundMovimentPalletError()

  if (
    !requestTypeMatchesEquipment(
      full.deliverTask.typeMovimentPallet,
      assertEquipmentMovimentType(pallet.type),
    )
  ) {
    throw new ReplenishmentRequestTypeMismatchError()
  }

  await assertNoIncompleteTasks(pallet.id)

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
    if (claimed.count !== 1) throw new TripRouteSuggestionNotOpenError()

    await tx.deliveryTask.updateMany({
      where: { id: full.deliverTaskId, status: MachineTaskStatus.CREATED },
      data: {
        status: MachineTaskStatus.ASSIGNED,
        assignedMovimentPalletId: pallet.id,
      },
    })
    await tx.pickupTask.updateMany({
      where: { id: full.pickupTaskId, status: MachineTaskStatus.CREATED },
      data: {
        status: MachineTaskStatus.ASSIGNED,
        assignedMovimentPalletId: pallet.id,
      },
    })
  })

  const accepted =
    await movimentPalletTripSuggestionRepository.findByIdWithTasks(
      tripSuggestionId,
    )
  if (accepted?.deliverTask?.machine) {
    operatorMovimentPalletWsNotifyDeliveryTaskChange({
      id: accepted.deliverTask.id,
      status: accepted.deliverTask.status,
      typeMovimentPallet: accepted.deliverTask.typeMovimentPallet,
      preparedAt: accepted.deliverTask.preparedAt,
      machine: accepted.deliverTask.machine,
    })
  }
  if (accepted?.pickupTask?.machine) {
    operatorMovimentPalletWsNotifyPickupTaskChange({
      id: accepted.pickupTask.id,
      status: accepted.pickupTask.status,
      typeMovimentPallet: accepted.pickupTask.typeMovimentPallet,
      machine: accepted.pickupTask.machine,
    })
  }
  return accepted
}

export async function acceptOpenDeliverTaskForMovimentOperator(
  operatorUserId: string,
  role: RoleUser,
  taskId: string,
) {
  const pallet = await movimentPalletRepository.findFirstByOperatorUserId(operatorUserId)
  if (!pallet) throw new OperatorWithoutBoundMovimentPalletError()

  const task = await deliveryTaskRepository.findById(taskId)
  if (!task) throw new DeliveryTaskNotFoundError()

  if (!task.acceptedBySupply || !task.preparedAt) {
    throw new MovimentPalletDeliverTaskAcceptError('Pallet ainda nao esta pronto.')
  }
  if (
    !requestTypeMatchesEquipment(
      task.typeMovimentPallet,
      assertEquipmentMovimentType(pallet.type),
    )
  ) {
    throw new ReplenishmentRequestTypeMismatchError()
  }
  if (task.status !== MachineTaskStatus.CREATED) {
    throw new MovimentPalletDeliverTaskAcceptError()
  }

  await assertNoIncompleteTasks(pallet.id)

  const updated = await deliveryTaskRepository.update(taskId, {
    status: MachineTaskStatus.ASSIGNED,
    assignedMovimentPallet: { connect: { id: pallet.id } },
  })

  return { task: updated, deliveryTask: updated }
}

export async function acceptOpenPickupTaskForMovimentOperator(
  operatorUserId: string,
  role: RoleUser,
  taskId: string,
) {
  const pallet = await movimentPalletRepository.findFirstByOperatorUserId(operatorUserId)
  if (!pallet) throw new OperatorWithoutBoundMovimentPalletError()

  const task = await pickupTaskRepository.findById(taskId)
  if (!task) throw new PickupTaskNotFoundError()

  if (
    !requestTypeMatchesEquipment(
      task.typeMovimentPallet,
      assertEquipmentMovimentType(pallet.type),
    )
  ) {
    throw new ReplenishmentRequestTypeMismatchError()
  }
  if (task.status !== MachineTaskStatus.CREATED) {
    throw new MovimentPalletPickupTaskAcceptError()
  }

  await assertNoIncompleteTasks(pallet.id)

  const updated = await pickupTaskRepository.update(taskId, {
    status: MachineTaskStatus.ASSIGNED,
    assignedMovimentPallet: { connect: { id: pallet.id } },
  })

  if (updated.machine) {
    operatorMovimentPalletWsNotifyPickupTaskChange({
      id: updated.id,
      status: updated.status,
      typeMovimentPallet: updated.typeMovimentPallet,
      machine: updated.machine,
    })
  }

  return { task: updated, pickupTask: updated }
}

export async function completeDeliverTaskToMachine(
  operatorUserId: string,
  role: RoleUser,
  taskId: string,
) {
  const allowed = equipmentTypesAllowedForRole(role)
  if (allowed.length === 0) throw new MovimentPalletTypeNotAllowedForRoleError()

  const pallet = await movimentPalletRepository.findFirstByOperatorUserId(operatorUserId)
  if (!pallet) throw new OperatorWithoutBoundMovimentPalletError()

  const task = await deliveryTaskRepository.findById(taskId)
  if (!task) throw new MovimentPalletTaskNotFoundError()
  if (task.assignedMovimentPalletId !== pallet.id) {
    throw new MovimentPalletDeliverTaskCompletionError()
  }
  if (!openMachineTaskStatuses.includes(task.status)) {
    if (task.status === MachineTaskStatus.COMPLETED) {
      return { task, deliveryTask: task }
    }
    throw new MovimentPalletDeliverTaskCompletionError()
  }

  const updated = await deliveryTaskRepository.update(taskId, {
    status: MachineTaskStatus.COMPLETED,
    completedAt: new Date(),
  })

  if (updated.machine) {
    operatorMovimentPalletWsNotifyDeliveryTaskChange({
      id: updated.id,
      status: updated.status,
      typeMovimentPallet: updated.typeMovimentPallet,
      preparedAt: updated.preparedAt,
      machine: updated.machine,
    })
  }

  return { task: updated, deliveryTask: updated, request: updated }
}

export async function completePickupTaskToExpedition(
  operatorUserId: string,
  role: RoleUser,
  taskId: string,
) {
  const allowed = equipmentTypesAllowedForRole(role)
  if (allowed.length === 0) throw new MovimentPalletTypeNotAllowedForRoleError()

  const pallet = await movimentPalletRepository.findFirstByOperatorUserId(operatorUserId)
  if (!pallet) throw new OperatorWithoutBoundMovimentPalletError()

  const task = await pickupTaskRepository.findById(taskId)
  if (!task) throw new MovimentPalletTaskNotFoundError()
  if (task.assignedMovimentPalletId && task.assignedMovimentPalletId !== pallet.id) {
    throw new MovimentPalletPickupTaskCompletionError()
  }
  if (!openMachineTaskStatuses.includes(task.status)) {
    if (task.status === MachineTaskStatus.COMPLETED) {
      return { task, pickupTask: task }
    }
    throw new MovimentPalletPickupTaskCompletionError()
  }

  const updated = await pickupTaskRepository.update(taskId, {
    status: MachineTaskStatus.COMPLETED,
    completedAt: new Date(),
    assignedMovimentPallet: { connect: { id: pallet.id } },
  })

  const acceptedSuggestion =
    await prisma.movimentPalletTripSuggestion.findFirst({
      where: {
        pickupTaskId: taskId,
        status: MovimentPalletTripSuggestionStatus.ACCEPTED,
      },
    })
  if (acceptedSuggestion) {
    await movimentPalletTripSuggestionRepository.markCompleted(acceptedSuggestion.id)
  }

  if (updated.machine) {
    operatorMovimentPalletWsNotifyPickupTaskChange({
      id: updated.id,
      status: updated.status,
      typeMovimentPallet: updated.typeMovimentPallet,
      machine: updated.machine,
    })
  }

  return { task: updated, pickupTask: updated, request: updated }
}

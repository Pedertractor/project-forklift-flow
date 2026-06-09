import {
  MachineTaskStatus,
  MovimentPalletTripSuggestionStatus,
  OperatorMachineSupplyRequestStatus,
  TypeMovimentPallet,
} from '../generated/prisma/enums.js'
import {
  MachineNotFoundError,
  MachineNotInOperatorSectorError,
  MachineHasNoMaterialForPickupError,
  OperatorRequestBlockedByPalletAtReceivingError,
  OperatorMachineNotBoundError,
  OperatorWithoutSectorError,
  PickupTaskCannotBeCanceledError,
  PickupTaskNotFoundError,
  PickupTaskNotOnOperatorMachineError,
} from '../errors/domain-errors.js'
import { deliveryTaskRepository } from '../repositories/delivery-task.repository.js'
import { pickupTaskRepository } from '../repositories/pickup-task.repository.js'
import { operatorMachineSupplyRequestRepository, operatorMachineSupplyRequestListInclude } from '../repositories/operator-machine-supply-request.repository.js'
import { movimentPalletTripSuggestionRepository } from '../repositories/moviment-pallet-trip-suggestion.repository.js'
import { machineRepository } from '../repositories/machine.repository.js'
import { userRepository } from '../repositories/user.repository.js'
import { prisma } from '../lib/prisma.js'
import {
  operatorMovimentPalletWsBroadcastMachineOperatorUpdated,
  operatorMovimentPalletWsBroadcastOperatorSupplyRequestCreated,
  operatorMovimentPalletWsBroadcastQueueUpdated,
  operatorMovimentPalletWsBroadcastTripSuggestionsUpdated,
  operatorMovimentPalletWsNotifyDeliveryTaskChange,
  operatorMovimentPalletWsNotifyPickupTaskChange,
} from '../ws/operator-moviment-pallet-ws.hub.js'
import type { Prisma } from '../generated/prisma/client.js'
import { deliveryTaskListInclude } from '../repositories/delivery-task.repository.js'

export async function bindOperatorToMachine(
  operatorUserId: string,
  machineId: string,
) {
  const user = await userRepository.findUniqueByIdWithSector(operatorUserId)
  if (!user?.sectorId) {
    throw new OperatorWithoutSectorError()
  }

  const targetMachine = await machineRepository.findUniqueById(machineId)
  if (!targetMachine) {
    throw new MachineNotFoundError()
  }
  if (targetMachine.sectorId !== user.sectorId) {
    throw new MachineNotInOperatorSectorError()
  }

  const previouslyBound = await prisma.machine.findMany({
    where: { userId: operatorUserId },
    select: { id: true, sectorId: true },
  })

  const machine = await machineRepository.assignOperatorExclusive(
    machineId,
    operatorUserId,
  )

  for (const row of previouslyBound) {
    if (row.id === machineId) {
      continue
    }
    operatorMovimentPalletWsBroadcastMachineOperatorUpdated({
      machineId: row.id,
      sectorId: row.sectorId,
      operatorUserId: null,
      affectedUserId: operatorUserId,
    })
  }

  operatorMovimentPalletWsBroadcastMachineOperatorUpdated({
    machineId: machine.id,
    sectorId: machine.sectorId,
    operatorUserId: machine.userId ?? null,
    affectedUserId: operatorUserId,
  })

  return machine
}

export async function unbindOperatorFromMachines(operatorUserId: string) {
  const bound = await prisma.machine.findMany({
    where: { userId: operatorUserId },
    select: { id: true, sectorId: true },
  })
  await machineRepository.disconnectOperatorFromAllMachines(operatorUserId)
  for (const row of bound) {
    operatorMovimentPalletWsBroadcastMachineOperatorUpdated({
      machineId: row.id,
      sectorId: row.sectorId,
      operatorUserId: null,
      affectedUserId: operatorUserId,
    })
  }
}

export async function getOperatorCurrentMachine(operatorUserId: string) {
  return machineRepository.findFirstByOperatorUserId(operatorUserId)
}

export async function listMachinesForOperatorPicker(operatorUserId: string) {
  const user = await userRepository.findUniqueByIdWithSector(operatorUserId)
  if (!user?.sectorId) {
    return []
  }
  return machineRepository.findManyForList({ sectorId: user.sectorId })
}

export async function listMachineTasksForOperator(operatorUserId: string) {
  const machine = await machineRepository.findFirstByOperatorUserId(operatorUserId)
  if (!machine) {
    return { deliveryTasks: [], pickupTasks: [], openSupply: null }
  }

  const [deliveryTasks, pickupTasks, openSupply] = await Promise.all([
    deliveryTaskRepository.findManyForMachine(machine.id),
    pickupTaskRepository.findManyForMachine(machine.id),
    operatorMachineSupplyRequestRepository.findFirstOpenByMachineId(machine.id),
  ])

  return { deliveryTasks, pickupTasks, openSupply }
}

export async function listOperatorSupplyRequestsForOperatorMachine(
  operatorUserId: string,
  filters?: { status?: OperatorMachineSupplyRequestStatus },
) {
  return operatorMachineSupplyRequestRepository.findManyForOperatorMachine(
    operatorUserId,
    filters,
  )
}

/** Exige ao menos uma entrega concluída na máquina; várias retiradas são permitidas. */
async function assertMaterialOnMachine(machineId: string) {
  const lastDelivery =
    await deliveryTaskRepository.findLatestCompletedForMachine(machineId)
  if (!lastDelivery?.completedAt) {
    throw new MachineHasNoMaterialForPickupError()
  }
}

async function resolveTypeForMachine(machineId: string): Promise<TypeMovimentPallet> {
  const latestDelivery = await prisma.deliveryTask.findFirst({
    where: { machineId },
    orderBy: { createdAt: 'desc' },
    select: { typeMovimentPallet: true },
  })
  return latestDelivery?.typeMovimentPallet ?? TypeMovimentPallet.FORKLIFT
}

async function findPalletAtReceivingForMachine(machineId: string) {
  return deliveryTaskRepository.findOpenPreparedForMachine(machineId)
}

async function assertNoPalletAtReceivingForSupplyRequest(machineId: string) {
  const atReceiving = await findPalletAtReceivingForMachine(machineId)
  if (atReceiving) {
    throw new OperatorRequestBlockedByPalletAtReceivingError()
  }
}

/** Vincula retirada a entrega preparada no recebimento (sugestao de viagem). */
async function syncOpenTripSuggestionForPreparedDelivery(
  machineId: string,
  pickupTaskId: string,
  sectorId: string | null | undefined,
) {
  const openDelivery = await findPalletAtReceivingForMachine(machineId)
  if (!openDelivery || !sectorId) return

  await movimentPalletTripSuggestionRepository.upsertOpenPair({
    deliverTaskId: openDelivery.id,
    pickupTaskId,
    machineId,
    typeMovimentPallet: openDelivery.typeMovimentPallet,
  })
  operatorMovimentPalletWsBroadcastTripSuggestionsUpdated(
    sectorId,
    openDelivery.typeMovimentPallet,
  )
}

/** Somente retirada do prisma na maquina. */
export async function requestPickupOnly(
  operatorUserId: string,
  options?: { isCritical?: boolean; typeMovimentPallet?: TypeMovimentPallet },
) {
  const machine = await machineRepository.findFirstByOperatorUserId(operatorUserId)
  if (!machine) {
    throw new OperatorMachineNotBoundError()
  }

  await assertMaterialOnMachine(machine.id)

  const typeMovimentPallet =
    options?.typeMovimentPallet ?? (await resolveTypeForMachine(machine.id))
  const pickupTask = await pickupTaskRepository.create({
    machine: { connect: { id: machine.id } },
    requestedBy: { connect: { id: operatorUserId } },
    typeMovimentPallet,
    triggersReplenishment: false,
    isCritical: options?.isCritical === true,
    status: MachineTaskStatus.CREATED,
  })

  if (pickupTask.machine) {
    operatorMovimentPalletWsNotifyPickupTaskChange({
      id: pickupTask.id,
      status: pickupTask.status,
      typeMovimentPallet: pickupTask.typeMovimentPallet,
      machine: pickupTask.machine,
    })
  }

  await syncOpenTripSuggestionForPreparedDelivery(
    machine.id,
    pickupTask.id,
    machine.sectorId,
  )

  return { pickupTask }
}

/** Aviso ao abastecimento sem retirada; no maximo uma solicitacao OPEN por maquina. */
export async function requestSupplyOnly(operatorUserId: string) {
  const machine = await machineRepository.findFirstByOperatorUserId(operatorUserId)
  if (!machine) {
    throw new OperatorMachineNotBoundError()
  }

  await assertNoPalletAtReceivingForSupplyRequest(machine.id)

  const existingOpen =
    await operatorMachineSupplyRequestRepository.findFirstOpenByMachineId(
      machine.id,
    )
  if (existingOpen) {
    return { operatorSupplyRequest: existingOpen, created: false as const }
  }

  const operatorSupplyRequest = await operatorMachineSupplyRequestRepository.create(
    {
      machine: { connect: { id: machine.id } },
      requestedBy: { connect: { id: operatorUserId } },
      status: OperatorMachineSupplyRequestStatus.OPEN,
    },
  )

  if (machine.sectorId) {
    operatorMovimentPalletWsBroadcastOperatorSupplyRequestCreated(
      machine.sectorId,
      machine.id,
    )
  }

  return { operatorSupplyRequest, created: true as const }
}

/** Retirada + aviso ao abastecimento (cria sugestao de viagem quando houver entrega). */
export async function requestPickupWithReplenishment(
  operatorUserId: string,
  options?: { isCritical?: boolean; typeMovimentPallet?: TypeMovimentPallet },
) {
  const machine = await machineRepository.findFirstByOperatorUserId(operatorUserId)
  if (!machine) {
    throw new OperatorMachineNotBoundError()
  }

  await assertNoPalletAtReceivingForSupplyRequest(machine.id)
  await assertMaterialOnMachine(machine.id)

  const typeMovimentPallet =
    options?.typeMovimentPallet ?? (await resolveTypeForMachine(machine.id))

  const result = await prisma.$transaction(async (tx) => {
    const existingOpenSupply =
      await operatorMachineSupplyRequestRepository.findFirstOpenByMachineId(
        machine.id,
      )

    let operatorSupplyRequest = existingOpenSupply
    let createdSupplyRequest = false
    if (!operatorSupplyRequest) {
      operatorSupplyRequest = await tx.operatorMachineSupplyRequest.create({
        data: {
          machine: { connect: { id: machine.id } },
          requestedBy: { connect: { id: operatorUserId } },
          status: OperatorMachineSupplyRequestStatus.OPEN,
        },
        include: operatorMachineSupplyRequestListInclude,
      })
      createdSupplyRequest = true
    }

    const pickupTask = await tx.pickupTask.create({
      data: {
        machine: { connect: { id: machine.id } },
        requestedBy: { connect: { id: operatorUserId } },
        typeMovimentPallet,
        triggersReplenishment: true,
        isCritical: options?.isCritical === true,
        status: MachineTaskStatus.CREATED,
      },
      include: {
        machine: {
          select: {
            id: true,
            name: true,
            sectorId: true,
            userId: true,
          },
        },
      },
    })

    return { pickupTask, operatorSupplyRequest, createdSupplyRequest }
  })

  await syncOpenTripSuggestionForPreparedDelivery(
    machine.id,
    result.pickupTask.id,
    machine.sectorId,
  )

  if (result.pickupTask.machine) {
    operatorMovimentPalletWsNotifyPickupTaskChange({
      id: result.pickupTask.id,
      status: result.pickupTask.status,
      typeMovimentPallet: result.pickupTask.typeMovimentPallet,
      machine: result.pickupTask.machine,
    })
  }

  if (result.createdSupplyRequest && machine.sectorId) {
    operatorMovimentPalletWsBroadcastOperatorSupplyRequestCreated(
      machine.sectorId,
      machine.id,
    )
  }

  return result
}

/**
 * Encerra aviso de abastecimento e entrega em preparo vinculados a retirada + abastecimento.
 * Nao cancela entrega ja preparada no recebimento (preparedAt).
 */
async function cancelReplenishmentCompanionTasks(
  tx: Prisma.TransactionClient,
  machineId: string,
  now: Date,
) {
  await tx.operatorMachineSupplyRequest.updateMany({
    where: {
      machineId,
      status: OperatorMachineSupplyRequestStatus.OPEN,
    },
    data: { status: OperatorMachineSupplyRequestStatus.CANCELLED },
  })

  const deliveriesToCancel = await tx.deliveryTask.findMany({
    where: {
      machineId,
      status: MachineTaskStatus.CREATED,
      assignedOperatorId: null,
      preparedAt: null,
      acceptedBySupply: true,
    },
    include: deliveryTaskListInclude,
  })

  if (deliveriesToCancel.length === 0) {
    return []
  }

  const deliveryIds = deliveriesToCancel.map((d) => d.id)
  await tx.deliveryTask.updateMany({
    where: { id: { in: deliveryIds } },
    data: {
      status: MachineTaskStatus.CANCELED,
      statusSince: now,
    },
  })

  await tx.operatorMachineSupplyRequest.updateMany({
    where: {
      deliveryTaskId: { in: deliveryIds },
      status: OperatorMachineSupplyRequestStatus.FULFILLED,
    },
    data: { status: OperatorMachineSupplyRequestStatus.CANCELLED },
  })

  return deliveriesToCancel.map((d) => ({
    ...d,
    status: MachineTaskStatus.CANCELED,
    statusSince: now,
  }))
}

/** Cancela retirada enquanto ainda nao foi aceita pelo transporte (status CREATED). */
export async function cancelPickupRequestByOperator(
  operatorUserId: string,
  pickupTaskId: string,
) {
  const machine = await machineRepository.findFirstByOperatorUserId(operatorUserId)
  if (!machine) {
    throw new OperatorMachineNotBoundError()
  }

  const task = await pickupTaskRepository.findById(pickupTaskId)
  if (!task) {
    throw new PickupTaskNotFoundError()
  }
  if (task.machineId !== machine.id) {
    throw new PickupTaskNotOnOperatorMachineError()
  }
  if (task.status !== MachineTaskStatus.CREATED) {
    throw new PickupTaskCannotBeCanceledError()
  }

  const now = new Date()
  const { pickupTask: updated, canceledDeliveries } = await prisma.$transaction(
    async (tx) => {
      await tx.movimentPalletTripSuggestion.updateMany({
        where: {
          pickupTaskId,
          status: MovimentPalletTripSuggestionStatus.OPEN,
        },
        data: { status: MovimentPalletTripSuggestionStatus.EXPIRED },
      })

      const canceledDeliveries = task.triggersReplenishment
        ? await cancelReplenishmentCompanionTasks(tx, machine.id, now)
        : []

      const pickupTask = await tx.pickupTask.update({
        where: { id: pickupTaskId },
        data: {
          status: MachineTaskStatus.CANCELED,
          statusSince: now,
        },
        include: {
          machine: {
            select: {
              id: true,
              name: true,
              sectorId: true,
              userId: true,
            },
          },
        },
      })

      return { pickupTask, canceledDeliveries }
    },
  )

  if (updated.machine) {
    operatorMovimentPalletWsNotifyPickupTaskChange({
      id: updated.id,
      status: updated.status,
      typeMovimentPallet: updated.typeMovimentPallet,
      machine: updated.machine,
    })
    for (const delivery of canceledDeliveries) {
      operatorMovimentPalletWsNotifyDeliveryTaskChange(delivery)
    }
    operatorMovimentPalletWsBroadcastQueueUpdated(
      updated.machine.sectorId,
      updated.typeMovimentPallet,
    )
    operatorMovimentPalletWsBroadcastTripSuggestionsUpdated(
      updated.machine.sectorId,
      updated.typeMovimentPallet,
    )
  }

  return {
    pickupTask: updated,
    replenishmentCanceled: task.triggersReplenishment,
  }
}

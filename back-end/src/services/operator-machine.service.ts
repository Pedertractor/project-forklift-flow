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
  OperatorMachineNotBoundError,
  OperatorWithoutSectorError,
  PickupTaskCannotBeCanceledError,
  PickupTaskNotFoundError,
  PickupTaskNotOnOperatorMachineError,
} from '../errors/domain-errors.js'
import { deliveryTaskRepository } from '../repositories/delivery-task.repository.js'
import { pickupTaskRepository } from '../repositories/pickup-task.repository.js'
import { operatorMachineSupplyRequestRepository } from '../repositories/operator-machine-supply-request.repository.js'
import { movimentPalletTripSuggestionRepository } from '../repositories/moviment-pallet-trip-suggestion.repository.js'
import { machineRepository } from '../repositories/machine.repository.js'
import { userRepository } from '../repositories/user.repository.js'
import { prisma } from '../lib/prisma.js'
import {
  operatorMovimentPalletWsBroadcastMachineOperatorUpdated,
  operatorMovimentPalletWsBroadcastQueueUpdated,
  operatorMovimentPalletWsBroadcastTripSuggestionsUpdated,
  operatorMovimentPalletWsNotifyPickupTaskChange,
} from '../ws/operator-moviment-pallet-ws.hub.js'

export async function bindOperatorToMachine(
  operatorUserId: string,
  machineId: string,
) {
  const user = await userRepository.findUniqueByIdWithSector(operatorUserId)
  if (!user?.sectorId) {
    throw new OperatorWithoutSectorError()
  }

  const machine = await machineRepository.findUniqueById(machineId)
  if (!machine) {
    throw new MachineNotFoundError()
  }
  if (machine.sectorId !== user.sectorId) {
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

/** Somente retirada do prisma na maquina. */
export async function requestPickupOnly(
  operatorUserId: string,
  options?: { isCritical?: boolean },
) {
  const machine = await machineRepository.findFirstByOperatorUserId(operatorUserId)
  if (!machine) {
    throw new OperatorMachineNotBoundError()
  }

  await assertMaterialOnMachine(machine.id)

  const typeMovimentPallet = await resolveTypeForMachine(machine.id)
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

  return { pickupTask }
}

/** Aviso ao abastecimento sem retirada; no maximo uma solicitacao OPEN por maquina. */
export async function requestSupplyOnly(operatorUserId: string) {
  const machine = await machineRepository.findFirstByOperatorUserId(operatorUserId)
  if (!machine) {
    throw new OperatorMachineNotBoundError()
  }

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

  return { operatorSupplyRequest, created: true as const }
}

/** Retirada + aviso ao abastecimento (cria sugestao de viagem quando houver entrega). */
export async function requestPickupWithReplenishment(
  operatorUserId: string,
  options?: { isCritical?: boolean },
) {
  const machine = await machineRepository.findFirstByOperatorUserId(operatorUserId)
  if (!machine) {
    throw new OperatorMachineNotBoundError()
  }

  await assertMaterialOnMachine(machine.id)

  const typeMovimentPallet = await resolveTypeForMachine(machine.id)
  const sectorId = machine.sectorId

  const result = await prisma.$transaction(async (tx) => {
    const existingOpenSupply =
      await operatorMachineSupplyRequestRepository.findFirstOpenByMachineId(
        machine.id,
      )

    let operatorSupplyRequest = existingOpenSupply
    if (!operatorSupplyRequest) {
      operatorSupplyRequest = await tx.operatorMachineSupplyRequest.create({
        data: {
          machine: { connect: { id: machine.id } },
          requestedBy: { connect: { id: operatorUserId } },
          status: OperatorMachineSupplyRequestStatus.OPEN,
        },
        include: {
          machine: { select: { id: true, name: true, position: true, sectorId: true } },
          requestedBy: { select: { id: true, name: true } },
        },
      })
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
            position: true,
            sectorId: true,
            userId: true,
          },
        },
      },
    })

    return { pickupTask, operatorSupplyRequest }
  })

  const openDelivery =
    await deliveryTaskRepository.findOpenPreparedForMachine(machine.id)

  if (openDelivery && sectorId) {
    await movimentPalletTripSuggestionRepository.upsertOpenPair({
      deliverTaskId: openDelivery.id,
      pickupTaskId: result.pickupTask.id,
      machineId: machine.id,
      typeMovimentPallet: openDelivery.typeMovimentPallet,
    })
    operatorMovimentPalletWsBroadcastTripSuggestionsUpdated(
      sectorId,
      openDelivery.typeMovimentPallet,
    )
  }

  if (result.pickupTask.machine) {
    operatorMovimentPalletWsNotifyPickupTaskChange({
      id: result.pickupTask.id,
      status: result.pickupTask.status,
      typeMovimentPallet: result.pickupTask.typeMovimentPallet,
      machine: result.pickupTask.machine,
    })
  }

  return result
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
  const updated = await prisma.$transaction(async (tx) => {
    await tx.movimentPalletTripSuggestion.updateMany({
      where: {
        pickupTaskId,
        status: MovimentPalletTripSuggestionStatus.OPEN,
      },
      data: { status: MovimentPalletTripSuggestionStatus.EXPIRED },
    })

    return tx.pickupTask.update({
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
            position: true,
            sectorId: true,
            userId: true,
          },
        },
      },
    })
  })

  if (updated.machine) {
    operatorMovimentPalletWsNotifyPickupTaskChange({
      id: updated.id,
      status: updated.status,
      typeMovimentPallet: updated.typeMovimentPallet,
      machine: updated.machine,
    })
    operatorMovimentPalletWsBroadcastQueueUpdated(
      updated.machine.sectorId,
      updated.typeMovimentPallet,
    )
    operatorMovimentPalletWsBroadcastTripSuggestionsUpdated(
      updated.machine.sectorId,
      updated.typeMovimentPallet,
    )
  }

  return { pickupTask: updated }
}

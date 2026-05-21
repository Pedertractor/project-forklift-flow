import {
  ForkliftTaskStatus,
  RequestStatus,
  TypeMovimentPallet,
  OperatorMachineSupplyRequestStatus,
} from '../generated/prisma/enums.js'
import {
  MachineNotFoundError,
  MachineNotInOperatorSectorError,
  MachineReplenishmentRequestNotFoundError,
  OperatorMachineNotBoundError,
  OperatorWithoutSectorError,
  PickupTaskAlreadyOpenError,
  ReplenishmentRequestNotForOperatorMachineError,
  ReplenishmentRequestNotOnMachineStatusError,
} from '../errors/domain-errors.js'
import { movimentPalletTaskRepository } from '../repositories/moviment-pallet-task.repository.js'
import { machineReplenishmentRequestRepository } from '../repositories/machine-replenishment-request.repository.js'
import { operatorMachineSupplyRequestRepository } from '../repositories/operator-machine-supply-request.repository.js'
import { machineRepository } from '../repositories/machine.repository.js'
import { userRepository } from '../repositories/user.repository.js'
import {
  operatorMovimentPalletWsBroadcastTripSuggestionsUpdated,
  operatorMovimentPalletWsNotifyReplenishmentChange,
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

  return machineRepository.assignOperatorExclusive(machineId, operatorUserId)
}

export async function unbindOperatorFromMachines(operatorUserId: string) {
  await machineRepository.disconnectOperatorFromAllMachines(operatorUserId)
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

export async function listReplenishmentRequestsForOperatorMachine(
  operatorUserId: string,
  filters?: { status?: RequestStatus },
) {
  const rows =
    await machineReplenishmentRequestRepository.findManyForDestinationOperator(
      operatorUserId,
      filters,
    )
  if (rows.length === 0) {
    return rows
  }
  const pickupIds =
    await machineReplenishmentRequestRepository.findRequestIdsWithOpenPickup(
      rows.map((r) => r.id),
    )
  return rows.map((row) => ({
    ...row,
    hasOpenPickupTask: pickupIds.has(row.id),
  }))
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

export type OperatorPickupProgressPhase =
  | 'DELIVERY_IN_PROGRESS'
  | 'AT_MACHINE_AWAITING_PICKUP'
  | 'AWAITING_TRANSPORT_PICKUP'
  | 'TRANSPORT_ASSIGNED'
  | 'TRANSPORT_REMOVING'
  | 'PICKUP_FINISHED'
  | 'OTHER'

export async function getOperatorReplenishmentPickupProgress(
  operatorUserId: string,
  requestId: string,
) {
  const machine = await machineRepository.findFirstByOperatorUserId(operatorUserId)
  if (!machine) {
    throw new OperatorMachineNotBoundError()
  }

  const request = await machineReplenishmentRequestRepository.findUniqueById(
    requestId,
  )
  if (!request) {
    throw new MachineReplenishmentRequestNotFoundError()
  }

  if (request.destinationId !== machine.id) {
    throw new ReplenishmentRequestNotForOperatorMachineError()
  }

  const transportLabel =
    request.typeMovimentPallet === TypeMovimentPallet.ANY
      ? 'Empilhadeira ou transpaleteira'
      : 'Empilhadeira'

  const openPickup =
    await movimentPalletTaskRepository.findOpenPickupForRequest(requestId)
  const latestPickup =
    await movimentPalletTaskRepository.findLatestPickupTaskForRequest(requestId)

  let phase: OperatorPickupProgressPhase = 'OTHER'

  if (request.status === RequestStatus.COMPLETED) {
    phase = 'PICKUP_FINISHED'
  } else if (request.status === RequestStatus.IN_PROGRESS) {
    phase = 'DELIVERY_IN_PROGRESS'
  } else if (request.status === RequestStatus.ON_MACHINE) {
    if (!openPickup) {
      phase =
        latestPickup?.status === ForkliftTaskStatus.COMPLETED
          ? 'PICKUP_FINISHED'
          : 'AT_MACHINE_AWAITING_PICKUP'
    } else if (openPickup.status === ForkliftTaskStatus.CREATED) {
      phase = 'AWAITING_TRANSPORT_PICKUP'
    } else if (openPickup.status === ForkliftTaskStatus.ASSIGNED) {
      phase = 'TRANSPORT_ASSIGNED'
    } else {
      phase = 'TRANSPORT_REMOVING'
    }
  }

  const pickupTask = openPickup ?? latestPickup ?? null

  return {
    phase,
    transportLabel,
    request: {
      id: request.id,
      movementCube: request.movementCube,
      status: request.status,
      typeMovimentPallet: request.typeMovimentPallet,
    },
    pickupTask,
  }
}

export async function requestPalletPickupFromMachine(
  operatorUserId: string,
  requestId: string,
) {
  const request = await machineReplenishmentRequestRepository.findUniqueById(
    requestId,
  )
  if (!request) {
    throw new MachineReplenishmentRequestNotFoundError()
  }

  if (request.destination.userId !== operatorUserId) {
    throw new ReplenishmentRequestNotForOperatorMachineError()
  }

  if (request.status !== RequestStatus.ON_MACHINE) {
    throw new ReplenishmentRequestNotOnMachineStatusError()
  }

  const openPickup = await movimentPalletTaskRepository.findOpenPickupForRequest(
    requestId,
  )
  if (openPickup) {
    throw new PickupTaskAlreadyOpenError()
  }

  const task = await movimentPalletTaskRepository.createPickupForRequest(
    requestId,
    operatorUserId,
  )

  operatorMovimentPalletWsNotifyReplenishmentChange(request)

  const sectorId = request.destination.sector?.id
  if (sectorId) {
    operatorMovimentPalletWsBroadcastTripSuggestionsUpdated(
      sectorId,
      request.typeMovimentPallet,
    )
  }

  return { request, pickupTask: task }
}

export type { FinalizeMachineCycleInput } from './replenishment-orchestration.service.js'
export { finalizeMachineProductionCycle } from './replenishment-orchestration.service.js'

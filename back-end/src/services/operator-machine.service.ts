import { RequestStatus } from '../generated/prisma/enums.js'
import {
  MachineNotFoundError,
  MachineNotInOperatorSectorError,
  MachineReplenishmentRequestNotFoundError,
  OperatorWithoutSectorError,
  PickupTaskAlreadyOpenError,
  ReplenishmentRequestNotForOperatorMachineError,
  ReplenishmentRequestNotOnMachineStatusError,
} from '../errors/domain-errors.js'
import { movimentPalletTaskRepository } from '../repositories/moviment-pallet-task.repository.js'
import { machineReplenishmentRequestRepository } from '../repositories/machine-replenishment-request.repository.js'
import { machineRepository } from '../repositories/machine.repository.js'
import { userRepository } from '../repositories/user.repository.js'

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
  return machineReplenishmentRequestRepository.findManyForDestinationOperator(
    operatorUserId,
    filters,
  )
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

  return { request, pickupTask: task }
}

export type { FinalizeMachineCycleInput } from './replenishment-orchestration.service.js'
export { finalizeMachineProductionCycle } from './replenishment-orchestration.service.js'

import type { Prisma } from '../generated/prisma/client.js'
import {
  PriorityLevel,
  RequestStatus,
  TypeMovimentPallet,
} from '../generated/prisma/enums.js'
import {
  MachineReplenishmentRequestNotFoundError,
  OperatorMachineNotBoundError,
  OperatorWithoutSectorError,
  ReplenishmentFinalizeMissingFieldsError,
  ReplenishmentNotAwaitingPreparationError,
} from '../errors/domain-errors.js'
import { machineReplenishmentRequestRepository } from '../repositories/machine-replenishment-request.repository.js'
import { machineRepository } from '../repositories/machine.repository.js'
import { userRepository } from '../repositories/user.repository.js'

export type FinalizeMachineCycleInput = {
  movementCube?: string
  typeMovimentPallet?: TypeMovimentPallet
  priorityLevel?: PriorityLevel
}

export type FinalizeMachineCycleOutcome =
  | 'TRANSPORT_QUEUED'
  | 'SUPPLY_NOTIFIED'

export async function finalizeMachineProductionCycle(
  operatorUserId: string,
  input: FinalizeMachineCycleInput = {},
) {
  const machine = await machineRepository.findFirstByOperatorUserId(operatorUserId)
  if (!machine) {
    throw new OperatorMachineNotBoundError()
  }

  const palletReady =
    await machineReplenishmentRequestRepository.findPalletReadyForDestination(
      machine.id,
    )
  if (palletReady) {
    return {
      outcome: 'TRANSPORT_QUEUED' as const,
      message:
        'Pallet ja pronto — pedido disponivel na fila da empilhadeira/transpaleteira.',
      request: palletReady,
    }
  }

  const existingAwaiting =
    await machineReplenishmentRequestRepository.findOpenAwaitingPreparationForDestination(
      machine.id,
    )
  if (existingAwaiting) {
    return {
      outcome: 'SUPPLY_NOTIFIED' as const,
      message:
        'Abastecimento ja foi notificado para preparar pallet desta maquina.',
      request: existingAwaiting,
    }
  }

  const movementCube =
    input.movementCube?.trim() ||
    (await machineReplenishmentRequestRepository.findLatestByDestinationId(
      machine.id,
    ))?.movementCube

  const typeMovimentPallet =
    input.typeMovimentPallet ??
    (await machineReplenishmentRequestRepository.findLatestByDestinationId(
      machine.id,
    ))?.typeMovimentPallet

  if (!movementCube || !typeMovimentPallet) {
    throw new ReplenishmentFinalizeMissingFieldsError()
  }

  const now = new Date()
  const data: Prisma.MachineReplenishmentRequestCreateInput = {
    movementCube,
    typeMovimentPallet,
    priorityLevel: input.priorityLevel ?? PriorityLevel.NORMAL,
    status: RequestStatus.AWAITING_PREPARATION,
    awaitingPreparationSince: now,
    requestedBy: { connect: { id: operatorUserId } },
    destination: { connect: { id: machine.id } },
  }

  const request = await machineReplenishmentRequestRepository.create(data)

  return {
    outcome: 'SUPPLY_NOTIFIED' as const,
    message:
      'Nao ha pallet pronto — abastecimento deve preparar o proximo cubo para esta maquina.',
    request,
  }
}

export async function listPendingPreparationForSupplyUser(userId: string) {
  const user = await userRepository.findUniqueByIdWithSector(userId)
  if (!user?.sectorId) {
    throw new OperatorWithoutSectorError(
      'Usuario sem setor vinculado; necessario para listar preparos pendentes.',
    )
  }

  const requests =
    await machineReplenishmentRequestRepository.findManyAwaitingPreparationForSector(
      user.sectorId,
    )

  return { requests }
}

export async function markReplenishmentPalletReady(requestId: string) {
  const current =
    await machineReplenishmentRequestRepository.findUniqueById(requestId)
  if (!current) {
    throw new MachineReplenishmentRequestNotFoundError()
  }

  if (current.status !== RequestStatus.AWAITING_PREPARATION) {
    throw new ReplenishmentNotAwaitingPreparationError()
  }

  const now = new Date()
  return machineReplenishmentRequestRepository.update(requestId, {
    status: RequestStatus.PALLET_READY,
    preparedAt: now,
    awaitingPreparationSince: null,
  })
}

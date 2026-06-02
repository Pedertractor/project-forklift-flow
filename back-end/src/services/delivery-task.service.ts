import type { Prisma } from '../generated/prisma/client.js'
import {
  IsOperating,
  MachineTaskStatus,
  OperatorMachineSupplyRequestStatus,
  TypeMovimentPallet,
} from '../generated/prisma/enums.js'
import { pickupTaskRepository } from '../repositories/pickup-task.repository.js'
import {
  DeliveryTaskNotFoundError,
  MachineNotFoundError,
  OperatorWithoutSectorError,
} from '../errors/domain-errors.js'
import { deliveryTaskRepository } from '../repositories/delivery-task.repository.js'
import { operatorMachineSupplyRequestRepository } from '../repositories/operator-machine-supply-request.repository.js'
import { machineRepository } from '../repositories/machine.repository.js'
import { userRepository } from '../repositories/user.repository.js'
import { prisma } from '../lib/prisma.js'
import { syncTripSuggestionPairForMachine } from './trip-suggestion-sync.service.js'
import {
  operatorMovimentPalletWsBroadcastQueueUpdated,
  operatorMovimentPalletWsBroadcastTripSuggestionsUpdated,
  operatorMovimentPalletWsNotifyDeliveryTaskChange,
} from '../ws/operator-moviment-pallet-ws.hub.js'

export type CreateDeliveryTaskInput = {
  requestedById: string
  machineId: string
  movementCube: string
  typeMovimentPallet: TypeMovimentPallet
  isCritical?: boolean
  /** Supply aceita e marca pronto na criacao. */
  markReady?: boolean
  operatorSupplyRequestId?: string | undefined
}

async function requireMachineExists(machineId: string) {
  const m = await machineRepository.findUniqueById(machineId)
  if (!m) {
    throw new MachineNotFoundError()
  }
  return m
}

export async function createDeliveryTask(input: CreateDeliveryTaskInput) {
  const machine = await requireMachineExists(input.machineId)
  const now = new Date()
  const markReady = input.markReady === true

  const data: Prisma.DeliveryTaskCreateInput = {
    movementCube: input.movementCube.trim(),
    typeMovimentPallet: input.typeMovimentPallet,
    isCritical: input.isCritical ?? false,
    status: MachineTaskStatus.CREATED,
    statusSince: now,
    acceptedBySupply: true,
    supplyAcceptedAt: now,
    preparedAt: markReady ? now : null,
    requestedBy: { connect: { id: input.requestedById } },
    machine: { connect: { id: input.machineId } },
  }

  const row = await prisma.$transaction(async (tx) => {
    const task = await deliveryTaskRepository.createWithClient(tx, data)

    await operatorMachineSupplyRequestRepository.fulfillOpenForMachine(
      input.machineId,
      task.id,
      tx,
    )

    if (input.operatorSupplyRequestId) {
      await tx.operatorMachineSupplyRequest.updateMany({
        where: {
          id: input.operatorSupplyRequestId,
          status: OperatorMachineSupplyRequestStatus.OPEN,
        },
        data: {
          status: OperatorMachineSupplyRequestStatus.FULFILLED,
          fulfilledAt: now,
          deliveryTaskId: task.id,
        },
      })
    }

    return task
  })

  if (row.preparedAt && machine.sectorId) {
    await syncTripSuggestionPairForMachine(machine.id)
    operatorMovimentPalletWsBroadcastQueueUpdated(
      machine.sectorId,
      row.typeMovimentPallet,
    )
    operatorMovimentPalletWsBroadcastTripSuggestionsUpdated(
      machine.sectorId,
      row.typeMovimentPallet,
    )
  }

  return row
}

export async function listPendingSupplyRequestsForUser(userId: string) {
  const user = await userRepository.findUniqueByIdWithSector(userId)
  if (!user?.sectorId) {
    throw new OperatorWithoutSectorError(
      'Usuario sem setor vinculado; necessario para listar solicitacoes.',
    )
  }

  const operatorSupplyRequests =
    await operatorMachineSupplyRequestRepository.findManyOpenForSector(
      user.sectorId,
    )

  return { operatorSupplyRequests }
}

export async function markDeliveryTaskPrepared(taskId: string) {
  const current = await deliveryTaskRepository.findById(taskId)
  if (!current) {
    throw new DeliveryTaskNotFoundError()
  }

  if (!current.acceptedBySupply) {
    throw new Error('Tarefa de entrega ainda nao foi aceita pelo abastecimento.')
  }

  const now = new Date()
  const updated = await deliveryTaskRepository.update(taskId, {
    preparedAt: now,
    statusSince: now,
  })

  const refreshed = await deliveryTaskRepository.findById(taskId)
  if (refreshed) {
    operatorMovimentPalletWsNotifyDeliveryTaskChange(refreshed)
  }

  await syncTripSuggestionPairForMachine(current.machineId)

  const sectorId = current.machine.sectorId
  if (sectorId) {
    operatorMovimentPalletWsBroadcastQueueUpdated(
      sectorId,
      updated.typeMovimentPallet,
    )
    operatorMovimentPalletWsBroadcastTripSuggestionsUpdated(
      sectorId,
      updated.typeMovimentPallet,
    )
  }

  return updated
}

export async function getDeliveryTaskById(id: string) {
  const row = await deliveryTaskRepository.findById(id)
  if (!row) {
    throw new DeliveryTaskNotFoundError()
  }
  return row
}

export type SectorTransportOperatorListItem = {
  id: string
  code: string
  type: IsOperating
  operatorId: string
  sectorId: string | null
  createdAt: string
  updatedAt: string
  operator: {
    id: string
    name: string
    card: string
    unit: string
    role: string
  }
  sector: { id: string; typeSector: string } | null
  _count: { movimentPalletTasks: number }
  incompleteAssignedTaskCount: number
}

async function countIncompleteAssignedTasksForOperator(
  operatorUserId: string,
): Promise<number> {
  const [deliveryCount, pickupCount] = await Promise.all([
    deliveryTaskRepository.countIncompleteAssignedToOperator(operatorUserId),
    pickupTaskRepository.countIncompleteAssignedToOperator(operatorUserId),
  ])
  return deliveryCount + pickupCount
}

/** Operadores com modo de operação ativo no setor (painel «Meios de locomoção»). */
export async function listSectorTransportOperators(filters?: {
  sectorId?: string
}) {
  if (!filters?.sectorId) {
    return [] as SectorTransportOperatorListItem[]
  }

  const operators = await userRepository.findManyOperatingTransportInSector(
    filters.sectorId,
  )

  return Promise.all(
    operators.map(async (user) => {
      const operatingMode = user.isOperating as IsOperating
      const incompleteAssignedTaskCount =
        await countIncompleteAssignedTasksForOperator(user.id)

      return {
        id: user.id,
        code: user.name,
        type: operatingMode,
        operatorId: user.id,
        sectorId: user.sectorId,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
        operator: {
          id: user.id,
          name: user.name,
          card: user.card,
          unit: user.unit,
          role: user.role,
        },
        sector: user.sector,
        _count: { movimentPalletTasks: incompleteAssignedTaskCount },
        incompleteAssignedTaskCount,
      } satisfies SectorTransportOperatorListItem
    }),
  )
}

export async function listDeliveryTasks(filters?: {
  machineId?: string
  sectorId?: string
}) {
  if (filters?.machineId) {
    return deliveryTaskRepository.findManyForMachine(filters.machineId)
  }
  return prisma.deliveryTask.findMany({
    include: {
      machine: {
        select: {
          id: true,
          name: true,
          userId: true,
          sectorId: true,
          typeMachine: { select: { id: true, name: true } },
          sector: { select: { id: true, typeSector: true } },
        },
      },
      requestedBy: {
        select: {
          id: true,
          name: true,
          employeeId: true,
          card: true,
          unit: true,
          role: true,
        },
      },
      assignedOperator: {
        select: { id: true, name: true, isOperating: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
}

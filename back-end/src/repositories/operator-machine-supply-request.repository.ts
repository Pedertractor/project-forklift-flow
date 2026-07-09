import type { Prisma } from '../generated/prisma/client.js'
import {
  OperatorMachineSupplyRequestStatus,
} from '../generated/prisma/enums.js'
import { openMachineTaskStatuses } from '../constants/machine-task-status.js'
import { prisma } from '../lib/prisma.js'

export const operatorMachineSupplyRequestListInclude = {
  machine: {
    select: {
      id: true,
      name: true,
      sectorId: true,
      assetNumber: true,
      pillar: true,
      typeMachine: { select: { id: true, name: true, urlImage: true } },
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
  deliveryTask: {
    select: {
      id: true,
      movementCube: true,
      status: true,
      acceptedBySupply: true,
      preparedAt: true,
      isCritical: true,
    },
  },
} as const

export type OperatorMachineSupplyRequestListRow =
  Prisma.OperatorMachineSupplyRequestGetPayload<{
    include: typeof operatorMachineSupplyRequestListInclude
  }>

export const operatorMachineSupplyRequestRepository = {
  create(data: Prisma.OperatorMachineSupplyRequestCreateInput) {
    return prisma.operatorMachineSupplyRequest.create({
      data,
      include: operatorMachineSupplyRequestListInclude,
    })
  },

  findFirstOpenByMachineId(machineId: string) {
    return prisma.operatorMachineSupplyRequest.findFirst({
      where: { machineId, status: OperatorMachineSupplyRequestStatus.OPEN },
      include: operatorMachineSupplyRequestListInclude,
      orderBy: { createdAt: 'desc' },
    })
  },

  /** Aviso atendido com entrega ainda em aberto, do mesmo operador que solicitou. */
  findLatestFulfilledWithOpenDeliveryForMachineAndOperator(
    machineId: string,
    requestedById: string,
  ) {
    return prisma.operatorMachineSupplyRequest.findFirst({
      where: {
        machineId,
        requestedById,
        status: OperatorMachineSupplyRequestStatus.FULFILLED,
        deliveryTaskId: { not: null },
        deliveryTask: {
          status: { in: openMachineTaskStatuses },
        },
      },
      include: operatorMachineSupplyRequestListInclude,
      orderBy: { createdAt: 'desc' },
    })
  },

  findManyForOperatorMachine(
    operatorUserId: string,
    filters?: { status?: OperatorMachineSupplyRequestStatus },
  ) {
    const where: Prisma.OperatorMachineSupplyRequestWhereInput = {
      machine: { userId: operatorUserId },
    }
    if (filters?.status !== undefined) {
      where.status = filters.status
    }
    return prisma.operatorMachineSupplyRequest.findMany({
      where,
      include: operatorMachineSupplyRequestListInclude,
      orderBy: { createdAt: 'desc' },
    })
  },

  findManyOpenForSector(sectorId: string) {
    return prisma.operatorMachineSupplyRequest.findMany({
      where: {
        status: OperatorMachineSupplyRequestStatus.OPEN,
        machine: { sectorId },
      },
      include: operatorMachineSupplyRequestListInclude,
      orderBy: [{ machine: { name: 'asc' } }, { createdAt: 'asc' }],
    })
  },

  fulfillOpenForMachine(
    machineId: string,
    deliveryTaskId: string,
    tx: Prisma.TransactionClient,
  ) {
    const now = new Date()
    return tx.operatorMachineSupplyRequest.updateMany({
      where: {
        machineId,
        status: OperatorMachineSupplyRequestStatus.OPEN,
      },
      data: {
        status: OperatorMachineSupplyRequestStatus.FULFILLED,
        fulfilledAt: now,
        deliveryTaskId,
      },
    })
  },
}

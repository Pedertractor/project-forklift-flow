import type { Prisma } from '../generated/prisma/client.js'
import {
  OperatorMachineSupplyRequestStatus,
} from '../generated/prisma/enums.js'
import { prisma } from '../lib/prisma.js'

const listInclude = {
  machine: {
    select: {
      id: true,
      name: true,
      position: true,
      sectorId: true,
      typeMachine: { select: { id: true, name: true } },
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
  fulfilledByReplenishmentRequest: {
    select: { id: true, movementCube: true, status: true },
  },
} as const

export type OperatorMachineSupplyRequestListRow =
  Prisma.OperatorMachineSupplyRequestGetPayload<{ include: typeof listInclude }>

export const operatorMachineSupplyRequestRepository = {
  create(data: Prisma.OperatorMachineSupplyRequestCreateInput) {
    return prisma.operatorMachineSupplyRequest.create({
      data,
      include: listInclude,
    })
  },

  findFirstOpenByMachineId(machineId: string) {
    return prisma.operatorMachineSupplyRequest.findFirst({
      where: { machineId, status: OperatorMachineSupplyRequestStatus.OPEN },
      include: listInclude,
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
      include: listInclude,
      orderBy: { createdAt: 'desc' },
    })
  },

  findManyOpenForSector(sectorId: string) {
    return prisma.operatorMachineSupplyRequest.findMany({
      where: {
        status: OperatorMachineSupplyRequestStatus.OPEN,
        machine: { sectorId },
      },
      include: listInclude,
      orderBy: [{ machine: { name: 'asc' } }, { createdAt: 'asc' }],
    })
  },

  findFulfilledReplenishmentIds(replenishmentRequestIds: string[]) {
    if (replenishmentRequestIds.length === 0) {
      return new Set<string>();
    }
    return prisma.operatorMachineSupplyRequest
      .findMany({
        where: {
          status: OperatorMachineSupplyRequestStatus.FULFILLED,
          fulfilledByReplenishmentRequestId: { in: replenishmentRequestIds },
        },
        select: { fulfilledByReplenishmentRequestId: true },
      })
      .then(
        (rows) =>
          new Set(
            rows
              .map((r) => r.fulfilledByReplenishmentRequestId)
              .filter((id): id is string => id != null),
          ),
      );
  },

  fulfillOpenForDestination(
    destinationId: string,
    replenishmentRequestId: string,
    tx: Prisma.TransactionClient,
  ) {
    const now = new Date()
    return tx.operatorMachineSupplyRequest.updateMany({
      where: {
        machineId: destinationId,
        status: OperatorMachineSupplyRequestStatus.OPEN,
      },
      data: {
        status: OperatorMachineSupplyRequestStatus.FULFILLED,
        fulfilledAt: now,
        fulfilledByReplenishmentRequestId: replenishmentRequestId,
      },
    })
  },
}

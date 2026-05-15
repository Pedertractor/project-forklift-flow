import type { Prisma } from '../generated/prisma/client.js'
import {
  ForkliftTaskStatus,
  ForkliftTaskType,
  RequestStatus,
  TypeMovimentPallet,
} from '../generated/prisma/enums.js'
import { prisma } from '../lib/prisma.js'

const openDeliverTaskStatuses: ForkliftTaskStatus[] = [
  ForkliftTaskStatus.CREATED,
  ForkliftTaskStatus.ASSIGNED,
  ForkliftTaskStatus.IN_PROGRESS,
]

const openDeliverTaskWhere = {
  type: ForkliftTaskType.DELIVER_TO_MACHINE,
  status: { in: openDeliverTaskStatuses },
}

const requestListInclude = {
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
  destination: {
    select: {
      id: true,
      name: true,
      position: true,
      userId: true,
      typeMachine: { select: { id: true, name: true } },
      sector: { select: { id: true, typeSector: true } },
    },
  },
  _count: { select: { movimentPalletTasks: true } },
} as const

export const machineReplenishmentRequestRepository = {
  create(data: Prisma.MachineReplenishmentRequestCreateInput) {
    return prisma.machineReplenishmentRequest.create({
      data,
      include: requestListInclude,
    })
  },

  findUniqueById(id: string) {
    return prisma.machineReplenishmentRequest.findUnique({
      where: { id },
      include: requestListInclude,
    })
  },

  findManyForList(filters?: {
    requestedById?: string
    status?: RequestStatus
    destinationId?: string
  }) {
    const where: Prisma.MachineReplenishmentRequestWhereInput = {}
    if (filters?.requestedById !== undefined) {
      where.requestedById = filters.requestedById
    }
    if (filters?.status !== undefined) {
      where.status = filters.status
    }
    if (filters?.destinationId !== undefined) {
      where.destinationId = filters.destinationId
    }
    return prisma.machineReplenishmentRequest.findMany({
      where,
      include: requestListInclude,
      orderBy: { createdAt: 'desc' },
    })
  },

  findManyForDestinationOperator(
    operatorUserId: string,
    filters?: { status?: RequestStatus },
  ) {
    const where: Prisma.MachineReplenishmentRequestWhereInput = {
      destination: { userId: operatorUserId },
    }
    if (filters?.status !== undefined) {
      where.status = filters.status
    }
    return prisma.machineReplenishmentRequest.findMany({
      where,
      include: requestListInclude,
      orderBy: { createdAt: 'desc' },
    })
  },

  /** Fila para operador de empilhadeira / transpaleteira aceitar entrega (pallet pronto). */
  findManyOpenPoolForMovimentType(typeMovimentPallet: TypeMovimentPallet) {
    return prisma.machineReplenishmentRequest.findMany({
      where: {
        typeMovimentPallet,
        status: { in: [RequestStatus.PALLET_READY, RequestStatus.CREATED] },
        movimentPalletTasks: {
          none: openDeliverTaskWhere,
        },
      },
      include: requestListInclude,
      orderBy: [{ priorityLevel: 'asc' }, { createdAt: 'asc' }],
    })
  },
  findPalletReadyForDestination(destinationId: string) {
    return prisma.machineReplenishmentRequest.findFirst({
      where: {
        destinationId,
        status: { in: [RequestStatus.PALLET_READY, RequestStatus.CREATED] },
        movimentPalletTasks: { none: openDeliverTaskWhere },
      },
      include: requestListInclude,
      orderBy: [{ priorityLevel: 'asc' }, { createdAt: 'asc' }],
    })
  },

  findOpenAwaitingPreparationForDestination(destinationId: string) {
    return prisma.machineReplenishmentRequest.findFirst({
      where: {
        destinationId,
        status: RequestStatus.AWAITING_PREPARATION,
      },
      include: requestListInclude,
      orderBy: { awaitingPreparationSince: 'desc' },
    })
  },

  findManyAwaitingPreparationForSector(sectorId: string) {
    return prisma.machineReplenishmentRequest.findMany({
      where: {
        status: RequestStatus.AWAITING_PREPARATION,
        destination: { sectorId },
      },
      include: requestListInclude,
      orderBy: [
        { priorityLevel: 'asc' },
        { awaitingPreparationSince: 'asc' },
        { createdAt: 'asc' },
      ],
    })
  },

  findLatestByDestinationId(destinationId: string) {
    return prisma.machineReplenishmentRequest.findFirst({
      where: { destinationId },
      orderBy: { createdAt: 'desc' },
    })
  },

  update(id: string, data: Prisma.MachineReplenishmentRequestUpdateInput) {
    return prisma.machineReplenishmentRequest.update({
      where: { id },
      data,
      include: requestListInclude,
    })
  },

  delete(id: string) {
    return prisma.machineReplenishmentRequest.delete({ where: { id } })
  },
}

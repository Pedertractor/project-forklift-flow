import type { Prisma } from '../generated/prisma/client.js'
import {
  ForkliftTaskStatus,
  ForkliftTaskType,
} from '../generated/prisma/enums.js'
import { prisma } from '../lib/prisma.js'

const requestBriefInclude = {
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

const taskWithRequestInclude = {
  request: { include: requestBriefInclude },
  assignedMovimentPallet: {
    select: { id: true, code: true, type: true },
  },
} as const

const openPickupStatuses: ForkliftTaskStatus[] = [
  ForkliftTaskStatus.CREATED,
  ForkliftTaskStatus.ASSIGNED,
  ForkliftTaskStatus.IN_PROGRESS,
]

const movimentPalletTaskPickupSelect = {
  id: true,
  requestId: true,
  type: true,
  status: true,
  assignedMovimentPalletId: true,
  requestedById: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
} as const

export const movimentPalletTaskRepository = {
  findByIdWithRequest(id: string) {
    return prisma.movimentPalletTask.findUnique({
      where: { id },
      include: taskWithRequestInclude,
    })
  },

  findManyForAssignedPallet(palletId: string) {
    return prisma.movimentPalletTask.findMany({
      where: { assignedMovimentPalletId: palletId },
      include: taskWithRequestInclude,
      orderBy: { createdAt: 'desc' },
    })
  },

  findOpenPickupForRequest(requestId: string) {
    return prisma.movimentPalletTask.findFirst({
      where: {
        requestId,
        type: ForkliftTaskType.PICKUP_TO_EXPEDITION,
        status: { in: openPickupStatuses },
      },
      select: movimentPalletTaskPickupSelect,
    })
  },

  createPickupForRequest(requestId: string, requestedById: string) {
    const data: Prisma.MovimentPalletTaskCreateInput = {
      type: ForkliftTaskType.PICKUP_TO_EXPEDITION,
      status: ForkliftTaskStatus.CREATED,
      request: { connect: { id: requestId } },
      requestedBy: { connect: { id: requestedById } },
    }
    return prisma.movimentPalletTask.create({
      data,
      select: movimentPalletTaskPickupSelect,
    })
  },
}

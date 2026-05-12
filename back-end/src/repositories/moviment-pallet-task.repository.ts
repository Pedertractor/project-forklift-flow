import type { Prisma } from '../generated/prisma/client.js'
import {
  ForkliftTaskStatus,
  ForkliftTaskType,
} from '../generated/prisma/enums.js'
import { prisma } from '../lib/prisma.js'

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

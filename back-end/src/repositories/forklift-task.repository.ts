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

const forkliftTaskPickupSelect = {
  id: true,
  requestId: true,
  type: true,
  status: true,
  assignedForkliftId: true,
  requestedById: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
} as const

export const forkliftTaskRepository = {
  findOpenPickupForRequest(requestId: string) {
    return prisma.forkliftTask.findFirst({
      where: {
        requestId,
        type: ForkliftTaskType.PICKUP_TO_EXPEDITION,
        status: { in: openPickupStatuses },
      },
      select: forkliftTaskPickupSelect,
    })
  },

  createPickupForRequest(
    requestId: string,
    requestedById: string,
  ) {
    const data: Prisma.ForkliftTaskCreateInput = {
      type: ForkliftTaskType.PICKUP_TO_EXPEDITION,
      status: ForkliftTaskStatus.CREATED,
      request: { connect: { id: requestId } },
      requestedBy: { connect: { id: requestedById } },
    }
    return prisma.forkliftTask.create({
      data,
      select: forkliftTaskPickupSelect,
    })
  },
}

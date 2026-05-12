import type { Prisma } from '../generated/prisma/client.js'
import {
  ForkliftTaskStatus,
  ForkliftTaskType,
  MovimentPalletTripSuggestionStatus,
  RequestStatus,
  TypeMovimentPallet,
} from '../generated/prisma/enums.js'
import { prisma } from '../lib/prisma.js'

const openTaskStatuses: ForkliftTaskStatus[] = [
  ForkliftTaskStatus.CREATED,
  ForkliftTaskStatus.ASSIGNED,
  ForkliftTaskStatus.IN_PROGRESS,
]

const taskWithRequestInclude = {
  request: {
    include: {
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
    },
  },
  assignedMovimentPallet: {
    select: { id: true, code: true, type: true },
  },
} as const

const suggestionListInclude = {
  deliverTask: { include: taskWithRequestInclude },
  pickupTask: { include: taskWithRequestInclude },
  machine: { select: { id: true, name: true, position: true, sectorId: true } },
} as const

export type MovimentPalletTripSuggestionWithTasks = Prisma.MovimentPalletTripSuggestionGetPayload<{
  include: typeof suggestionListInclude
}>

export const movimentPalletTripSuggestionRepository = {
  findByIdWithTasks(id: string) {
    return prisma.movimentPalletTripSuggestion.findUnique({
      where: { id },
      include: {
        deliverTask: { include: taskWithRequestInclude },
        pickupTask: { include: taskWithRequestInclude },
        machine: { select: { id: true, name: true, position: true, sectorId: true } },
        acceptedBy: {
          select: { id: true, name: true },
        },
        assignedMovimentPallet: {
          select: { id: true, code: true, type: true },
        },
      },
    })
  },

  findManyListableForOperator(
    sectorId: string,
    types: TypeMovimentPallet[],
    operatorUserId: string,
  ) {
    return prisma.movimentPalletTripSuggestion.findMany({
      where: {
        typeMovimentPallet: { in: types },
        OR: [
          {
            status: MovimentPalletTripSuggestionStatus.OPEN,
            machine: { sectorId },
          },
          {
            status: MovimentPalletTripSuggestionStatus.ACCEPTED,
            acceptedByUserId: operatorUserId,
          },
        ],
      },
      include: suggestionListInclude,
      orderBy: { createdAt: 'asc' },
    })
  },

  findManyOpenForSector(sectorId: string, types: TypeMovimentPallet[]) {
    return prisma.movimentPalletTripSuggestion.findMany({
      where: {
        status: MovimentPalletTripSuggestionStatus.OPEN,
        typeMovimentPallet: { in: types },
        machine: { sectorId },
      },
      include: suggestionListInclude,
    })
  },

  expireByIds(ids: string[]) {
    if (ids.length === 0) {
      return Promise.resolve({ count: 0 })
    }
    return prisma.movimentPalletTripSuggestion.updateMany({
      where: {
        id: { in: ids },
        status: MovimentPalletTripSuggestionStatus.OPEN,
      },
      data: { status: MovimentPalletTripSuggestionStatus.EXPIRED },
    })
  },

  async upsertOpenPair(input: {
    deliverTaskId: string
    pickupTaskId: string
    machineId: string
    typeMovimentPallet: TypeMovimentPallet
  }) {
    const existing = await prisma.movimentPalletTripSuggestion.findUnique({
      where: { deliverTaskId: input.deliverTaskId },
    })
    if (!existing) {
      return prisma.movimentPalletTripSuggestion.create({
        data: {
          status: MovimentPalletTripSuggestionStatus.OPEN,
          deliverTask: { connect: { id: input.deliverTaskId } },
          pickupTask: { connect: { id: input.pickupTaskId } },
          machine: { connect: { id: input.machineId } },
          typeMovimentPallet: input.typeMovimentPallet,
        },
        include: suggestionListInclude,
      })
    }
    if (
      existing.status === MovimentPalletTripSuggestionStatus.ACCEPTED ||
      existing.status === MovimentPalletTripSuggestionStatus.COMPLETED
    ) {
      return prisma.movimentPalletTripSuggestion.findUniqueOrThrow({
        where: { id: existing.id },
        include: suggestionListInclude,
      })
    }
    return prisma.movimentPalletTripSuggestion.update({
      where: { id: existing.id },
      data: {
        pickupTaskId: input.pickupTaskId,
        machineId: input.machineId,
        typeMovimentPallet: input.typeMovimentPallet,
        status: MovimentPalletTripSuggestionStatus.OPEN,
      },
      include: suggestionListInclude,
    })
  },
}

export function isOpenTripTaskPairValid(
  deliverType: ForkliftTaskType,
  deliverStatus: ForkliftTaskStatus,
  pickupType: ForkliftTaskType,
  pickupStatus: ForkliftTaskStatus,
  deliverRequestId: string,
  pickupRequestId: string,
  deliverDestinationId: string,
  pickupDestinationId: string,
  pickupRequestStatus: RequestStatus,
): boolean {
  if (deliverType !== ForkliftTaskType.DELIVER_TO_MACHINE) {
    return false
  }
  if (pickupType !== ForkliftTaskType.PICKUP_TO_EXPEDITION) {
    return false
  }
  if (!openTaskStatuses.includes(deliverStatus)) {
    return false
  }
  if (!openTaskStatuses.includes(pickupStatus)) {
    return false
  }
  if (deliverRequestId === pickupRequestId) {
    return false
  }
  if (deliverDestinationId !== pickupDestinationId) {
    return false
  }
  if (pickupRequestStatus !== RequestStatus.ON_MACHINE) {
    return false
  }
  return true
}

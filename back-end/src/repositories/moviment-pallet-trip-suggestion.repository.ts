import type { Prisma } from '../generated/prisma/client.js'
import {
  ForkliftTaskStatus,
  ForkliftTaskType,
  MovimentPalletTripSuggestionStatus,
  RequestStatus,
  MovimentPalletEquipmentType,
} from '../generated/prisma/enums.js'

const completedTaskStatus = ForkliftTaskStatus.COMPLETED
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

  /** Apenas sugestoes ainda nao aceitas (fila de rotas combinadas). */
  findManyOpenListableForOperator(
    sectorId: string,
    types: MovimentPalletEquipmentType[],
  ) {
    return prisma.movimentPalletTripSuggestion.findMany({
      where: {
        status: MovimentPalletTripSuggestionStatus.OPEN,
        typeMovimentPallet: { in: types },
        machine: { sectorId },
      },
      include: suggestionListInclude,
      orderBy: { createdAt: 'asc' },
    })
  },

  findAcceptedByPickupTaskId(pickupTaskId: string) {
    return prisma.movimentPalletTripSuggestion.findFirst({
      where: {
        pickupTaskId,
        status: MovimentPalletTripSuggestionStatus.ACCEPTED,
      },
      include: {
        deliverTask: { select: { id: true, status: true } },
        pickupTask: { select: { id: true, status: true } },
      },
    })
  },

  markCompleted(id: string) {
    return prisma.movimentPalletTripSuggestion.updateMany({
      where: {
        id,
        status: MovimentPalletTripSuggestionStatus.ACCEPTED,
      },
      data: { status: MovimentPalletTripSuggestionStatus.COMPLETED },
    })
  },

  reconcileCompletedAcceptedInSector(sectorId: string, types: MovimentPalletEquipmentType[]) {
    return prisma.movimentPalletTripSuggestion.updateMany({
      where: {
        status: MovimentPalletTripSuggestionStatus.ACCEPTED,
        typeMovimentPallet: { in: types },
        machine: { sectorId },
        deliverTask: { status: completedTaskStatus },
        pickupTask: { status: completedTaskStatus },
      },
      data: { status: MovimentPalletTripSuggestionStatus.COMPLETED },
    })
  },

  findManyOpenForSector(sectorId: string, types: MovimentPalletEquipmentType[]) {
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
    typeMovimentPallet: MovimentPalletEquipmentType
  }): Promise<{ created: boolean }> {
    await prisma.movimentPalletTripSuggestion.updateMany({
      where: {
        pickupTaskId: input.pickupTaskId,
        status: MovimentPalletTripSuggestionStatus.OPEN,
        deliverTaskId: { not: input.deliverTaskId },
      },
      data: { status: MovimentPalletTripSuggestionStatus.EXPIRED },
    })

    const existingByPickup = await prisma.movimentPalletTripSuggestion.findUnique({
      where: { pickupTaskId: input.pickupTaskId },
    })

    if (existingByPickup) {
      if (
        existingByPickup.status === MovimentPalletTripSuggestionStatus.ACCEPTED ||
        existingByPickup.status === MovimentPalletTripSuggestionStatus.COMPLETED
      ) {
        return { created: false }
      }
      await prisma.movimentPalletTripSuggestion.update({
        where: { id: existingByPickup.id },
        data: {
          deliverTaskId: input.deliverTaskId,
          machineId: input.machineId,
          typeMovimentPallet: input.typeMovimentPallet,
          status: MovimentPalletTripSuggestionStatus.OPEN,
        },
        include: suggestionListInclude,
      })
      return { created: false }
    }

    const existingByDeliver = await prisma.movimentPalletTripSuggestion.findUnique({
      where: { deliverTaskId: input.deliverTaskId },
    })
    if (!existingByDeliver) {
      await prisma.movimentPalletTripSuggestion.create({
        data: {
          status: MovimentPalletTripSuggestionStatus.OPEN,
          deliverTask: { connect: { id: input.deliverTaskId } },
          pickupTask: { connect: { id: input.pickupTaskId } },
          machine: { connect: { id: input.machineId } },
          typeMovimentPallet: input.typeMovimentPallet,
        },
        include: suggestionListInclude,
      })
      return { created: true }
    }
    if (
      existingByDeliver.status === MovimentPalletTripSuggestionStatus.ACCEPTED ||
      existingByDeliver.status === MovimentPalletTripSuggestionStatus.COMPLETED
    ) {
      return { created: false }
    }
    await prisma.movimentPalletTripSuggestion.update({
      where: { id: existingByDeliver.id },
      data: {
        pickupTaskId: input.pickupTaskId,
        machineId: input.machineId,
        typeMovimentPallet: input.typeMovimentPallet,
        status: MovimentPalletTripSuggestionStatus.OPEN,
      },
      include: suggestionListInclude,
    })
    return { created: false }
  },
}

const validDeliverRequestStatuses: RequestStatus[] = [
  RequestStatus.PALLET_READY,
  RequestStatus.CREATED,
  RequestStatus.IN_PROGRESS,
]

export function isOpenTripTaskPairValid(
  deliverType: ForkliftTaskType,
  deliverStatus: ForkliftTaskStatus,
  pickupType: ForkliftTaskType,
  pickupStatus: ForkliftTaskStatus,
  deliverRequestId: string,
  pickupRequestId: string,
  deliverDestinationId: string,
  pickupDestinationId: string,
  deliverRequestStatus: RequestStatus,
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
  if (!validDeliverRequestStatuses.includes(deliverRequestStatus)) {
    return false
  }
  if (pickupRequestStatus !== RequestStatus.ON_MACHINE) {
    return false
  }
  return true
}

import type { Prisma } from '../generated/prisma/client.js'
import {
  MachineTaskStatus,
  MovimentPalletTripSuggestionStatus,
  TypeMovimentPallet,
} from '../generated/prisma/enums.js'
import { openMachineTaskStatuses } from '../constants/machine-task-status.js'
import { prisma } from '../lib/prisma.js'
import {
  deliveryTaskListInclude,
} from './delivery-task.repository.js'
import { pickupTaskListInclude } from './pickup-task.repository.js'

const suggestionListInclude = {
  deliverTask: { include: deliveryTaskListInclude },
  pickupTask: { include: pickupTaskListInclude },
  machine: { select: { id: true, name: true, sectorId: true } },
} as const

export type MovimentPalletTripSuggestionWithTasks = Prisma.MovimentPalletTripSuggestionGetPayload<{
  include: typeof suggestionListInclude
}>

const completedTaskStatus = MachineTaskStatus.COMPLETED

export const movimentPalletTripSuggestionRepository = {
  findByIdWithTasks(id: string) {
    return prisma.movimentPalletTripSuggestion.findUnique({
      where: { id },
      include: {
        ...suggestionListInclude,
        acceptedBy: { select: { id: true, name: true, isOperating: true } },
      },
    })
  },

  findManyOpenListableForOperator(
    sectorId: string,
    types: TypeMovimentPallet[],
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

  reconcileCompletedAcceptedInSector(sectorId: string, types: TypeMovimentPallet[]) {
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

  /** Sugestao combinada so vale com entrega preparada; expira pares antecipados. */
  expireOpenWithUnpreparedDeliveryInSector(
    sectorId: string,
    types: TypeMovimentPallet[],
  ) {
    return prisma.movimentPalletTripSuggestion.updateMany({
      where: {
        status: MovimentPalletTripSuggestionStatus.OPEN,
        typeMovimentPallet: { in: types },
        machine: { sectorId },
        deliverTask: { preparedAt: null },
      },
      data: { status: MovimentPalletTripSuggestionStatus.EXPIRED },
    })
  },

  async upsertOpenPair(input: {
    deliverTaskId: string
    pickupTaskId: string
    machineId: string
    typeMovimentPallet: TypeMovimentPallet
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
    })
    return { created: false }
  },
}

export function isOpenTripTaskPairValid(
  deliverStatus: MachineTaskStatus,
  pickupStatus: MachineTaskStatus,
  deliverMachineId: string,
  pickupMachineId: string,
  deliverPrepared: boolean,
): boolean {
  if (!openMachineTaskStatuses.includes(deliverStatus)) {
    return false
  }
  if (!openMachineTaskStatuses.includes(pickupStatus)) {
    return false
  }
  if (deliverMachineId !== pickupMachineId) {
    return false
  }
  if (!deliverPrepared) {
    return false
  }
  return true
}

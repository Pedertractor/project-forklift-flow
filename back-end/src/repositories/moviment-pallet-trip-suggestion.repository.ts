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
  machine: {
    select: {
      id: true,
      name: true,
      sectorId: true,
      productionStatus: true,
      assetNumber: true,
      pillar: true,
      machineStreet: {
        select: { id: true, name: true, machineStreetColor: true },
      },
    },
  },
} as const

export type MovimentPalletTripSuggestionWithTasks = Prisma.MovimentPalletTripSuggestionGetPayload<{
  include: typeof suggestionListInclude
}>

const completedTaskStatus = MachineTaskStatus.COMPLETED

type TripSuggestionPairInput = {
  deliverTaskId: string
  pickupTaskId: string
  machineId: string
  typeMovimentPallet: TypeMovimentPallet
}

type TripSuggestionTx = Prisma.TransactionClient

function isTerminalTripSuggestionStatus(
  status: MovimentPalletTripSuggestionStatus,
): boolean {
  return (
    status === MovimentPalletTripSuggestionStatus.ACCEPTED ||
    status === MovimentPalletTripSuggestionStatus.COMPLETED
  )
}

function isPrismaUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: string }).code === 'P2002'
  )
}

/** Remove linhas não terminais que bloqueiam os uniques de deliver/pickup. */
async function removeConflictingTripSuggestions(
  tx: TripSuggestionTx,
  input: TripSuggestionPairInput,
  keepId: string,
): Promise<boolean> {
  const conflicts = await tx.movimentPalletTripSuggestion.findMany({
    where: {
      OR: [
        { deliverTaskId: input.deliverTaskId },
        { pickupTaskId: input.pickupTaskId },
      ],
      NOT: { id: keepId },
    },
  })

  for (const row of conflicts) {
    if (isTerminalTripSuggestionStatus(row.status)) {
      return false
    }
    await tx.movimentPalletTripSuggestion.delete({ where: { id: row.id } })
  }

  return true
}

async function upsertOpenPairInTransaction(
  tx: TripSuggestionTx,
  input: TripSuggestionPairInput,
): Promise<{ created: boolean }> {
  await tx.movimentPalletTripSuggestion.updateMany({
    where: {
      pickupTaskId: input.pickupTaskId,
      status: MovimentPalletTripSuggestionStatus.OPEN,
      deliverTaskId: { not: input.deliverTaskId },
    },
    data: { status: MovimentPalletTripSuggestionStatus.EXPIRED },
  })

  let rowByDeliver = await tx.movimentPalletTripSuggestion.findUnique({
    where: { deliverTaskId: input.deliverTaskId },
  })
  let rowByPickup = await tx.movimentPalletTripSuggestion.findUnique({
    where: { pickupTaskId: input.pickupTaskId },
  })

  if (rowByDeliver && isTerminalTripSuggestionStatus(rowByDeliver.status)) {
    return { created: false }
  }
  if (rowByPickup && isTerminalTripSuggestionStatus(rowByPickup.status)) {
    return { created: false }
  }

  if (
    rowByDeliver &&
    rowByPickup &&
    rowByDeliver.id !== rowByPickup.id
  ) {
    await tx.movimentPalletTripSuggestion.delete({
      where: { id: rowByPickup.id },
    })
    rowByPickup = null
  }

  const existing = rowByDeliver ?? rowByPickup

  if (existing) {
    const canProceed = await removeConflictingTripSuggestions(
      tx,
      input,
      existing.id,
    )
    if (!canProceed) {
      return { created: false }
    }

    await tx.movimentPalletTripSuggestion.update({
      where: { id: existing.id },
      data: {
        deliverTaskId: input.deliverTaskId,
        pickupTaskId: input.pickupTaskId,
        machineId: input.machineId,
        typeMovimentPallet: input.typeMovimentPallet,
        status: MovimentPalletTripSuggestionStatus.OPEN,
      },
    })
    return { created: false }
  }

  try {
    await tx.movimentPalletTripSuggestion.create({
      data: {
        status: MovimentPalletTripSuggestionStatus.OPEN,
        deliverTask: { connect: { id: input.deliverTaskId } },
        pickupTask: { connect: { id: input.pickupTaskId } },
        machine: { connect: { id: input.machineId } },
        typeMovimentPallet: input.typeMovimentPallet,
      },
    })
    return { created: true }
  } catch (error) {
    if (!isPrismaUniqueViolation(error)) {
      throw error
    }

    const row = await tx.movimentPalletTripSuggestion.findFirst({
      where: {
        OR: [
          { deliverTaskId: input.deliverTaskId },
          { pickupTaskId: input.pickupTaskId },
        ],
      },
    })
    if (!row || isTerminalTripSuggestionStatus(row.status)) {
      return { created: false }
    }

    const canProceed = await removeConflictingTripSuggestions(tx, input, row.id)
    if (!canProceed) {
      return { created: false }
    }

    await tx.movimentPalletTripSuggestion.update({
      where: { id: row.id },
      data: {
        deliverTaskId: input.deliverTaskId,
        pickupTaskId: input.pickupTaskId,
        machineId: input.machineId,
        typeMovimentPallet: input.typeMovimentPallet,
        status: MovimentPalletTripSuggestionStatus.OPEN,
      },
    })
    return { created: false }
  }
}

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
    sectorId: string | null | undefined,
    types: TypeMovimentPallet[],
  ) {
    return prisma.movimentPalletTripSuggestion.findMany({
      where: {
        status: MovimentPalletTripSuggestionStatus.OPEN,
        typeMovimentPallet: { in: types },
        ...(sectorId ? { machine: { sectorId } } : {}),
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

  /**
   * Expira sugestões OPEN cuja entrega não está mais elegível
   * (cancelada / já atribuída / concluída). Mantém pares com entrega
   * ainda em preparo — amarração desde a solicitação do pallet.
   */
  expireOpenWithUnpreparedDeliveryInSector(
    sectorId: string,
    types: TypeMovimentPallet[],
  ) {
    return prisma.movimentPalletTripSuggestion.updateMany({
      where: {
        status: MovimentPalletTripSuggestionStatus.OPEN,
        typeMovimentPallet: { in: types },
        machine: { sectorId },
        OR: [
          { deliverTask: { status: MachineTaskStatus.CANCELED } },
          { deliverTask: { status: MachineTaskStatus.COMPLETED } },
          { deliverTask: { assignedOperatorId: { not: null } } },
          { pickupTask: { status: { not: MachineTaskStatus.CREATED } } },
        ],
      },
      data: { status: MovimentPalletTripSuggestionStatus.EXPIRED },
    })
  },

  async upsertOpenPair(input: TripSuggestionPairInput): Promise<{ created: boolean }> {
    return prisma.$transaction((tx) => upsertOpenPairInTransaction(tx, input))
  },

  /**
   * Emparelha entrega já acatada com retirada nova: sugestão ACCEPTED
   * (anexa ao transporte em curso do mesmo operador).
   */
  async upsertAcceptedPair(
    input: TripSuggestionPairInput & {
      acceptedByUserId: string
      acceptedAt?: Date
    },
  ): Promise<{ created: boolean; id: string | null }> {
    const acceptedAt = input.acceptedAt ?? new Date()

    return prisma.$transaction(async (tx) => {
      await tx.movimentPalletTripSuggestion.updateMany({
        where: {
          pickupTaskId: input.pickupTaskId,
          status: MovimentPalletTripSuggestionStatus.OPEN,
          deliverTaskId: { not: input.deliverTaskId },
        },
        data: { status: MovimentPalletTripSuggestionStatus.EXPIRED },
      })

      const rowByDeliver = await tx.movimentPalletTripSuggestion.findUnique({
        where: { deliverTaskId: input.deliverTaskId },
      })
      const rowByPickup = await tx.movimentPalletTripSuggestion.findUnique({
        where: { pickupTaskId: input.pickupTaskId },
      })

      if (
        rowByDeliver &&
        rowByDeliver.status === MovimentPalletTripSuggestionStatus.COMPLETED
      ) {
        return { created: false, id: null }
      }
      if (
        rowByPickup &&
        rowByPickup.status === MovimentPalletTripSuggestionStatus.COMPLETED
      ) {
        return { created: false, id: null }
      }

      if (
        rowByDeliver &&
        rowByPickup &&
        rowByDeliver.id !== rowByPickup.id
      ) {
        if (
          isTerminalTripSuggestionStatus(rowByPickup.status) &&
          rowByPickup.status !== MovimentPalletTripSuggestionStatus.ACCEPTED
        ) {
          return { created: false, id: null }
        }
        if (rowByPickup.status === MovimentPalletTripSuggestionStatus.OPEN) {
          await tx.movimentPalletTripSuggestion.delete({
            where: { id: rowByPickup.id },
          })
        } else if (
          rowByPickup.status === MovimentPalletTripSuggestionStatus.ACCEPTED
        ) {
          return { created: false, id: rowByPickup.id }
        }
      }

      const existing = rowByDeliver ?? rowByPickup
      if (existing) {
        if (
          existing.status === MovimentPalletTripSuggestionStatus.COMPLETED
        ) {
          return { created: false, id: null }
        }

        const conflicts = await tx.movimentPalletTripSuggestion.findMany({
          where: {
            OR: [
              { deliverTaskId: input.deliverTaskId },
              { pickupTaskId: input.pickupTaskId },
            ],
            NOT: { id: existing.id },
          },
        })
        for (const conflict of conflicts) {
          if (
            conflict.status === MovimentPalletTripSuggestionStatus.COMPLETED
          ) {
            return { created: false, id: null }
          }
          if (conflict.status === MovimentPalletTripSuggestionStatus.OPEN) {
            await tx.movimentPalletTripSuggestion.delete({
              where: { id: conflict.id },
            })
          }
        }

        await tx.movimentPalletTripSuggestion.update({
          where: { id: existing.id },
          data: {
            deliverTaskId: input.deliverTaskId,
            pickupTaskId: input.pickupTaskId,
            machineId: input.machineId,
            typeMovimentPallet: input.typeMovimentPallet,
            status: MovimentPalletTripSuggestionStatus.ACCEPTED,
            acceptedByUserId: input.acceptedByUserId,
            acceptedAt,
          },
        })
        return { created: false, id: existing.id }
      }

      try {
        const created = await tx.movimentPalletTripSuggestion.create({
          data: {
            status: MovimentPalletTripSuggestionStatus.ACCEPTED,
            deliverTask: { connect: { id: input.deliverTaskId } },
            pickupTask: { connect: { id: input.pickupTaskId } },
            machine: { connect: { id: input.machineId } },
            typeMovimentPallet: input.typeMovimentPallet,
            acceptedBy: { connect: { id: input.acceptedByUserId } },
            acceptedAt,
          },
        })
        return { created: true, id: created.id }
      } catch (error) {
        if (!isPrismaUniqueViolation(error)) {
          throw error
        }
        const row = await tx.movimentPalletTripSuggestion.findFirst({
          where: {
            OR: [
              { deliverTaskId: input.deliverTaskId },
              { pickupTaskId: input.pickupTaskId },
            ],
          },
        })
        return { created: false, id: row?.id ?? null }
      }
    })
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

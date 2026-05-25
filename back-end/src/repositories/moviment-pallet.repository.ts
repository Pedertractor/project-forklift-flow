import type { Prisma } from '../generated/prisma/client.js'
import type { MovimentPalletEquipmentType } from '../generated/prisma/enums.js'
import { incompleteAssignedMachineTaskStatuses } from '../constants/machine-task-status.js'
import { prisma } from '../lib/prisma.js'

const movimentPalletListSelect = {
  id: true,
  code: true,
  type: true,
  operatorId: true,
  sectorId: true,
  createdAt: true,
  updatedAt: true,
  operator: {
    select: {
      id: true,
      name: true,
      card: true,
      unit: true,
      role: true,
    },
  },
  sector: {
    select: { id: true, typeSector: true },
  },
  _count: { select: { deliveryTasks: true, pickupTasks: true } },
} as const

const movimentPalletListWithAvailabilitySelect = {
  ...movimentPalletListSelect,
  deliveryTasks: {
    where: { status: { in: incompleteAssignedMachineTaskStatuses } },
    select: { id: true },
  },
  pickupTasks: {
    where: { status: { in: incompleteAssignedMachineTaskStatuses } },
    select: { id: true },
  },
} as const

type MovimentPalletListWithAvailabilityRow = Prisma.MovimentPalletGetPayload<{
  select: typeof movimentPalletListWithAvailabilitySelect
}>

function mapListRowWithAvailability(row: MovimentPalletListWithAvailabilityRow) {
  const { deliveryTasks, pickupTasks, ...rest } = row
  return {
    ...rest,
    incompleteAssignedTaskCount: deliveryTasks.length + pickupTasks.length,
  }
}

function buildListWhere(filters?: {
  sectorId?: string
  type?: MovimentPalletEquipmentType
}): Prisma.MovimentPalletWhereInput {
  const where: Prisma.MovimentPalletWhereInput = {}
  if (filters?.sectorId !== undefined) {
    where.sectorId = filters.sectorId
  }
  if (filters?.type !== undefined) {
    where.type = filters.type
  }
  return where
}

export const movimentPalletRepository = {
  create(data: Prisma.MovimentPalletCreateInput) {
    return prisma.movimentPallet.create({
      data,
      select: movimentPalletListSelect,
    })
  },

  findUniqueById(id: string) {
    return prisma.movimentPallet.findUnique({
      where: { id },
      select: movimentPalletListSelect,
    })
  },

  findUniqueByCode(code: string) {
    return prisma.movimentPallet.findUnique({
      where: { code },
      select: movimentPalletListSelect,
    })
  },

  findManyForList(filters?: { sectorId?: string; type?: MovimentPalletEquipmentType }) {
    return prisma.movimentPallet.findMany({
      where: buildListWhere(filters),
      select: movimentPalletListSelect,
      orderBy: { code: 'asc' },
    })
  },

  async findManyForListWithTaskAvailability(filters?: {
    sectorId?: string
    type?: MovimentPalletEquipmentType
  }) {
    const rows = await prisma.movimentPallet.findMany({
      where: buildListWhere(filters),
      select: movimentPalletListWithAvailabilitySelect,
      orderBy: { code: 'asc' },
    })
    return rows.map(mapListRowWithAvailability)
  },

  findManyForOperatorPicker(options: {
    sectorId: string
    types: MovimentPalletEquipmentType[]
  }) {
    return prisma.movimentPallet.findMany({
      where: {
        sectorId: options.sectorId,
        type: { in: options.types },
      },
      select: movimentPalletListSelect,
      orderBy: { code: 'asc' },
    })
  },

  findFirstByOperatorUserId(operatorUserId: string) {
    return prisma.movimentPallet.findFirst({
      where: { operatorId: operatorUserId },
      select: movimentPalletListSelect,
    })
  },

  assignOperatorExclusive(movimentPalletId: string, operatorUserId: string) {
    return prisma.$transaction(async (tx) => {
      await tx.movimentPallet.updateMany({
        where: { operatorId: operatorUserId },
        data: { operatorId: null },
      })
      return tx.movimentPallet.update({
        where: { id: movimentPalletId },
        data: { operator: { connect: { id: operatorUserId } } },
        select: movimentPalletListSelect,
      })
    })
  },

  disconnectOperatorFromAllMovimentPallets(operatorUserId: string) {
    return prisma.movimentPallet.updateMany({
      where: { operatorId: operatorUserId },
      data: { operatorId: null },
    })
  },

  update(id: string, data: Prisma.MovimentPalletUpdateInput) {
    return prisma.movimentPallet.update({
      where: { id },
      data,
      select: movimentPalletListSelect,
    })
  },

  delete(id: string) {
    return prisma.movimentPallet.delete({ where: { id } })
  },
}

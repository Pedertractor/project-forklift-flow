import type { Prisma } from '../generated/prisma/client.js'
import { prisma } from '../lib/prisma.js'

const machineListSelect = {
  id: true,
  name: true,
  position: true,
  plantUnit: true,
  typeMachineId: true,
  sectorId: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
  typeMachine: {
    select: { id: true, name: true, urlImage: true },
  },
  sector: {
    select: { id: true, typeSector: true },
  },
} as const

const machineDetailInclude = {
  typeMachine: { select: { id: true, name: true, urlImage: true } },
  sector: { select: { id: true, typeSector: true } },
  user: {
    select: {
      id: true,
      name: true,
      card: true,
      unit: true,
    },
  },
} as const

export const machineRepository = {
  findUniqueById(id: string) {
    return prisma.machine.findUnique({
      where: { id },
      include: machineDetailInclude,
    })
  },

  findManyForList(options?: { sectorId?: string; plantUnit?: 'PEDERTRACTOR' | 'TRACTOR' }) {
    const where: { sectorId?: string; plantUnit?: 'PEDERTRACTOR' | 'TRACTOR' } = {}
    if (options?.sectorId !== undefined) {
      where.sectorId = options.sectorId
    }
    if (options?.plantUnit !== undefined) {
      where.plantUnit = options.plantUnit
    }
    return prisma.machine.findMany({
      ...(Object.keys(where).length > 0 ? { where } : {}),
      select: machineListSelect,
      orderBy: { name: 'asc' },
    })
  },

  findFirstByOperatorUserId(userId: string) {
    return prisma.machine.findFirst({
      where: { userId },
      select: machineListSelect,
    })
  },

  assignOperatorExclusive(machineId: string, operatorUserId: string) {
    return prisma.$transaction(async (tx) => {
      await tx.machine.updateMany({
        where: { userId: operatorUserId },
        data: { userId: null },
      })
      return tx.machine.update({
        where: { id: machineId },
        data: { user: { connect: { id: operatorUserId } } },
        include: machineDetailInclude,
      })
    })
  },

  disconnectOperatorFromAllMachines(operatorUserId: string) {
    return prisma.machine.updateMany({
      where: { userId: operatorUserId },
      data: { userId: null },
    })
  },

  create(data: Prisma.MachineCreateInput) {
    return prisma.machine.create({
      data,
      include: machineDetailInclude,
    })
  },

  update(id: string, data: Prisma.MachineUpdateInput) {
    return prisma.machine.update({
      where: { id },
      data,
      include: machineDetailInclude,
    })
  },

  delete(id: string) {
    return prisma.machine.delete({ where: { id } })
  },
}

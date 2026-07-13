import { prisma } from '../lib/prisma.js'

const linkListSelect = {
  id: true,
  operatorId: true,
  machineId: true,
  createdAt: true,
  updatedAt: true,
  operator: {
    select: {
      id: true,
      name: true,
      card: true,
      unit: true,
      role: true,
      sectorId: true,
      sector: { select: { id: true, typeSector: true } },
    },
  },
  machine: {
    select: {
      id: true,
      name: true,
      assetNumber: true,
      pillar: true,
      sectorId: true,
      plantUnit: true,
      sector: { select: { id: true, typeSector: true } },
      machineStreet: {
        select: {
          id: true,
          name: true,
          machineStreetColor: true,
        },
      },
      typeMachine: { select: { id: true, name: true, urlImage: true } },
    },
  },
} as const

export const movimentOperatorMachineLinkRepository = {
  findMany(options?: { operatorId?: string; sectorId?: string }) {
    return prisma.movimentOperatorMachineLink.findMany({
      where: {
        ...(options?.operatorId ? { operatorId: options.operatorId } : {}),
        ...(options?.sectorId
          ? {
              OR: [
                { operator: { sectorId: options.sectorId } },
                { machine: { sectorId: options.sectorId } },
              ],
            }
          : {}),
      },
      select: linkListSelect,
      orderBy: [{ operator: { name: 'asc' } }, { machine: { name: 'asc' } }],
    })
  },

  findMachineIdsByOperatorId(operatorId: string) {
    return prisma.movimentOperatorMachineLink
      .findMany({
        where: { operatorId },
        select: { machineId: true },
      })
      .then((rows) => rows.map((row) => row.machineId))
  },

  findUniqueByOperatorAndMachine(operatorId: string, machineId: string) {
    return prisma.movimentOperatorMachineLink.findUnique({
      where: {
        operatorId_machineId: { operatorId, machineId },
      },
      select: linkListSelect,
    })
  },

  findById(id: string) {
    return prisma.movimentOperatorMachineLink.findUnique({
      where: { id },
      select: linkListSelect,
    })
  },

  create(operatorId: string, machineId: string) {
    return prisma.movimentOperatorMachineLink.create({
      data: { operatorId, machineId },
      select: linkListSelect,
    })
  },

  deleteById(id: string) {
    return prisma.movimentOperatorMachineLink.delete({
      where: { id },
      select: linkListSelect,
    })
  },

  deleteByOperatorAndMachine(operatorId: string, machineId: string) {
    return prisma.movimentOperatorMachineLink.delete({
      where: {
        operatorId_machineId: { operatorId, machineId },
      },
      select: linkListSelect,
    })
  },

  /** Substitui todos os vínculos do operador pelo conjunto informado. */
  async replaceOperatorMachines(operatorId: string, machineIds: string[]) {
    const uniqueIds = [...new Set(machineIds)]
    await prisma.$transaction(async (tx) => {
      await tx.movimentOperatorMachineLink.deleteMany({
        where: { operatorId },
      })
      if (uniqueIds.length === 0) {
        return
      }
      await tx.movimentOperatorMachineLink.createMany({
        data: uniqueIds.map((machineId) => ({ operatorId, machineId })),
      })
    })
    return this.findMany({ operatorId })
  },
}

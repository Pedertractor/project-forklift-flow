import type { Prisma } from '../generated/prisma/client.js'
import { prisma } from '../lib/prisma.js'

const machineListSelect = {
  id: true,
  name: true,
  position: true,
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
  sector: { select: { id: true, typeSector: true, sectorIdAPI: true } },
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

  findManyForList(options?: { sectorId?: string }) {
    return prisma.machine.findMany({
      ...(options?.sectorId !== undefined
        ? { where: { sectorId: options.sectorId } }
        : {}),
      select: machineListSelect,
      orderBy: { name: 'asc' },
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

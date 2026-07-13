import type { Prisma } from '../generated/prisma/client.js'
import { prisma } from '../lib/prisma.js'

export const machineStreetBriefSelect = {
  id: true,
  name: true,
  machineStreetColor: true,
  sectorId: true,
} as const

export const machineStreetRepository = {
  findUniqueById(id: string) {
    return prisma.machineStreet.findUnique({ where: { id } })
  },

  findManyForList(options?: { sectorId?: string }) {
    return prisma.machineStreet.findMany({
      ...(options?.sectorId
        ? { where: { sectorId: options.sectorId } }
        : {}),
      select: {
        id: true,
        name: true,
        machineStreetColor: true,
        sectorId: true,
        createdAt: true,
        updatedAt: true,
        sector: { select: { id: true, typeSector: true } },
        _count: { select: { machines: true } },
      },
      orderBy: { name: 'asc' },
    })
  },

  create(data: Prisma.MachineStreetCreateInput) {
    return prisma.machineStreet.create({
      data,
      select: {
        id: true,
        name: true,
        machineStreetColor: true,
        sectorId: true,
        createdAt: true,
        updatedAt: true,
        sector: { select: { id: true, typeSector: true } },
      },
    })
  },

  update(id: string, data: Prisma.MachineStreetUpdateInput) {
    return prisma.machineStreet.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        machineStreetColor: true,
        sectorId: true,
        createdAt: true,
        updatedAt: true,
        sector: { select: { id: true, typeSector: true } },
      },
    })
  },

  delete(id: string) {
    return prisma.machineStreet.delete({ where: { id } })
  },

  countMachinesByStreetId(machineStreetId: string) {
    return prisma.machine.count({ where: { machineStreetId } })
  },
}

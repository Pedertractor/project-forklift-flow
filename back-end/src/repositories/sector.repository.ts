import type { Prisma } from '../generated/prisma/client.js'
import { prisma } from '../lib/prisma.js'

export const sectorRepository = {
  findUniqueById(id: string) {
    return prisma.sector.findUnique({ where: { id } })
  },

  findManyForList() {
    return prisma.sector.findMany({
      select: {
        id: true,
        typeSector: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { typeSector: 'asc' },
    })
  },

  create(data: Prisma.SectorCreateInput) {
    return prisma.sector.create({ data })
  },

  update(id: string, data: Prisma.SectorUpdateInput) {
    return prisma.sector.update({ where: { id }, data })
  },

  delete(id: string) {
    return prisma.sector.delete({ where: { id } })
  },

  countReferences(sectorId: string) {
    return Promise.all([
      prisma.machine.count({ where: { sectorId } }),
      prisma.user.count({ where: { sectorId } }),
      prisma.forklift.count({ where: { sectorId } }),
      prisma.costCenter.count({ where: { sectorId } }),
    ]).then(([machines, users, forklifts, costCenters]) => {
      return machines + users + forklifts + costCenters
    })
  },
}

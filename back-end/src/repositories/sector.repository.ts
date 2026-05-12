import { prisma } from '../lib/prisma.js'

export const sectorRepository = {
  findUniqueById(id: string) {
    return prisma.sector.findUnique({
      where: { id },
      select: { id: true },
    })
  },

  findManyForList() {
    return prisma.sector.findMany({
      select: {
        id: true,
        sectorIdAPI: true,
        typeSector: true,
      },
      orderBy: { typeSector: 'asc' },
    })
  },
}

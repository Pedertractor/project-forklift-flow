import { prisma } from '../lib/prisma.js'

export const sectorRepository = {
  findUniqueById(id: string) {
    return prisma.sector.findUnique({
      where: { id },
      select: { id: true },
    })
  },
}

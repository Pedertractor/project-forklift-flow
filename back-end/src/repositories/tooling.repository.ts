import type { Prisma } from '../generated/prisma/client.js'
import { prisma } from '../lib/prisma.js'

export const toolingBriefSelect = {
  id: true,
  name: true,
  machineId: true,
  createdAt: true,
  updatedAt: true,
} as const

export const toolingRepository = {
  findUniqueById(id: string) {
    return prisma.tooling.findUnique({
      where: { id },
      select: toolingBriefSelect,
    })
  },

  findManyByMachineId(machineId: string) {
    return prisma.tooling.findMany({
      where: { machineId },
      select: toolingBriefSelect,
      orderBy: { name: 'asc' },
    })
  },

  create(data: Prisma.ToolingCreateInput) {
    return prisma.tooling.create({
      data,
      select: toolingBriefSelect,
    })
  },

  deleteById(id: string) {
    return prisma.tooling.delete({
      where: { id },
      select: toolingBriefSelect,
    })
  },
}

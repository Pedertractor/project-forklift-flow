import type { Prisma } from '../generated/prisma/client.js'
import type {
  IsOperating,
  RoleUser,
  Unit,
} from '../generated/prisma/enums.js'
import { prisma } from '../lib/prisma.js'

export const userRepository = {
  findFirstByCardAndUnit(card: string, unit: Unit) {
    return prisma.user.findFirst({
      where: { card: card.trim(), unit },
      include: {
        sector: { select: { id: true, typeSector: true } },
      },
    })
  },

  findUniqueById(id: string) {
    return prisma.user.findUnique({ where: { id } })
  },

  findUniqueByIdWithSector(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: { sector: true },
    })
  },

  findProfileById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        role: true,
        card: true,
        unit: true,
        employeeId: true,
        isLogged: true,
        sectorId: true,
        isOperating: true,
        sector: { select: { id: true, typeSector: true } },
      },
    })
  },

  updateOperatingMode(userId: string, isOperating: IsOperating | null) {
    return prisma.user.update({
      where: { id: userId },
      data: { isOperating },
      select: {
        id: true,
        name: true,
        role: true,
        isOperating: true,
        sectorId: true,
        sector: { select: { id: true, typeSector: true } },
      },
    })
  },

  findManyOperatingTransportInSector(sectorId: string) {
    return prisma.user.findMany({
      where: {
        sectorId,
        isOperating: { not: null },
      },
      select: {
        id: true,
        name: true,
        card: true,
        unit: true,
        role: true,
        sectorId: true,
        isOperating: true,
        createdAt: true,
        updatedAt: true,
        sector: { select: { id: true, typeSector: true } },
      },
      orderBy: { name: 'asc' },
    })
  },

  findManyForList(options?: { role?: RoleUser; sectorId?: string }) {
    const where: Prisma.UserWhereInput = {}
    if (options?.role !== undefined) {
      where.role = options.role
    }
    if (options?.sectorId !== undefined) {
      where.sectorId = options.sectorId
    }
    return prisma.user.findMany({
      ...(Object.keys(where).length > 0 ? { where } : {}),
      select: {
        id: true,
        name: true,
        role: true,
        card: true,
        unit: true,
        employeeId: true,
        isLogged: true,
        sectorId: true,
        sector: {
          select: {
            id: true,
            typeSector: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { name: 'asc' },
    })
  },

  create(data: Prisma.UserCreateInput) {
    return prisma.user.create({ data })
  },

  update(id: string, data: Prisma.UserUpdateInput) {
    return prisma.user.update({ where: { id }, data })
  },
}

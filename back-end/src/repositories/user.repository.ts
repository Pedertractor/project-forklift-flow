import type { Prisma } from '../generated/prisma/client.js'
import type { RoleUser, Unit } from '../generated/prisma/enums.js'
import { prisma } from '../lib/prisma.js'

export const userRepository = {
  findFirstByCardAndUnit(card: string, unit: Unit) {
    return prisma.user.findFirst({
      where: { card: card.trim(), unit },
    })
  },

  findUniqueById(id: string) {
    return prisma.user.findUnique({ where: { id } })
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
      },
    })
  },

  findManyForList(options?: { role?: RoleUser }) {
    return prisma.user.findMany({
      ...(options?.role !== undefined ? { where: { role: options.role } } : {}),
      select: {
        id: true,
        name: true,
        role: true,
        card: true,
        unit: true,
        employeeId: true,
        isLogged: true,
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

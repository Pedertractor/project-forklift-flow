import type { Prisma } from '../generated/prisma/client.js'
import { prisma } from '../lib/prisma.js'

export const typeMachineRepository = {
  findUniqueById(id: string) {
    return prisma.typeMachine.findUnique({ where: { id } })
  },

  findManyForList() {
    return prisma.typeMachine.findMany({
      select: {
        id: true,
        name: true,
        urlImage: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { name: 'asc' },
    })
  },

  create(data: Prisma.TypeMachineCreateInput) {
    return prisma.typeMachine.create({ data })
  },

  update(id: string, data: Prisma.TypeMachineUpdateInput) {
    return prisma.typeMachine.update({ where: { id }, data })
  },

  delete(id: string) {
    return prisma.typeMachine.delete({ where: { id } })
  },

  countMachinesByTypeId(typeMachineId: string) {
    return prisma.machine.count({ where: { typeMachineId } })
  },
}

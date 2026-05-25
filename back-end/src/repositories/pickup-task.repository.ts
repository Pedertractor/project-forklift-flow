import type { Prisma } from '../generated/prisma/client.js'
// Prisma used for WhereInput in countIncompleteAssignedToPallet
import {
  MachineTaskStatus,
  TypeMovimentPallet,
} from '../generated/prisma/enums.js'
import { openMachineTaskStatuses } from '../constants/machine-task-status.js'
import { prisma } from '../lib/prisma.js'
import {
  openPoolTypesForEquipment,
  type EquipmentMovimentType,
} from '../utils/replenishment-moviment-type.js'
import { deliveryTaskListInclude } from './delivery-task.repository.js'

const machineBriefInclude = {
  id: true,
  name: true,
  position: true,
  userId: true,
  sectorId: true,
  typeMachine: { select: { id: true, name: true } },
  sector: { select: { id: true, typeSector: true } },
} as const

export const pickupTaskListInclude = {
  machine: { select: machineBriefInclude },
  requestedBy: {
    select: {
      id: true,
      name: true,
      employeeId: true,
      card: true,
      unit: true,
      role: true,
    },
  },
  assignedMovimentPallet: {
    select: { id: true, code: true, type: true },
  },
} as const

export type PickupTaskListRow = Prisma.PickupTaskGetPayload<{
  include: typeof pickupTaskListInclude
}>

export const pickupTaskRepository = {
  findById(id: string) {
    return prisma.pickupTask.findUnique({
      where: { id },
      include: pickupTaskListInclude,
    })
  },

  create(data: Prisma.PickupTaskCreateInput) {
    return prisma.pickupTask.create({
      data,
      include: pickupTaskListInclude,
    })
  },

  update(id: string, data: Prisma.PickupTaskUpdateInput) {
    return prisma.pickupTask.update({
      where: { id },
      data,
      include: pickupTaskListInclude,
    })
  },

  findOpenForMachine(machineId: string) {
    return prisma.pickupTask.findFirst({
      where: {
        machineId,
        status: { in: openMachineTaskStatuses },
      },
      include: pickupTaskListInclude,
      orderBy: { createdAt: 'desc' },
    })
  },

  /** Retirada + abastecimento em aberto na maquina (candidata a sugestao de viagem). */
  findFirstOpenWithReplenishmentForMachine(machineId: string) {
    return prisma.pickupTask.findFirst({
      where: {
        machineId,
        triggersReplenishment: true,
        status: { in: openMachineTaskStatuses },
      },
      include: pickupTaskListInclude,
      orderBy: { createdAt: 'asc' },
    })
  },

  findManyForMachine(machineId: string) {
    return prisma.pickupTask.findMany({
      where: { machineId },
      include: pickupTaskListInclude,
      orderBy: { createdAt: 'desc' },
    })
  },

  findManyOpenPickupForSectorAndMovimentType(
    sectorId: string,
    equipmentType: EquipmentMovimentType,
  ) {
    return prisma.pickupTask.findMany({
      where: {
        machine: { sectorId },
        status: { in: openMachineTaskStatuses },
        typeMovimentPallet: { in: openPoolTypesForEquipment(equipmentType) },
      },
      include: pickupTaskListInclude,
      orderBy: [{ isCritical: 'desc' }, { createdAt: 'asc' }],
    })
  },

  findManyForAssignedPallet(palletId: string) {
    return prisma.pickupTask.findMany({
      where: { assignedMovimentPalletId: palletId },
      include: pickupTaskListInclude,
      orderBy: { createdAt: 'desc' },
    })
  },

  countIncompleteAssignedToPallet(palletId: string, excludeIds: string[] = []) {
    const where: Prisma.PickupTaskWhereInput = {
      assignedMovimentPalletId: palletId,
      status: { in: openMachineTaskStatuses },
    }
    if (excludeIds.length > 0) {
      where.id = { notIn: excludeIds }
    }
    return prisma.pickupTask.count({ where })
  },

  /** Retirada em aberto na maquina com pedido de reposicao (sugestao de viagem). */
  findManyOpenWithReplenishmentForSector(
    sectorId: string,
    equipmentType: EquipmentMovimentType,
  ) {
    return prisma.pickupTask.findMany({
      where: {
        machine: { sectorId },
        triggersReplenishment: true,
        status: { in: openMachineTaskStatuses },
        typeMovimentPallet: { in: openPoolTypesForEquipment(equipmentType) },
      },
      include: pickupTaskListInclude,
      orderBy: { createdAt: 'asc' },
    });
  },
}

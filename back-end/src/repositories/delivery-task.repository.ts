import type { Prisma } from '../generated/prisma/client.js'
import {
  MachineTaskStatus,
  MovimentPalletEquipmentType,
  TypeMovimentPallet,
} from '../generated/prisma/enums.js'
import { openMachineTaskStatuses } from '../constants/machine-task-status.js'
import { prisma } from '../lib/prisma.js'
import {
  openPoolTypesForEquipment,
  type EquipmentMovimentType,
} from '../utils/replenishment-moviment-type.js'

const machineBriefInclude = {
  id: true,
  name: true,
  position: true,
  userId: true,
  sectorId: true,
  typeMachine: { select: { id: true, name: true } },
  sector: { select: { id: true, typeSector: true } },
} as const

export const deliveryTaskListInclude = {
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

export type DeliveryTaskListRow = Prisma.DeliveryTaskGetPayload<{
  include: typeof deliveryTaskListInclude
}>

export const deliveryTaskRepository = {
  findById(id: string) {
    return prisma.deliveryTask.findUnique({
      where: { id },
      include: deliveryTaskListInclude,
    })
  },

  create(data: Prisma.DeliveryTaskCreateInput) {
    return prisma.deliveryTask.create({
      data,
      include: deliveryTaskListInclude,
    })
  },

  createWithClient(tx: Prisma.TransactionClient, data: Prisma.DeliveryTaskCreateInput) {
    return tx.deliveryTask.create({
      data,
      include: deliveryTaskListInclude,
    })
  },

  update(id: string, data: Prisma.DeliveryTaskUpdateInput) {
    return prisma.deliveryTask.update({
      where: { id },
      data,
      include: deliveryTaskListInclude,
    })
  },

  findManyForMachine(machineId: string) {
    return prisma.deliveryTask.findMany({
      where: { machineId },
      include: deliveryTaskListInclude,
      orderBy: { createdAt: 'desc' },
    })
  },

  /** Fila aberta: aceito pelo supply, pallet pronto, sem equipamento atribuido. */
  findManyOpenPoolForSectorAndMovimentType(
    sectorId: string,
    equipmentType: EquipmentMovimentType,
  ) {
    return prisma.deliveryTask.findMany({
      where: {
        machine: { sectorId },
        status: MachineTaskStatus.CREATED,
        acceptedBySupply: true,
        preparedAt: { not: null },
        typeMovimentPallet: { in: openPoolTypesForEquipment(equipmentType) },
        assignedMovimentPalletId: null,
      },
      include: deliveryTaskListInclude,
      orderBy: [{ isCritical: 'desc' }, { createdAt: 'asc' }],
    })
  },

  findOpenPreparedForMachine(machineId: string) {
    return prisma.deliveryTask.findFirst({
      where: {
        machineId,
        status: MachineTaskStatus.CREATED,
        acceptedBySupply: true,
        preparedAt: { not: null },
        assignedMovimentPalletId: null,
      },
      include: deliveryTaskListInclude,
      orderBy: { createdAt: 'asc' },
    })
  },

  findLatestCompletedForMachine(machineId: string) {
    return prisma.deliveryTask.findFirst({
      where: {
        machineId,
        status: MachineTaskStatus.COMPLETED,
      },
      orderBy: { completedAt: 'desc' },
    })
  },

  findManyOpenDeliverForSectorAndMovimentType(
    sectorId: string,
    equipmentType: EquipmentMovimentType,
  ) {
    return prisma.deliveryTask.findMany({
      where: {
        machine: { sectorId },
        status: { in: openMachineTaskStatuses },
        typeMovimentPallet: { in: openPoolTypesForEquipment(equipmentType) },
      },
      include: deliveryTaskListInclude,
      orderBy: [{ isCritical: 'desc' }, { createdAt: 'asc' }],
    })
  },

  findManyForAssignedPallet(palletId: string) {
    return prisma.deliveryTask.findMany({
      where: { assignedMovimentPalletId: palletId },
      include: deliveryTaskListInclude,
      orderBy: { createdAt: 'desc' },
    })
  },

  countIncompleteAssignedToPallet(palletId: string, excludeIds: string[] = []) {
    const where: Prisma.DeliveryTaskWhereInput = {
      assignedMovimentPalletId: palletId,
      status: { in: openMachineTaskStatuses },
    }
    if (excludeIds.length > 0) {
      where.id = { notIn: excludeIds }
    }
    return prisma.deliveryTask.count({ where })
  },
}

import type { Prisma } from '../generated/prisma/client.js'
import {
  IsOperating,
  MachineTaskStatus,
  TypeMovimentPallet,
} from '../generated/prisma/enums.js'
import { openMachineTaskStatuses } from '../constants/machine-task-status.js'
import { prisma } from '../lib/prisma.js'
import { openPoolTypesForOperatingMode } from '../utils/replenishment-moviment-type.js'

const machineBriefInclude = {
  id: true,
  name: true,
  userId: true,
  sectorId: true,
  productionStatus: true,
  assetNumber: true,
  pillar: true,
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
  assignedOperator: {
    select: { id: true, name: true, isOperating: true },
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

  findManyOpenPoolForSectorAndOperatingMode(
    sectorId: string | null | undefined,
    operatingMode: IsOperating,
  ) {
    return prisma.deliveryTask.findMany({
      where: {
        ...(sectorId ? { machine: { sectorId } } : {}),
        status: MachineTaskStatus.CREATED,
        acceptedBySupply: true,
        preparedAt: { not: null },
        typeMovimentPallet: { in: openPoolTypesForOperatingMode(operatingMode) },
        assignedOperatorId: null,
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
        assignedOperatorId: null,
      },
      include: deliveryTaskListInclude,
      orderBy: { createdAt: 'asc' },
    })
  },

  findMachineIdsWithOpenPreparedDelivery(machineIds: string[]) {
    if (machineIds.length === 0) {
      return Promise.resolve([] as string[])
    }
    return prisma.deliveryTask
      .findMany({
        where: {
          machineId: { in: machineIds },
          status: MachineTaskStatus.CREATED,
          acceptedBySupply: true,
          preparedAt: { not: null },
          assignedOperatorId: null,
        },
        select: { machineId: true },
        distinct: ['machineId'],
      })
      .then((rows) => rows.map((r) => r.machineId))
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

  /** Qualquer entrega em aberto (pallet a caminho): registrada, em preparo ou em rota. */
  findFirstOpenForMachine(machineId: string) {
    return prisma.deliveryTask.findFirst({
      where: {
        machineId,
        status: { in: openMachineTaskStatuses },
      },
      orderBy: { createdAt: 'desc' },
    })
  },

  findManyOpenDeliverForSectorAndOperatingMode(
    sectorId: string | null | undefined,
    operatingMode: IsOperating,
  ) {
    return prisma.deliveryTask.findMany({
      where: {
        ...(sectorId ? { machine: { sectorId } } : {}),
        status: { in: openMachineTaskStatuses },
        typeMovimentPallet: { in: openPoolTypesForOperatingMode(operatingMode) },
      },
      include: deliveryTaskListInclude,
      orderBy: [{ isCritical: 'desc' }, { createdAt: 'asc' }],
    })
  },

  findManyForAssignedOperator(operatorUserId: string) {
    return prisma.deliveryTask.findMany({
      where: { assignedOperatorId: operatorUserId },
      include: deliveryTaskListInclude,
      orderBy: { createdAt: 'desc' },
    })
  },

  countIncompleteAssignedToOperator(
    operatorUserId: string,
    excludeIds: string[] = [],
  ) {
    const where: Prisma.DeliveryTaskWhereInput = {
      assignedOperatorId: operatorUserId,
      status: { in: openMachineTaskStatuses },
    }
    if (excludeIds.length > 0) {
      where.id = { notIn: excludeIds }
    }
    return prisma.deliveryTask.count({ where })
  },
}

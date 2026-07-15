import type { Prisma } from '../generated/prisma/client.js'
import { IsOperating } from '../generated/prisma/enums.js'
import { openMachineTaskStatuses } from '../constants/machine-task-status.js'
import { prisma } from '../lib/prisma.js'
import { openPoolTypesForOperatingMode } from '../utils/replenishment-moviment-type.js'
import { deliveryTaskListInclude } from './delivery-task.repository.js'
import { machineStreetBriefSelect } from './machine-street.repository.js'

const machineBriefInclude = {
  id: true,
  name: true,
  userId: true,
  sectorId: true,
  assetNumber: true,
  pillar: true,
  typeMachine: { select: { id: true, name: true } },
  sector: { select: { id: true, typeSector: true } },
  machineStreet: { select: machineStreetBriefSelect },
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
  assignedOperator: {
    select: { id: true, name: true, isOperating: true },
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

  /**
   * 1ª retirada aberta da máquina ainda sem vínculo com nenhum aviso de
   * abastecimento (mais antiga primeiro). Usada quando um NOVO aviso é
   * criado depois de uma retirada avulsa já solicitada — amarra os dois
   * (retirada + abastecimento sequenciais, nenhum ainda acatado pelo
   * transporte é exigido; ver `pickup-supply-link.service.ts`).
   */
  findFirstOpenUnlinkedForMachine(machineId: string) {
    return prisma.pickupTask.findFirst({
      where: {
        machineId,
        status: { in: openMachineTaskStatuses },
        linkedSupplyRequestId: null,
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

  findManyOpenPickupForSectorAndOperatingMode(
    sectorId: string | null | undefined,
    operatingMode: IsOperating,
  ) {
    return prisma.pickupTask.findMany({
      where: {
        ...(sectorId ? { machine: { sectorId } } : {}),
        status: { in: openMachineTaskStatuses },
        typeMovimentPallet: { in: openPoolTypesForOperatingMode(operatingMode) },
      },
      include: pickupTaskListInclude,
      orderBy: [{ isCritical: 'desc' }, { createdAt: 'asc' }],
    })
  },

  findManyForAssignedOperator(operatorUserId: string) {
    return prisma.pickupTask.findMany({
      where: { assignedOperatorId: operatorUserId },
      include: pickupTaskListInclude,
      orderBy: { createdAt: 'desc' },
    })
  },

  countIncompleteAssignedToOperator(
    operatorUserId: string,
    excludeIds: string[] = [],
  ) {
    const where: Prisma.PickupTaskWhereInput = {
      assignedOperatorId: operatorUserId,
      status: { in: openMachineTaskStatuses },
    }
    if (excludeIds.length > 0) {
      where.id = { notIn: excludeIds }
    }
    return prisma.pickupTask.count({ where })
  },

  /**
   * Retirada aberta amarrada a um aviso de abastecimento (continuum
   * "Entrega + Retirada") — usada para resolver a sugestão de viagem sem
   * heurística: no máximo uma por máquina (vínculo único no banco).
   */
  findFirstOpenLinkedForMachine(machineId: string) {
    return prisma.pickupTask.findFirst({
      where: {
        machineId,
        linkedSupplyRequestId: { not: null },
        status: { in: openMachineTaskStatuses },
      },
      include: pickupTaskListInclude,
      orderBy: { createdAt: 'asc' },
    })
  },

  findManyOpenLinkedForSector(sectorId: string, operatingMode: IsOperating) {
    return prisma.pickupTask.findMany({
      where: {
        machine: { sectorId },
        linkedSupplyRequestId: { not: null },
        status: { in: openMachineTaskStatuses },
        typeMovimentPallet: { in: openPoolTypesForOperatingMode(operatingMode) },
      },
      include: pickupTaskListInclude,
      orderBy: { createdAt: 'asc' },
    })
  },
}

import type { Prisma } from '../generated/prisma/client.js'
import type { TypeMovimentPallet } from '../generated/prisma/enums.js'
import {
  ForkliftTaskStatus,
  ForkliftTaskType,
  RequestStatus,
} from '../generated/prisma/enums.js'
import { prisma } from '../lib/prisma.js'

const requestBriefInclude = {
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
  destination: {
    select: {
      id: true,
      name: true,
      position: true,
      userId: true,
      typeMachine: { select: { id: true, name: true } },
      sector: { select: { id: true, typeSector: true } },
    },
  },
  _count: { select: { movimentPalletTasks: true } },
} as const

const taskWithRequestInclude = {
  request: { include: requestBriefInclude },
  assignedMovimentPallet: {
    select: { id: true, code: true, type: true },
  },
} as const

const openPickupStatuses: ForkliftTaskStatus[] = [
  ForkliftTaskStatus.CREATED,
  ForkliftTaskStatus.ASSIGNED,
  ForkliftTaskStatus.IN_PROGRESS,
]

const openDeliverStatuses: ForkliftTaskStatus[] = [
  ForkliftTaskStatus.CREATED,
  ForkliftTaskStatus.ASSIGNED,
  ForkliftTaskStatus.IN_PROGRESS,
]

const movimentPalletTaskPickupSelect = {
  id: true,
  requestId: true,
  type: true,
  status: true,
  assignedMovimentPalletId: true,
  requestedById: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
} as const

export const movimentPalletTaskRepository = {
  findByIdWithRequest(id: string) {
    return prisma.movimentPalletTask.findUnique({
      where: { id },
      include: taskWithRequestInclude,
    })
  },

  findManyForAssignedPallet(palletId: string) {
    return prisma.movimentPalletTask.findMany({
      where: { assignedMovimentPalletId: palletId },
      include: taskWithRequestInclude,
      orderBy: { createdAt: 'desc' },
    })
  },

  findOpenPickupForRequest(requestId: string) {
    return prisma.movimentPalletTask.findFirst({
      where: {
        requestId,
        type: ForkliftTaskType.PICKUP_TO_EXPEDITION,
        status: { in: openPickupStatuses },
      },
      select: movimentPalletTaskPickupSelect,
    })
  },

  createPickupForRequest(requestId: string, requestedById: string) {
    const data: Prisma.MovimentPalletTaskCreateInput = {
      type: ForkliftTaskType.PICKUP_TO_EXPEDITION,
      status: ForkliftTaskStatus.CREATED,
      request: { connect: { id: requestId } },
      requestedBy: { connect: { id: requestedById } },
    }
    return prisma.movimentPalletTask.create({
      data,
      select: movimentPalletTaskPickupSelect,
    })
  },

  /** Pickups em aberto no setor (ex.: apos operador de maquina pedir retirada). */
  findManyOpenPickupTasksForSectorAndMovimentType(
    sectorId: string,
    typeMovimentPallet: TypeMovimentPallet,
  ) {
    return prisma.movimentPalletTask.findMany({
      where: {
        type: ForkliftTaskType.PICKUP_TO_EXPEDITION,
        status: { in: openPickupStatuses },
        request: {
          typeMovimentPallet,
          status: RequestStatus.ON_MACHINE,
          destination: { sectorId },
        },
      },
      include: taskWithRequestInclude,
      orderBy: { createdAt: 'asc' },
    })
  },

  /** Entregas em aberto no setor (pallet no recebimento / em rota para a maquina). */
  findManyOpenDeliverTasksForSectorAndMovimentType(
    sectorId: string,
    typeMovimentPallet: TypeMovimentPallet,
  ) {
    return prisma.movimentPalletTask.findMany({
      where: {
        type: ForkliftTaskType.DELIVER_TO_MACHINE,
        status: { in: openDeliverStatuses },
        request: {
          typeMovimentPallet,
          destination: { sectorId },
        },
      },
      include: taskWithRequestInclude,
      orderBy: { createdAt: 'asc' },
    })
  },
}

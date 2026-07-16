import type { Prisma } from '../generated/prisma/client.js'
import {
  MachineTaskStatus,
  OperatorMachineSupplyRequestStatus,
} from '../generated/prisma/enums.js'
import { openMachineTaskStatuses } from '../constants/machine-task-status.js'
import { prisma } from '../lib/prisma.js'

export const operatorMachineSupplyRequestListInclude = {
  machine: {
    select: {
      id: true,
      name: true,
      sectorId: true,
      assetNumber: true,
      pillar: true,
      typeMachine: { select: { id: true, name: true, urlImage: true } },
      machineStreet: {
        select: { id: true, name: true, machineStreetColor: true },
      },
      tooling: {
        select: { id: true, name: true },
        orderBy: { name: 'asc' as const },
      },
    },
  },
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
  deliveryTask: {
    select: {
      id: true,
      movementCube: true,
      status: true,
      acceptedBySupply: true,
      preparedAt: true,
      isCritical: true,
    },
  },
  tooling: {
    select: { id: true, name: true },
  },
} as const

export type OperatorMachineSupplyRequestListRow =
  Prisma.OperatorMachineSupplyRequestGetPayload<{
    include: typeof operatorMachineSupplyRequestListInclude
  }>

/** Aviso sem retirada ativa amarrada (cancelada/concluída não bloqueia re-vínculo). */
function unclaimedLinkedPickupWhere(): Prisma.OperatorMachineSupplyRequestWhereInput {
  return {
    OR: [
      { linkedPickupTask: null },
      {
        linkedPickupTask: {
          status: {
            in: [MachineTaskStatus.CANCELED, MachineTaskStatus.COMPLETED],
          },
        },
      },
    ],
  }
}

/** OPEN ou FULFILLED com entrega ainda em aberto. */
function eligibleSupplyStatusWhere(): Prisma.OperatorMachineSupplyRequestWhereInput {
  return {
    OR: [
      { status: OperatorMachineSupplyRequestStatus.OPEN },
      {
        status: OperatorMachineSupplyRequestStatus.FULFILLED,
        deliveryTask: { status: { in: openMachineTaskStatuses } },
      },
    ],
  }
}

function eligibleUnclaimedSupplyWhere(
  extra?: Prisma.OperatorMachineSupplyRequestWhereInput,
): Prisma.OperatorMachineSupplyRequestWhereInput {
  return {
    ...extra,
    AND: [unclaimedLinkedPickupWhere(), eligibleSupplyStatusWhere()],
  }
}

export const operatorMachineSupplyRequestRepository = {
  create(data: Prisma.OperatorMachineSupplyRequestCreateInput) {
    return prisma.operatorMachineSupplyRequest.create({
      data,
      include: operatorMachineSupplyRequestListInclude,
    })
  },

  findFirstOpenByMachineId(machineId: string) {
    return prisma.operatorMachineSupplyRequest.findFirst({
      where: { machineId, status: OperatorMachineSupplyRequestStatus.OPEN },
      include: operatorMachineSupplyRequestListInclude,
      orderBy: { createdAt: 'desc' },
    })
  },

  /**
   * Aviso ainda elegível para amarrar uma retirada (continuum "Entrega +
   * Retirada"): OPEN (abastecimento ainda não montou o pallet) OU FULFILLED
   * com entrega ainda em aberto (não CANCELED/COMPLETED) — e sem retirada já
   * vinculada (`linkedPickupTask`), já que o vínculo é único por aviso.
   * Mais antigo primeiro: several avisos nunca coexistem OPEN na mesma
   * máquina, mas o FULFILLED anterior pode ainda estar em aberto.
   */
  findFirstEligibleUnclaimedForMachine(machineId: string) {
    return prisma.operatorMachineSupplyRequest.findFirst({
      where: eligibleUnclaimedSupplyWhere({ machineId }),
      include: operatorMachineSupplyRequestListInclude,
      orderBy: { createdAt: 'asc' },
    })
  },

  findEligibleUnclaimedByDeliveryTaskId(deliveryTaskId: string) {
    return prisma.operatorMachineSupplyRequest.findFirst({
      where: eligibleUnclaimedSupplyWhere({ deliveryTaskId }),
      include: operatorMachineSupplyRequestListInclude,
    })
  },

  /**
   * Entrega criada pelo abastecimento sem aviso prévio do operador: materializa
   * um aviso FULFILLED para permitir amarração explícita da retirada.
   */
  async ensureFulfilledForOrphanDelivery(input: {
    deliveryTaskId: string
    machineId: string
    requestedById: string
  }): Promise<OperatorMachineSupplyRequestListRow | null> {
    const existing = await prisma.operatorMachineSupplyRequest.findUnique({
      where: { deliveryTaskId: input.deliveryTaskId },
      include: operatorMachineSupplyRequestListInclude,
    })
    if (existing) {
      const claimedByOpenPickup = await prisma.pickupTask.findFirst({
        where: {
          linkedSupplyRequestId: existing.id,
          status: { in: openMachineTaskStatuses },
        },
        select: { id: true },
      })
      if (claimedByOpenPickup) {
        return null
      }
      return existing
    }

    const machine = await prisma.machine.findUnique({
      where: { id: input.machineId },
      select: { userId: true },
    })
    const requestedById = machine?.userId ?? input.requestedById
    const now = new Date()

    return prisma.operatorMachineSupplyRequest.create({
      data: {
        machine: { connect: { id: input.machineId } },
        requestedBy: { connect: { id: requestedById } },
        status: OperatorMachineSupplyRequestStatus.FULFILLED,
        fulfilledAt: now,
        deliveryTask: { connect: { id: input.deliveryTaskId } },
      },
      include: operatorMachineSupplyRequestListInclude,
    })
  },

  findManyForOperatorMachine(
    operatorUserId: string,
    filters?: { status?: OperatorMachineSupplyRequestStatus },
  ) {
    const where: Prisma.OperatorMachineSupplyRequestWhereInput = {
      machine: { userId: operatorUserId },
    }
    if (filters?.status !== undefined) {
      where.status = filters.status
    }
    return prisma.operatorMachineSupplyRequest.findMany({
      where,
      include: operatorMachineSupplyRequestListInclude,
      orderBy: { createdAt: 'desc' },
    })
  },

  findManyOpenForSector(sectorId: string) {
    return prisma.operatorMachineSupplyRequest.findMany({
      where: {
        status: OperatorMachineSupplyRequestStatus.OPEN,
        machine: { sectorId },
      },
      include: operatorMachineSupplyRequestListInclude,
      orderBy: [{ machine: { name: 'asc' } }, { createdAt: 'asc' }],
    })
  },

  findManyOpenAll() {
    return prisma.operatorMachineSupplyRequest.findMany({
      where: {
        status: OperatorMachineSupplyRequestStatus.OPEN,
      },
      include: operatorMachineSupplyRequestListInclude,
      orderBy: [{ machine: { name: 'asc' } }, { createdAt: 'asc' }],
    })
  },

  fulfillOpenForMachine(
    machineId: string,
    deliveryTaskId: string,
    tx: Prisma.TransactionClient,
  ) {
    const now = new Date()
    return tx.operatorMachineSupplyRequest.updateMany({
      where: {
        machineId,
        status: OperatorMachineSupplyRequestStatus.OPEN,
      },
      data: {
        status: OperatorMachineSupplyRequestStatus.FULFILLED,
        fulfilledAt: now,
        deliveryTaskId,
      },
    })
  },
}

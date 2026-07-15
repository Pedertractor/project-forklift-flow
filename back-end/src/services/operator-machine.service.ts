import {
  MachineTaskStatus,
  MovimentPalletTripSuggestionStatus,
  OperatorMachineSupplyRequestStatus,
  TypeMovimentPallet,
} from '../generated/prisma/enums.js'
import {
  MachineNotFoundError,
  MachineNotInOperatorSectorError,
  OperatorRequestBlockedByPalletAtReceivingError,
  OperatorMachineNotBoundError,
  OperatorSupplyRequestAlreadyOpenError,
  OperatorWithoutSectorError,
  PickupTaskCannotBeCanceledError,
  PickupTaskNotFoundError,
  PickupTaskNotOnOperatorMachineError,
  ToolingMachineMismatchError,
  ToolingNotFoundError,
} from '../errors/domain-errors.js'
import { deliveryTaskRepository } from '../repositories/delivery-task.repository.js'
import { pickupTaskRepository } from '../repositories/pickup-task.repository.js'
import {
  operatorMachineSupplyRequestRepository,
  operatorMachineSupplyRequestListInclude,
} from '../repositories/operator-machine-supply-request.repository.js'
import { machineRepository } from '../repositories/machine.repository.js'
import { toolingRepository } from '../repositories/tooling.repository.js'
import { userRepository } from '../repositories/user.repository.js'
import { prisma } from '../lib/prisma.js'
import {
  linkNewPickupToEligibleSupplyRequest,
  linkNewSupplyRequestToEligiblePickup,
  type PickupSupplyLinkResult,
} from './pickup-supply-link.service.js'
import {
  operatorMovimentPalletWsBroadcastMachineOperatorUpdated,
  operatorMovimentPalletWsBroadcastMachineToolingUpdated,
  operatorMovimentPalletWsBroadcastOperatorSupplyRequestCreated,
  operatorMovimentPalletWsBroadcastQueueUpdated,
  operatorMovimentPalletWsBroadcastTripSuggestionsUpdated,
  operatorMovimentPalletWsNotifyDeliveryTaskChange,
  operatorMovimentPalletWsNotifyPickupTaskChange,
} from '../ws/operator-moviment-pallet-ws.hub.js'
import type { Prisma } from '../generated/prisma/client.js'
import { deliveryTaskListInclude } from '../repositories/delivery-task.repository.js'
import { isAdminOrSuperAdmin } from '../utils/role-user.js'

export async function bindOperatorToMachine(
  operatorUserId: string,
  machineId: string,
) {
  const user = await userRepository.findUniqueByIdWithSector(operatorUserId)
  if (!user) {
    throw new OperatorWithoutSectorError()
  }
  const crossSector = isAdminOrSuperAdmin(user.role)
  if (!crossSector && !user.sectorId) {
    throw new OperatorWithoutSectorError()
  }

  const targetMachine = await machineRepository.findUniqueById(machineId)
  if (!targetMachine) {
    throw new MachineNotFoundError()
  }
  if (!crossSector && targetMachine.sectorId !== user.sectorId) {
    throw new MachineNotInOperatorSectorError()
  }

  const previouslyBound = await prisma.machine.findMany({
    where: { userId: operatorUserId },
    select: { id: true, sectorId: true },
  })

  const machine = await machineRepository.assignOperatorExclusive(
    machineId,
    operatorUserId,
  )

  for (const row of previouslyBound) {
    if (row.id === machineId) {
      continue
    }
    operatorMovimentPalletWsBroadcastMachineOperatorUpdated({
      machineId: row.id,
      sectorId: row.sectorId,
      operatorUserId: null,
      affectedUserId: operatorUserId,
    })
  }

  operatorMovimentPalletWsBroadcastMachineOperatorUpdated({
    machineId: machine.id,
    sectorId: machine.sectorId,
    operatorUserId: machine.userId ?? null,
    affectedUserId: operatorUserId,
  })

  return machine
}

export async function unbindOperatorFromMachines(operatorUserId: string) {
  const bound = await prisma.machine.findMany({
    where: { userId: operatorUserId },
    select: { id: true, sectorId: true },
  })
  await machineRepository.disconnectOperatorFromAllMachines(operatorUserId)
  for (const row of bound) {
    operatorMovimentPalletWsBroadcastMachineOperatorUpdated({
      machineId: row.id,
      sectorId: row.sectorId,
      operatorUserId: null,
      affectedUserId: operatorUserId,
    })
  }
}

export async function getOperatorCurrentMachine(operatorUserId: string) {
  return machineRepository.findFirstByOperatorUserId(operatorUserId)
}

export async function listMachinesForOperatorPicker(operatorUserId: string) {
  const user = await userRepository.findUniqueByIdWithSector(operatorUserId)
  if (!user) {
    return []
  }
  if (isAdminOrSuperAdmin(user.role)) {
    return machineRepository.findManyForList()
  }
  if (!user.sectorId) {
    return []
  }
  return machineRepository.findManyForList({ sectorId: user.sectorId })
}

export async function listMachineTasksForOperator(operatorUserId: string) {
  const machine = await machineRepository.findFirstByOperatorUserId(operatorUserId)
  if (!machine) {
    return { deliveryTasks: [], pickupTasks: [], openSupply: null }
  }

  const [deliveryTasks, pickupTasks, openSupply] = await Promise.all([
    deliveryTaskRepository.findManyForMachine(machine.id),
    pickupTaskRepository.findManyForMachine(machine.id),
    operatorMachineSupplyRequestRepository.findFirstOpenByMachineId(machine.id),
  ])

  return { deliveryTasks, pickupTasks, openSupply }
}

export async function listOperatorSupplyRequestsForOperatorMachine(
  operatorUserId: string,
  filters?: { status?: OperatorMachineSupplyRequestStatus },
) {
  return operatorMachineSupplyRequestRepository.findManyForOperatorMachine(
    operatorUserId,
    filters,
  )
}

async function resolveTypeForMachine(machineId: string): Promise<TypeMovimentPallet> {
  const latestDelivery = await prisma.deliveryTask.findFirst({
    where: { machineId },
    orderBy: { createdAt: 'desc' },
    select: { typeMovimentPallet: true },
  })
  return latestDelivery?.typeMovimentPallet ?? TypeMovimentPallet.FORKLIFT
}

async function findPalletAtReceivingForMachine(machineId: string) {
  return deliveryTaskRepository.findOpenPreparedForMachine(machineId)
}

/**
 * Bloqueia novo aviso de abastecimento enquanto houver DeliveryTask em aberto
 * para a máquina (no recebimento, em preparo ou a caminho). Só libera após
 * COMPLETED (pallet entregue na máquina) ou CANCELED.
 */
async function assertNoPalletAtReceivingForSupplyRequest(machineId: string) {
  const incomingDelivery =
    await deliveryTaskRepository.findFirstOpenForMachine(machineId)
  if (incomingDelivery) {
    throw new OperatorRequestBlockedByPalletAtReceivingError()
  }
}

/**
 * Após um vínculo ser gravado (por `pickup-supply-link.service.ts`), notifica
 * o empilhadeirista responsável quando aplicável e atualiza os broadcasts de
 * fila/sugestão de viagem do setor. Fonte única desse pós-processamento —
 * usada nos três pontos em que um vínculo novo pode se formar (retirada nova
 * encontra abastecimento elegível, abastecimento novo encontra retirada
 * elegível, ou o ramo "abastecimento já existente" do pedido combinado).
 */
/**
 * Vincula retirada a entrega/abastecimento e notifica observadores.
 * Sempre reemite `pickup_task_updated` após o vínculo (TV/operador precisam
 * do `linkedSupplyRequestId` sem esperar o próximo poll).
 */
async function applyLinkOutcome(
  linkResult: PickupSupplyLinkResult,
  sectorId: string | null | undefined,
  machineName: string,
) {
  if (!linkResult.linked || !linkResult.pickupTaskId) {
    return
  }

  const pickup = await pickupTaskRepository.findById(linkResult.pickupTaskId)
  if (!pickup) {
    return
  }

  if (pickup.machine) {
    operatorMovimentPalletWsNotifyPickupTaskChange({
      id: pickup.id,
      status: pickup.status,
      typeMovimentPallet: pickup.typeMovimentPallet,
      machine: pickup.machine,
      ...(linkResult.notify
        ? {
            notifyReason: linkResult.notify.reason,
            assignedOperatorId: linkResult.notify.assignedOperatorId,
            deliveryTaskId: linkResult.notify.deliveryTaskId ?? null,
            machineName,
          }
        : {}),
    })
  }

  if (sectorId) {
    operatorMovimentPalletWsBroadcastTripSuggestionsUpdated(
      sectorId,
      pickup.typeMovimentPallet,
    )
    if (linkResult.notify?.reason === 'joined_active_delivery') {
      operatorMovimentPalletWsBroadcastQueueUpdated(
        sectorId,
        pickup.typeMovimentPallet,
      )
    }
  }
}

/**
 * Somente retirada. Se já houver um aviso de abastecimento elegível para
 * amarração (aberto, ou já aceito pelo transporte com entrega a caminho) na
 * mesma máquina — e que ainda não tenha retirada vinculada — amarra os dois
 * automaticamente (`pickup-supply-link.service.ts`). Caso contrário, a
 * retirada fica avulsa.
 */
export async function requestPickupOnly(
  operatorUserId: string,
  options?: { isCritical?: boolean; typeMovimentPallet?: TypeMovimentPallet },
) {
  const machine = await machineRepository.findFirstByOperatorUserId(operatorUserId)
  if (!machine) {
    throw new OperatorMachineNotBoundError()
  }

  const typeMovimentPallet =
    options?.typeMovimentPallet ?? (await resolveTypeForMachine(machine.id))

  const pickupTask = await pickupTaskRepository.create({
    machine: { connect: { id: machine.id } },
    requestedBy: { connect: { id: operatorUserId } },
    typeMovimentPallet,
    isCritical: options?.isCritical === true,
    status: MachineTaskStatus.CREATED,
  })

  const linkResult = await linkNewPickupToEligibleSupplyRequest({
    machineId: machine.id,
    pickupTaskId: pickupTask.id,
  })
  await applyLinkOutcome(linkResult, machine.sectorId, machine.name)

  // Sem vínculo: notifica criação avulsa. Com vínculo, applyLinkOutcome já
  // emitiu o pickup com linkedSupplyRequestId (evita TV mostrar 2 cards).
  if (!linkResult.linked && pickupTask.machine) {
    operatorMovimentPalletWsNotifyPickupTaskChange({
      id: pickupTask.id,
      status: pickupTask.status,
      typeMovimentPallet: pickupTask.typeMovimentPallet,
      machine: pickupTask.machine,
    })
  }

  const refreshed = await pickupTaskRepository.findById(pickupTask.id)
  return { pickupTask: refreshed ?? pickupTask }
}

/** Aviso ao abastecimento sem retirada; no maximo uma solicitacao OPEN por maquina. */
export async function requestSupplyOnly(
  operatorUserId: string,
  options?: { toolingId?: string },
) {
  const machine = await machineRepository.findFirstByOperatorUserId(operatorUserId)
  if (!machine) {
    throw new OperatorMachineNotBoundError()
  }

  await assertNoPalletAtReceivingForSupplyRequest(machine.id)

  const existingOpen =
    await operatorMachineSupplyRequestRepository.findFirstOpenByMachineId(
      machine.id,
    )
  if (existingOpen) {
    return { operatorSupplyRequest: existingOpen, created: false as const }
  }

  const toolingId = options?.toolingId?.trim()
  if (toolingId) {
    await requireToolingForMachine(toolingId, machine.id)
  }

  const operatorSupplyRequest = await operatorMachineSupplyRequestRepository.create(
    {
      machine: { connect: { id: machine.id } },
      requestedBy: { connect: { id: operatorUserId } },
      ...(toolingId ? { tooling: { connect: { id: toolingId } } } : {}),
      status: OperatorMachineSupplyRequestStatus.OPEN,
    },
  )

  if (machine.sectorId) {
    operatorMovimentPalletWsBroadcastOperatorSupplyRequestCreated(
      machine.sectorId,
      machine.id,
    )
  }

  // Se já havia uma retirada avulsa em aberto para esta máquina, amarra agora
  // (retirada solicitada antes do abastecimento — ver regra do continuum).
  const linkResult = await linkNewSupplyRequestToEligiblePickup({
    machineId: machine.id,
    supplyRequestId: operatorSupplyRequest.id,
  })
  await applyLinkOutcome(linkResult, machine.sectorId, machine.name)

  return { operatorSupplyRequest, created: true as const }
}

async function requireToolingForMachine(toolingId: string, machineId: string) {
  const tooling = await toolingRepository.findUniqueById(toolingId)
  if (!tooling) {
    throw new ToolingNotFoundError()
  }
  if (tooling.machineId !== machineId) {
    throw new ToolingMachineMismatchError()
  }
  return tooling
}

export async function listToolingsForOperatorMachine(operatorUserId: string) {
  const machine = await machineRepository.findFirstByOperatorUserId(operatorUserId)
  if (!machine) {
    throw new OperatorMachineNotBoundError()
  }
  return toolingRepository.findManyByMachineId(machine.id)
}

export async function createToolingForOperatorMachine(
  operatorUserId: string,
  name: string,
) {
  const machine = await machineRepository.findFirstByOperatorUserId(operatorUserId)
  if (!machine) {
    throw new OperatorMachineNotBoundError()
  }
  const trimmed = name.trim()
  if (!trimmed) {
    throw new ToolingNotFoundError('Informe name (texto nao vazio).')
  }
  const tooling = await toolingRepository.create({
    name: trimmed,
    machine: { connect: { id: machine.id } },
  })
  if (machine.sectorId) {
    operatorMovimentPalletWsBroadcastMachineToolingUpdated({
      machineId: machine.id,
      sectorId: machine.sectorId,
      action: 'created',
      toolingId: tooling.id,
      tooling,
      operatorUserId: machine.userId ?? operatorUserId,
    })
  }
  return tooling
}

export async function deleteToolingForOperatorMachine(
  operatorUserId: string,
  toolingId: string,
) {
  const machine = await machineRepository.findFirstByOperatorUserId(operatorUserId)
  if (!machine) {
    throw new OperatorMachineNotBoundError()
  }
  const tooling = await requireToolingForMachine(toolingId.trim(), machine.id)
  await toolingRepository.deleteById(tooling.id)
  if (machine.sectorId) {
    operatorMovimentPalletWsBroadcastMachineToolingUpdated({
      machineId: machine.id,
      sectorId: machine.sectorId,
      action: 'deleted',
      toolingId: tooling.id,
      tooling: null,
      operatorUserId: machine.userId ?? operatorUserId,
    })
  }
  return tooling
}

/**
 * Retirada + aviso ao abastecimento pedidos juntos ("Entrega + Retirada").
 *
 * Só cria par genuinamente novo (aviso + retirada amarrados na mesma
 * transação, sem corrida possível). Se a máquina já tiver um aviso em aberto
 * (ou pallet a caminho — bloqueado antes, por `assertNoPalletAtReceivingForSupplyRequest`),
 * a solicitação é rejeitada: o operador deve pedir apenas a retirada
 * (`requestPickupOnly`), que amarra automaticamente ao aviso já aberto via
 * `pickup-supply-link.service.ts`. Evita um 2º caminho de UI fazendo a mesma
 * coisa de forma implícita — só existe uma ação por intenção.
 */
export async function requestPickupWithReplenishment(
  operatorUserId: string,
  options?: {
    isCritical?: boolean
    typeMovimentPallet?: TypeMovimentPallet
    toolingId?: string
  },
) {
  const machine = await machineRepository.findFirstByOperatorUserId(operatorUserId)
  if (!machine) {
    throw new OperatorMachineNotBoundError()
  }

  await assertNoPalletAtReceivingForSupplyRequest(machine.id)

  const existingEligibleSupply =
    await operatorMachineSupplyRequestRepository.findFirstEligibleUnclaimedForMachine(
      machine.id,
    )
  if (existingEligibleSupply) {
    throw new OperatorSupplyRequestAlreadyOpenError()
  }

  const typeMovimentPallet =
    options?.typeMovimentPallet ?? (await resolveTypeForMachine(machine.id))

  const toolingId = options?.toolingId?.trim()
  if (toolingId) {
    await requireToolingForMachine(toolingId, machine.id)
  }

  const { pickupTask, operatorSupplyRequest } = await prisma.$transaction(
    async (tx) => {
      const supply = await tx.operatorMachineSupplyRequest.create({
        data: {
          machine: { connect: { id: machine.id } },
          requestedBy: { connect: { id: operatorUserId } },
          ...(toolingId ? { tooling: { connect: { id: toolingId } } } : {}),
          status: OperatorMachineSupplyRequestStatus.OPEN,
        },
        include: operatorMachineSupplyRequestListInclude,
      })

      const pickup = await tx.pickupTask.create({
        data: {
          machine: { connect: { id: machine.id } },
          requestedBy: { connect: { id: operatorUserId } },
          typeMovimentPallet,
          isCritical: options?.isCritical === true,
          status: MachineTaskStatus.CREATED,
          linkedSupplyRequest: { connect: { id: supply.id } },
        },
        include: {
          machine: {
            select: {
              id: true,
              name: true,
              sectorId: true,
              userId: true,
            },
          },
        },
      })

      return { pickupTask: pickup, operatorSupplyRequest: supply }
    },
  )

  if (pickupTask.machine) {
    operatorMovimentPalletWsNotifyPickupTaskChange({
      id: pickupTask.id,
      status: pickupTask.status,
      typeMovimentPallet: pickupTask.typeMovimentPallet,
      machine: pickupTask.machine,
    })
  }

  if (machine.sectorId) {
    operatorMovimentPalletWsBroadcastOperatorSupplyRequestCreated(
      machine.sectorId,
      machine.id,
    )
  }

  return { pickupTask, operatorSupplyRequest, createdSupplyRequest: true }
}

/**
 * Cancela o aviso de abastecimento amarrado à retirada cancelada — só quando
 * seguro: aviso OPEN (ainda sem pallet montado) vira CANCELLED direto; aviso
 * FULFILLED só é cancelado se a entrega vinculada ainda estiver CREATED, sem
 * operador atribuído e sem preparo (senão o pallet já está em curso e não
 * pode ser descartado por uma retirada cancelada).
 */
async function cancelLinkedSupplyRequestIfSafe(
  tx: Prisma.TransactionClient,
  linkedSupplyRequestId: string,
  now: Date,
) {
  const supply = await tx.operatorMachineSupplyRequest.findUnique({
    where: { id: linkedSupplyRequestId },
  })
  if (!supply) {
    return null
  }

  if (supply.status === OperatorMachineSupplyRequestStatus.OPEN) {
    await tx.operatorMachineSupplyRequest.update({
      where: { id: linkedSupplyRequestId },
      data: { status: OperatorMachineSupplyRequestStatus.CANCELLED },
    })
    return null
  }

  if (
    supply.status !== OperatorMachineSupplyRequestStatus.FULFILLED ||
    !supply.deliveryTaskId
  ) {
    return null
  }

  const delivery = await tx.deliveryTask.findUnique({
    where: { id: supply.deliveryTaskId },
  })
  if (
    !delivery ||
    delivery.status !== MachineTaskStatus.CREATED ||
    delivery.assignedOperatorId !== null ||
    delivery.preparedAt !== null
  ) {
    return null
  }

  const canceledDelivery = await tx.deliveryTask.update({
    where: { id: delivery.id },
    data: { status: MachineTaskStatus.CANCELED, statusSince: now },
    include: deliveryTaskListInclude,
  })

  await tx.operatorMachineSupplyRequest.update({
    where: { id: linkedSupplyRequestId },
    data: { status: OperatorMachineSupplyRequestStatus.CANCELLED },
  })

  return canceledDelivery
}

/** Cancela retirada enquanto ainda nao foi aceita pelo transporte (status CREATED). */
export async function cancelPickupRequestByOperator(
  operatorUserId: string,
  pickupTaskId: string,
) {
  const machine = await machineRepository.findFirstByOperatorUserId(operatorUserId)
  if (!machine) {
    throw new OperatorMachineNotBoundError()
  }

  const task = await pickupTaskRepository.findById(pickupTaskId)
  if (!task) {
    throw new PickupTaskNotFoundError()
  }
  if (task.machineId !== machine.id) {
    throw new PickupTaskNotOnOperatorMachineError()
  }
  if (task.status !== MachineTaskStatus.CREATED) {
    throw new PickupTaskCannotBeCanceledError()
  }

  const palletAtReceiving = await findPalletAtReceivingForMachine(machine.id)
  if (palletAtReceiving) {
    throw new PickupTaskCannotBeCanceledError(
      'Nao e possivel cancelar: ha pallet no recebimento aguardando transporte vinculado a esta retirada.',
    )
  }

  const now = new Date()
  const { pickupTask: updated, canceledDelivery } = await prisma.$transaction(
    async (tx) => {
      await tx.movimentPalletTripSuggestion.updateMany({
        where: {
          pickupTaskId,
          status: MovimentPalletTripSuggestionStatus.OPEN,
        },
        data: { status: MovimentPalletTripSuggestionStatus.EXPIRED },
      })

      const canceledDelivery = task.linkedSupplyRequestId
        ? await cancelLinkedSupplyRequestIfSafe(
            tx,
            task.linkedSupplyRequestId,
            now,
          )
        : null

      const pickupTask = await tx.pickupTask.update({
        where: { id: pickupTaskId },
        data: {
          status: MachineTaskStatus.CANCELED,
          statusSince: now,
        },
        include: {
          machine: {
            select: {
              id: true,
              name: true,
              sectorId: true,
              userId: true,
            },
          },
        },
      })

      return { pickupTask, canceledDelivery }
    },
  )

  if (updated.machine) {
    operatorMovimentPalletWsNotifyPickupTaskChange({
      id: updated.id,
      status: updated.status,
      typeMovimentPallet: updated.typeMovimentPallet,
      machine: updated.machine,
    })
    if (canceledDelivery) {
      operatorMovimentPalletWsNotifyDeliveryTaskChange(canceledDelivery)
    }
    operatorMovimentPalletWsBroadcastQueueUpdated(
      updated.machine.sectorId,
      updated.typeMovimentPallet,
    )
    operatorMovimentPalletWsBroadcastTripSuggestionsUpdated(
      updated.machine.sectorId,
      updated.typeMovimentPallet,
    )
  }

  return {
    pickupTask: updated,
    replenishmentCanceled: canceledDelivery !== null,
  }
}

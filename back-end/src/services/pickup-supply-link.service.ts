import { MachineTaskStatus } from '../generated/prisma/enums.js'
import { prisma } from '../lib/prisma.js'
import { pickupTaskRepository } from '../repositories/pickup-task.repository.js'
import { operatorMachineSupplyRequestRepository } from '../repositories/operator-machine-supply-request.repository.js'
import { movimentPalletTripSuggestionRepository } from '../repositories/moviment-pallet-trip-suggestion.repository.js'
import type { PickupLinkNotifyReason } from '../ws/operator-moviment-pallet-ws.hub.js'

/**
 * Vínculo explícito e único entre `PickupTask` e `OperatorMachineSupplyRequest`
 * (continuum "Entrega + Retirada"). Substitui a antiga flag `triggersReplenishment`
 * (reinferida por heurística de status/timestamp em várias camadas — causa raiz de
 * cards duplicados e retiradas re-amarradas incorretamente após o continuum
 * original concluir).
 *
 * Regra única, gravada uma única vez no momento da solicitação:
 * - Retirada + abastecimento na MESMA solicitação → vínculo direto na criação
 *   (ver `operator-machine.service.ts`), sem passar por este módulo.
 * - Retirada solicitada e, depois, abastecimento solicitado (ou vice-versa)
 *   para a mesma máquina, enquanto o continuum anterior ainda não foi
 *   reivindicado por outra retirada → `linkNewPickupToEligibleSupplyRequest`
 *   / `linkNewSupplyRequestToEligiblePickup` amarram os dois.
 * - Se o lado já aceito pelo transporte (entrega ASSIGNED/IN_PROGRESS, ou
 *   retirada ASSIGNED/IN_PROGRESS) ganha um vínculo novo, o empilhadeirista
 *   responsável é notificado (`notify`).
 *
 * Unicidade garantida pelo banco (`PickupTask.linkedSupplyRequestId` é
 * `@unique`): nunca duas retiradas amarram no mesmo aviso.
 */

function isPrismaUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: string }).code === 'P2002'
  )
}

export type PickupSupplyLinkNotify = {
  reason: PickupLinkNotifyReason
  assignedOperatorId: string
  deliveryTaskId?: string | null
}

export type PickupSupplyLinkResult = {
  linked: boolean
  linkedSupplyRequestId: string | null
  pickupTaskId: string | null
  notify: PickupSupplyLinkNotify | null
}

const NOT_LINKED: PickupSupplyLinkResult = {
  linked: false,
  linkedSupplyRequestId: null,
  pickupTaskId: null,
  notify: null,
}

/**
 * Amarra uma retirada RECÉM-CRIADA a um aviso de abastecimento ainda
 * elegível e sem retirada vinculada (o mais antigo, se houver mais de um
 * continuum em aberto na máquina — normalmente há só um).
 *
 * Se o aviso já tiver uma entrega ASSIGNED/IN_PROGRESS (o transporte já
 * acatou e está a caminho), a retirada entra imediatamente na mesma rota
 * (sugestão ACCEPTED) e o empilhadeirista responsável deve ser notificado.
 */
export async function linkNewPickupToEligibleSupplyRequest(input: {
  machineId: string
  pickupTaskId: string
}): Promise<PickupSupplyLinkResult> {
  const supply =
    await operatorMachineSupplyRequestRepository.findFirstEligibleUnclaimedForMachine(
      input.machineId,
    )
  if (!supply) return NOT_LINKED

  try {
    await prisma.pickupTask.update({
      where: { id: input.pickupTaskId },
      data: { linkedSupplyRequest: { connect: { id: supply.id } } },
    })
  } catch (error) {
    // Corrida: outra retirada reivindicou este aviso no meio do caminho.
    if (isPrismaUniqueViolation(error)) return NOT_LINKED
    throw error
  }

  if (!supply.deliveryTaskId) {
    return {
      linked: true,
      linkedSupplyRequestId: supply.id,
      pickupTaskId: input.pickupTaskId,
      notify: null,
    }
  }

  const delivery = await prisma.deliveryTask.findUnique({
    where: { id: supply.deliveryTaskId },
  })
  if (
    !delivery ||
    !delivery.assignedOperatorId ||
    (delivery.status !== MachineTaskStatus.ASSIGNED &&
      delivery.status !== MachineTaskStatus.IN_PROGRESS)
  ) {
    return {
      linked: true,
      linkedSupplyRequestId: supply.id,
      pickupTaskId: input.pickupTaskId,
      notify: null,
    }
  }

  // Entrega já acatada pelo transporte: a retirada nova entra na mesma rota.
  const now = new Date()
  await prisma.pickupTask.update({
    where: { id: input.pickupTaskId },
    data: {
      status: MachineTaskStatus.ASSIGNED,
      assignedOperator: { connect: { id: delivery.assignedOperatorId } },
      assignedAt: now,
      operatedWith: delivery.operatedWith,
    },
  })

  await movimentPalletTripSuggestionRepository.upsertAcceptedPair({
    deliverTaskId: delivery.id,
    pickupTaskId: input.pickupTaskId,
    machineId: input.machineId,
    typeMovimentPallet: delivery.typeMovimentPallet,
    acceptedByUserId: delivery.assignedOperatorId,
    acceptedAt: now,
  })

  return {
    linked: true,
    linkedSupplyRequestId: supply.id,
    pickupTaskId: input.pickupTaskId,
    notify: {
      reason: 'joined_active_delivery',
      assignedOperatorId: delivery.assignedOperatorId,
      deliveryTaskId: delivery.id,
    },
  }
}

/**
 * Amarra um aviso de abastecimento RECÉM-CRIADO à 1ª retirada aberta da
 * máquina que ainda não tem vínculo nenhum (mais antiga primeiro).
 *
 * Se essa retirada já tiver sido acatada pelo transporte (ASSIGNED/IN_PROGRESS),
 * não força nenhuma sugestão de viagem retroativa (a entrega deste aviso ainda
 * nem existe) — apenas grava o vínculo informativo e notifica o empilhadeirista
 * responsável pela retirada.
 */
export async function linkNewSupplyRequestToEligiblePickup(input: {
  machineId: string
  supplyRequestId: string
}): Promise<PickupSupplyLinkResult> {
  const pickup = await pickupTaskRepository.findFirstOpenUnlinkedForMachine(
    input.machineId,
  )
  if (!pickup) return NOT_LINKED

  try {
    await prisma.pickupTask.update({
      where: { id: pickup.id },
      data: { linkedSupplyRequest: { connect: { id: input.supplyRequestId } } },
    })
  } catch (error) {
    if (isPrismaUniqueViolation(error)) return NOT_LINKED
    throw error
  }

  const alreadyAcceptedByTransport =
    (pickup.status === MachineTaskStatus.ASSIGNED ||
      pickup.status === MachineTaskStatus.IN_PROGRESS) &&
    Boolean(pickup.assignedOperatorId)

  return {
    linked: true,
    linkedSupplyRequestId: input.supplyRequestId,
    pickupTaskId: pickup.id,
    notify: alreadyAcceptedByTransport
      ? {
          reason: 'replenishment_linked',
          assignedOperatorId: pickup.assignedOperatorId as string,
        }
      : null,
  }
}

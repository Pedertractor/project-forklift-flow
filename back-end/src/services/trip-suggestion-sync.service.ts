import { IsOperating, TypeMovimentPallet } from '../generated/prisma/enums.js'
import { deliveryTaskRepository } from '../repositories/delivery-task.repository.js'
import { operatorMachineSupplyRequestRepository } from '../repositories/operator-machine-supply-request.repository.js'
import { pickupTaskRepository } from '../repositories/pickup-task.repository.js'
import type { PickupTaskListRow } from '../repositories/pickup-task.repository.js'
import {
  isOpenTripTaskPairValid,
  movimentPalletTripSuggestionRepository,
} from '../repositories/moviment-pallet-trip-suggestion.repository.js'

type PickupForReplenishmentLink = Pick<
  PickupTaskListRow,
  'id' | 'machineId' | 'triggersReplenishment' | 'requestedBy' | 'createdAt'
>

/**
 * Retirada vinculada ao fluxo de reposição:
 * - retirada + abastecimento na mesma solicitação, ou
 * - abastecimento solicitado antes e retirada depois pelo mesmo operador,
 *   enquanto o aviso ou a entrega vinculada ainda estiver em aberto.
 */
export async function isPickupLinkedToReplenishmentFlow(
  pickup: PickupForReplenishmentLink,
): Promise<boolean> {
  if (pickup.triggersReplenishment) return true

  const operatorId = pickup.requestedBy?.id
  if (!operatorId) return false

  const openSupply =
    await operatorMachineSupplyRequestRepository.findFirstOpenByMachineId(
      pickup.machineId,
    )
  if (
    openSupply?.requestedBy?.id === operatorId &&
    pickup.createdAt >= openSupply.createdAt
  ) {
    return true
  }

  const fulfilledSupply =
    await operatorMachineSupplyRequestRepository.findLatestFulfilledWithOpenDeliveryForMachineAndOperator(
      pickup.machineId,
      operatorId,
    )
  if (
    fulfilledSupply &&
    pickup.createdAt >= fulfilledSupply.createdAt
  ) {
    return true
  }

  return false
}

/** Retirada elegível para sugestão de viagem combinada na máquina. */
export async function findPickupForTripPairOnMachine(machineId: string) {
  const withReplenishment =
    await pickupTaskRepository.findFirstOpenWithReplenishmentForMachine(machineId)
  if (withReplenishment) return withReplenishment

  const openPickup = await pickupTaskRepository.findOpenForMachine(machineId)
  if (!openPickup) return null

  const linked = await isPickupLinkedToReplenishmentFlow(openPickup)
  return linked ? openPickup : null
}

export async function expireOpenTripSuggestionsUnpreparedForSector(
  sectorId: string,
  types: TypeMovimentPallet[],
) {
  if (types.length === 0) {
    return
  }
  await movimentPalletTripSuggestionRepository.expireOpenWithUnpreparedDeliveryInSector(
    sectorId,
    types,
  )
}

/** Cria/atualiza sugestao de viagem na maquina quando entrega preparada + retirada vinculada. */
export async function syncTripSuggestionPairForMachine(machineId: string): Promise<{
  synced: boolean
  sectorId: string | null
  typeMovimentPallet: TypeMovimentPallet | null
}> {
  const pickup = await findPickupForTripPairOnMachine(machineId)
  if (!pickup) {
    return { synced: false, sectorId: null, typeMovimentPallet: null }
  }

  const deliver = await deliveryTaskRepository.findOpenPreparedForMachine(machineId)
  if (
    !deliver ||
    !isOpenTripTaskPairValid(
      deliver.status,
      pickup.status,
      deliver.machineId,
      pickup.machineId,
      deliver.preparedAt != null,
    )
  ) {
    return {
      synced: false,
      sectorId: pickup.machine.sectorId,
      typeMovimentPallet: pickup.typeMovimentPallet,
    }
  }

  await movimentPalletTripSuggestionRepository.upsertOpenPair({
    deliverTaskId: deliver.id,
    pickupTaskId: pickup.id,
    machineId,
    typeMovimentPallet: deliver.typeMovimentPallet,
  })

  return {
    synced: true,
    sectorId: pickup.machine.sectorId,
    typeMovimentPallet: deliver.typeMovimentPallet,
  }
}

export async function syncOpenTripSuggestionsForSector(
  sectorId: string,
  types: TypeMovimentPallet[],
) {
  await expireOpenTripSuggestionsUnpreparedForSector(sectorId, types)

  const operatingModes = new Set<IsOperating>()
  for (const type of types) {
    operatingModes.add(
      type === TypeMovimentPallet.FORKLIFT
        ? IsOperating.FORKLIFT
        : IsOperating.PALLET_TRUCK,
    )
  }

  const syncedMachineIds = new Set<string>()

  for (const operatingMode of operatingModes) {
    const pickups =
      await pickupTaskRepository.findManyOpenPickupForSectorAndOperatingMode(
        sectorId,
        operatingMode,
      )

    for (const pickup of pickups) {
      if (syncedMachineIds.has(pickup.machineId)) continue

      const linked = await isPickupLinkedToReplenishmentFlow(pickup)
      if (!linked) continue

      const deliver = await deliveryTaskRepository.findOpenPreparedForMachine(
        pickup.machineId,
      )
      if (
        deliver &&
        isOpenTripTaskPairValid(
          deliver.status,
          pickup.status,
          deliver.machineId,
          pickup.machineId,
          deliver.preparedAt != null,
        )
      ) {
        await movimentPalletTripSuggestionRepository.upsertOpenPair({
          deliverTaskId: deliver.id,
          pickupTaskId: pickup.id,
          machineId: pickup.machineId,
          typeMovimentPallet: deliver.typeMovimentPallet,
        })
        syncedMachineIds.add(pickup.machineId)
      }
    }
  }
}

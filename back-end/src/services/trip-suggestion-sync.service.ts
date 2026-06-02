import { IsOperating, TypeMovimentPallet } from '../generated/prisma/enums.js'
import { deliveryTaskRepository } from '../repositories/delivery-task.repository.js'
import { pickupTaskRepository } from '../repositories/pickup-task.repository.js'
import {
  isOpenTripTaskPairValid,
  movimentPalletTripSuggestionRepository,
} from '../repositories/moviment-pallet-trip-suggestion.repository.js'

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

/** Cria/atualiza sugestao de viagem na maquina quando entrega preparada + retirada com abastecimento. */
export async function syncTripSuggestionPairForMachine(machineId: string): Promise<{
  synced: boolean
  sectorId: string | null
  typeMovimentPallet: TypeMovimentPallet | null
}> {
  const pickup =
    await pickupTaskRepository.findFirstOpenWithReplenishmentForMachine(machineId)
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

  for (const operatingMode of operatingModes) {
    const pickups = await pickupTaskRepository.findManyOpenWithReplenishmentForSector(
      sectorId,
      operatingMode,
    )
    for (const pickup of pickups) {
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
      }
    }
  }
}

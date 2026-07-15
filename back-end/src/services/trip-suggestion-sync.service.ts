import { IsOperating, MachineTaskStatus, TypeMovimentPallet } from "../generated/prisma/enums.js";
import { prisma } from "../lib/prisma.js";
import { pickupTaskRepository } from "../repositories/pickup-task.repository.js";
import { movimentPalletTripSuggestionRepository } from "../repositories/moviment-pallet-trip-suggestion.repository.js";

/**
 * Sincroniza a sugestão de viagem (entrega + retirada) da máquina a partir do
 * vínculo EXPLÍCITO `PickupTask.linkedSupplyRequestId` — nunca por heurística
 * de "qual entrega/retirada está aberta na máquina agora". No máximo uma
 * retirada por máquina tem esse vínculo (unicidade garantida no banco), então
 * não há ambiguidade sobre qual par formar.
 *
 * Só forma sugestão OPEN quando a retirada ainda não foi aceita pelo
 * transporte (CREATED): se já estiver ASSIGNED/IN_PROGRESS individualmente
 * (aceita antes de o pallet ficar pronto), a entrega segue como tarefa
 * separada na fila — evita reatribuir a rota de um empilhadeirista para
 * outro (ver `pickup-supply-link.service.ts` para o caso simétrico: entrega
 * já em rota ganhando uma retirada nova, que aí sim é anexada ao mesmo
 * empilhadeirista).
 */
export async function syncTripSuggestionPairForMachine(
  machineId: string,
): Promise<{
  synced: boolean;
  sectorId: string | null;
  typeMovimentPallet: TypeMovimentPallet | null;
}> {
  const pickup = await pickupTaskRepository.findFirstOpenLinkedForMachine(machineId);
  if (!pickup || pickup.status !== MachineTaskStatus.CREATED) {
    return { synced: false, sectorId: null, typeMovimentPallet: null };
  }

  const supply = pickup.linkedSupplyRequestId
    ? await prisma.operatorMachineSupplyRequest.findUnique({
        where: { id: pickup.linkedSupplyRequestId },
        select: { deliveryTaskId: true },
      })
    : null;
  if (!supply?.deliveryTaskId) {
    return {
      synced: false,
      sectorId: pickup.machine?.sectorId ?? null,
      typeMovimentPallet: pickup.typeMovimentPallet,
    };
  }

  const delivery = await prisma.deliveryTask.findUnique({
    where: { id: supply.deliveryTaskId },
    select: { id: true, status: true, typeMovimentPallet: true, machineId: true },
  });
  if (!delivery || delivery.status !== MachineTaskStatus.CREATED) {
    return {
      synced: false,
      sectorId: pickup.machine?.sectorId ?? null,
      typeMovimentPallet: pickup.typeMovimentPallet,
    };
  }

  // Amarração no banco desde a solicitação; a fila do empilhadeirista só
  // lista quando `preparedAt != null` (ver `isOpenTripTaskPairValid`).
  await movimentPalletTripSuggestionRepository.upsertOpenPair({
    deliverTaskId: delivery.id,
    pickupTaskId: pickup.id,
    machineId,
    typeMovimentPallet: delivery.typeMovimentPallet,
  });

  return {
    synced: true,
    sectorId: pickup.machine?.sectorId ?? null,
    typeMovimentPallet: delivery.typeMovimentPallet,
  };
}

/**
 * Amarra a entrega (recém-solicitada ou marcada pronta) à retirada
 * explicitamente vinculada ao aviso de abastecimento que a originou — a
 * cadeia `OperatorMachineSupplyRequest.deliveryTaskId` -> `linkedPickupTask`
 * resolve, sem ambiguidade, qual retirada pertence a qual entrega.
 *
 * Entregas sem aviso de abastecimento (ad-hoc) ou cujo aviso não tem
 * retirada vinculada não formam sugestão automática: ficam na fila comum do
 * transporte, sem interferir em retiradas de outros continuums.
 */
export async function bindLinkedPickupToDelivery(input: {
  machineId: string;
  deliverTaskId: string;
  typeMovimentPallet: TypeMovimentPallet;
}): Promise<{
  synced: boolean;
  pickupTaskId: string | null;
  sectorId: string | null;
  typeMovimentPallet: TypeMovimentPallet | null;
}> {
  const supply = await prisma.operatorMachineSupplyRequest.findUnique({
    where: { deliveryTaskId: input.deliverTaskId },
    include: {
      linkedPickupTask: {
        select: {
          id: true,
          status: true,
          machine: { select: { sectorId: true } },
        },
      },
    },
  });
  const pickup = supply?.linkedPickupTask;
  if (!pickup || pickup.status !== MachineTaskStatus.CREATED) {
    return {
      synced: false,
      pickupTaskId: null,
      sectorId: null,
      typeMovimentPallet: null,
    };
  }

  await movimentPalletTripSuggestionRepository.upsertOpenPair({
    deliverTaskId: input.deliverTaskId,
    pickupTaskId: pickup.id,
    machineId: input.machineId,
    typeMovimentPallet: input.typeMovimentPallet,
  });

  return {
    synced: true,
    pickupTaskId: pickup.id,
    sectorId: pickup.machine?.sectorId ?? null,
    typeMovimentPallet: input.typeMovimentPallet,
  };
}

export async function expireOpenTripSuggestionsUnpreparedForSector(
  sectorId: string,
  types: TypeMovimentPallet[],
) {
  if (types.length === 0) {
    return;
  }
  await movimentPalletTripSuggestionRepository.expireOpenWithUnpreparedDeliveryInSector(
    sectorId,
    types,
  );
}

export async function syncOpenTripSuggestionsForSector(
  sectorId: string,
  types: TypeMovimentPallet[],
) {
  await expireOpenTripSuggestionsUnpreparedForSector(sectorId, types);

  const operatingModes = new Set<IsOperating>();
  for (const type of types) {
    operatingModes.add(
      type === TypeMovimentPallet.FORKLIFT
        ? IsOperating.FORKLIFT
        : IsOperating.PALLET_TRUCK,
    );
  }

  const syncedMachineIds = new Set<string>();

  for (const operatingMode of operatingModes) {
    const linkedPickups = await pickupTaskRepository.findManyOpenLinkedForSector(
      sectorId,
      operatingMode,
    );

    for (const pickup of linkedPickups) {
      if (syncedMachineIds.has(pickup.machineId)) continue;
      syncedMachineIds.add(pickup.machineId);
      await syncTripSuggestionPairForMachine(pickup.machineId);
    }
  }
}

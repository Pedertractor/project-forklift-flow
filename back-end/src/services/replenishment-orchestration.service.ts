import type { Prisma } from "../generated/prisma/client.js";
import {
  OperatorMachineSupplyRequestStatus,
  PriorityLevel,
  RequestStatus,
  TypeMovimentPallet,
} from "../generated/prisma/enums.js";
import {
  MachineReplenishmentRequestNotFoundError,
  OperatorMachineNotBoundError,
  OperatorWithoutSectorError,
  ReplenishmentFinalizeBlockedByInboundError,
  ReplenishmentFinalizeMissingFieldsError,
  ReplenishmentNotAwaitingPreparationError,
  ReplenishmentPalletReadyCubePendingError,
} from "../errors/domain-errors.js";
import { isPendingSupplyCubeMarker } from "../constants/replenishment-operator.constants.js";
import { machineReplenishmentRequestRepository } from "../repositories/machine-replenishment-request.repository.js";
import { operatorMachineSupplyRequestRepository } from "../repositories/operator-machine-supply-request.repository.js";
import { machineRepository } from "../repositories/machine.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import { prisma } from "../lib/prisma.js";
import {
  requestStatusOnCreate,
  requestStatusPatch,
} from "../utils/request-status-since.js";
import { operatorMovimentPalletWsEmitAfterReplenishmentSave } from "../ws/operator-moviment-pallet-ws.hub.js";

export type FinalizeMachineCycleInput = {
  movementCube?: string;
  typeMovimentPallet?: TypeMovimentPallet;
  priorityLevel?: PriorityLevel;
};

export type FinalizeMachineCycleOptions = {
  /**
   * OPERATOR_MACHINE: cria `OperatorMachineSupplyRequest` (aviso ao abastecimento sem cubo).
   */
  operatorDobraInitiated?: boolean;
};

export type FinalizeMachineCycleOutcome =
  | "TRANSPORT_QUEUED"
  | "SUPPLY_NOTIFIED";

export async function finalizeMachineProductionCycle(
  operatorUserId: string,
  input: FinalizeMachineCycleInput = {},
  options: FinalizeMachineCycleOptions = {},
) {
  const machine =
    await machineRepository.findFirstByOperatorUserId(operatorUserId);
  if (!machine) {
    throw new OperatorMachineNotBoundError();
  }

  const inboundBlock =
    await machineReplenishmentRequestRepository.findBlockingInboundForFinalize(
      machine.id,
    );
  if (inboundBlock) {
    throw new ReplenishmentFinalizeBlockedByInboundError();
  }

  const palletReady =
    await machineReplenishmentRequestRepository.findPalletReadyForDestination(
      machine.id,
    );
  if (palletReady) {
    return {
      outcome: "TRANSPORT_QUEUED" as const,
      message:
        "Pallet ja pronto — pedido disponivel na fila da empilhadeira/transpaleteira.",
      request: palletReady,
    };
  }

  const operatorDobraInitiated = options.operatorDobraInitiated === true;

  if (operatorDobraInitiated) {
    const existingOpenSupply =
      await operatorMachineSupplyRequestRepository.findFirstOpenByMachineId(
        machine.id,
      );
    if (existingOpenSupply) {
      return {
        outcome: "SUPPLY_NOTIFIED" as const,
        message:
          "Abastecimento ja foi notificado para preparar pallet desta maquina.",
        operatorSupplyRequest: existingOpenSupply,
      };
    }
  }

  const existingAwaiting =
    await machineReplenishmentRequestRepository.findOpenAwaitingPreparationForDestination(
      machine.id,
    );
  if (existingAwaiting) {
    return {
      outcome: "SUPPLY_NOTIFIED" as const,
      message:
        "Abastecimento ja foi notificado para preparar pallet desta maquina.",
      request: existingAwaiting,
    };
  }

  const latest =
    await machineReplenishmentRequestRepository.findLatestByDestinationId(
      machine.id,
    );

  if (operatorDobraInitiated) {
    const operatorSupplyRequest =
      await operatorMachineSupplyRequestRepository.create({
        machine: { connect: { id: machine.id } },
        requestedBy: { connect: { id: operatorUserId } },
        status: OperatorMachineSupplyRequestStatus.OPEN,
      });
    return {
      outcome: "SUPPLY_NOTIFIED" as const,
      message:
        "Nao ha pallet pronto — abastecimento deve preparar o proximo pallet para esta maquina.",
      operatorSupplyRequest,
    };
  }

  let movementCube: string;
  let typeMovimentPallet: TypeMovimentPallet;
  let priorityLevel: PriorityLevel;

  movementCube = input.movementCube?.trim() || latest?.movementCube || "";
  const resolvedType = input.typeMovimentPallet ?? latest?.typeMovimentPallet;

  if (!movementCube || resolvedType === undefined) {
    throw new ReplenishmentFinalizeMissingFieldsError();
  }
  typeMovimentPallet = resolvedType;
  priorityLevel = input.priorityLevel ?? PriorityLevel.NORMAL;

  const now = new Date();
  const data: Prisma.MachineReplenishmentRequestCreateInput = {
    movementCube,
    typeMovimentPallet,
    priorityLevel,
    ...requestStatusOnCreate(RequestStatus.PALLET_READY, now),
    preparedAt: now,
    requestedBy: { connect: { id: operatorUserId } },
    destination: { connect: { id: machine.id } },
  };

  const request = await prisma.$transaction(async (tx) => {
    await machineReplenishmentRequestRepository.completeAwaitingOperatorSupplyPlaceholdersForDestination(
      machine.id,
      tx,
    );
    const row = await machineReplenishmentRequestRepository.createWithClient(
      tx,
      data,
    );
    await operatorMachineSupplyRequestRepository.fulfillOpenForDestination(
      machine.id,
      row.id,
      tx,
    );
    return row;
  });

  operatorMovimentPalletWsEmitAfterReplenishmentSave(request);

  return {
    outcome: "TRANSPORT_QUEUED" as const,
    message: "Pedido registrado — pallet disponível na fila do transporte.",
    request,
  };
}

export async function listPendingPreparationForSupplyUser(userId: string) {
  const user = await userRepository.findUniqueByIdWithSector(userId);
  if (!user?.sectorId) {
    throw new OperatorWithoutSectorError(
      "Usuario sem setor vinculado; necessario para listar preparos pendentes.",
    );
  }

  const operatorSupplyRequests =
    await operatorMachineSupplyRequestRepository.findManyOpenForSector(
      user.sectorId,
    );

  return { requests: [], operatorSupplyRequests };
}

export async function markReplenishmentPalletReady(requestId: string) {
  const current =
    await machineReplenishmentRequestRepository.findUniqueById(requestId);
  if (!current) {
    throw new MachineReplenishmentRequestNotFoundError();
  }

  if (current.status !== RequestStatus.AWAITING_PREPARATION) {
    throw new ReplenishmentNotAwaitingPreparationError();
  }

  if (isPendingSupplyCubeMarker(current.movementCube)) {
    throw new ReplenishmentPalletReadyCubePendingError();
  }

  const now = new Date();
  const updated = await machineReplenishmentRequestRepository.update(
    requestId,
    {
      ...requestStatusPatch(RequestStatus.PALLET_READY, now),
      preparedAt: now,
      awaitingPreparationSince: null,
    },
  );
  operatorMovimentPalletWsEmitAfterReplenishmentSave(updated);
  return updated;
}

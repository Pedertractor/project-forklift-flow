import type { Prisma } from "../generated/prisma/client.js";
import {
  PriorityLevel,
  RequestStatus,
  TypeMovimentPallet,
} from "../generated/prisma/enums.js";
import {
  MachineNotFoundError,
  MachineReplenishmentRequestDeleteBlockedError,
  MachineReplenishmentRequestNotEditableError,
  MachineReplenishmentRequestNotFoundError,
} from "../errors/domain-errors.js";
import { machineReplenishmentRequestRepository } from "../repositories/machine-replenishment-request.repository.js";
import { operatorMachineSupplyRequestRepository } from "../repositories/operator-machine-supply-request.repository.js";
import { machineRepository } from "../repositories/machine.repository.js";
import { prisma } from "../lib/prisma.js";
import { operatorMovimentPalletWsEmitAfterReplenishmentSave } from "../ws/operator-moviment-pallet-ws.hub.js";

const TERMINAL_STATUSES: RequestStatus[] = [
  RequestStatus.COMPLETED,
  RequestStatus.CANCELED,
];

export type CreateMachineReplenishmentRequestInput = {
  requestedById: string;
  destinationId: string;
  movementCube: string;
  typeMovimentPallet: TypeMovimentPallet;
  priorityLevel?: PriorityLevel;
  /** Se true, pallet ja preparado — entra direto na fila do transporte. */
  palletReady?: boolean;
};

export type UpdateMachineReplenishmentRequestInput = {
  destinationId?: string;
  movementCube?: string;
  typeMovimentPallet?: TypeMovimentPallet;
  priorityLevel?: PriorityLevel;
};

async function requireRequestById(id: string) {
  const row = await machineReplenishmentRequestRepository.findUniqueById(id);
  if (!row) {
    throw new MachineReplenishmentRequestNotFoundError();
  }
  return row;
}

function assertEditable(status: RequestStatus) {
  if (TERMINAL_STATUSES.includes(status)) {
    throw new MachineReplenishmentRequestNotEditableError();
  }
}

async function requireMachineExists(machineId: string) {
  const m = await machineRepository.findUniqueById(machineId);
  if (!m) {
    throw new MachineNotFoundError();
  }
}

export async function createMachineReplenishmentRequest(
  input: CreateMachineReplenishmentRequestInput,
) {
  await requireMachineExists(input.destinationId);

  const ready = input.palletReady === true;
  const now = new Date();
  const data: Prisma.MachineReplenishmentRequestCreateInput = {
    movementCube: input.movementCube.trim(),
    typeMovimentPallet: input.typeMovimentPallet,
    priorityLevel: input.priorityLevel ?? PriorityLevel.NORMAL,
    status: ready
      ? RequestStatus.PALLET_READY
      : RequestStatus.AWAITING_PREPARATION,
    ...(ready ? { preparedAt: now } : { awaitingPreparationSince: now }),
    requestedBy: { connect: { id: input.requestedById } },
    destination: { connect: { id: input.destinationId } },
  };

  const row = await prisma.$transaction(async (tx) => {
    await machineReplenishmentRequestRepository.completeAwaitingOperatorSupplyPlaceholdersForDestination(
      input.destinationId,
      tx,
    );
    const created = await machineReplenishmentRequestRepository.createWithClient(
      tx,
      data,
    );
    await operatorMachineSupplyRequestRepository.fulfillOpenForDestination(
      input.destinationId,
      created.id,
      tx,
    );
    return created;
  });
  operatorMovimentPalletWsEmitAfterReplenishmentSave(row);
  return row;
}

export async function listMachineReplenishmentRequests(filters?: {
  requestedById?: string;
  status?: RequestStatus;
  destinationId?: string;
}) {
  return machineReplenishmentRequestRepository.findManyForList(filters);
}

export async function getMachineReplenishmentRequestById(id: string) {
  return requireRequestById(id);
}

export async function updateMachineReplenishmentRequest(
  id: string,
  input: UpdateMachineReplenishmentRequestInput,
) {
  const current = await requireRequestById(id);
  assertEditable(current.status);

  const data: Prisma.MachineReplenishmentRequestUpdateInput = {};
  if (input.destinationId !== undefined) {
    await requireMachineExists(input.destinationId);
    data.destination = { connect: { id: input.destinationId } };
  }
  if (input.movementCube !== undefined) {
    data.movementCube = input.movementCube.trim();
  }
  if (input.priorityLevel !== undefined) {
    data.priorityLevel = input.priorityLevel;
  }
  if (input.typeMovimentPallet !== undefined) {
    data.typeMovimentPallet = input.typeMovimentPallet;
  }

  if (Object.keys(data).length === 0) {
    return current;
  }

  return machineReplenishmentRequestRepository.update(id, data);
}

export async function deleteMachineReplenishmentRequest(id: string) {
  const current = await requireRequestById(id);
  const deletableStatuses: RequestStatus[] = [
    RequestStatus.CREATED,
    RequestStatus.AWAITING_PREPARATION,
    RequestStatus.PALLET_READY,
  ];
  if (!deletableStatuses.includes(current.status)) {
    throw new MachineReplenishmentRequestDeleteBlockedError();
  }
  if (current._count.movimentPalletTasks > 0) {
    throw new MachineReplenishmentRequestDeleteBlockedError();
  }
  await machineReplenishmentRequestRepository.delete(id);
}

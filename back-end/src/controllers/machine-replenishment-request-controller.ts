import type { RouteHandlerMethod } from "fastify";
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
  OperatorWithoutSectorError,
  ReplenishmentNotAwaitingPreparationError,
  ReplenishmentPalletReadyCubePendingError,
} from "../errors/domain-errors.js";
import {
  createMachineReplenishmentRequest,
  deleteMachineReplenishmentRequest,
  getMachineReplenishmentRequestById,
  listMachineReplenishmentRequests,
  updateMachineReplenishmentRequest,
} from "../services/machine-replenishment-request.service.js";
import {
  listPendingPreparationForSupplyUser,
  markReplenishmentPalletReady,
} from "../services/replenishment-orchestration.service.js";
import type { AppJwtPayload } from "../types/auth.types.js";

function isTypeMovimentPallet(value: string): value is TypeMovimentPallet {
  return (Object.values(TypeMovimentPallet) as string[]).includes(value);
}

function isPriorityLevel(value: string): value is PriorityLevel {
  return (Object.values(PriorityLevel) as string[]).includes(value);
}

function parseOptionalRequestStatus(value: unknown): RequestStatus | undefined {
  if (value === undefined || value === "") {
    return undefined;
  }
  if (typeof value !== "string") {
    return undefined;
  }
  if (!(Object.values(RequestStatus) as string[]).includes(value)) {
    return undefined;
  }
  return value as RequestStatus;
}

export const postCreateMachineReplenishmentRequest: RouteHandlerMethod = async (
  request,
  reply,
) => {
  const user = request.user as AppJwtPayload;
  const body = (request.body ?? {}) as {
    destinationId?: string;
    movementCube?: string;
    typeMovimentPallet?: string;
    priorityLevel?: string;
  };

  if (
    typeof body.destinationId !== "string" ||
    body.destinationId.trim() === ""
  ) {
    return reply.status(400).send({ error: "Informe destinationId." });
  }
  if (
    typeof body.movementCube !== "string" ||
    body.movementCube.trim() === ""
  ) {
    return reply
      .status(400)
      .send({ error: "Informe movementCube (codigo do cubo)." });
  }
  if (
    typeof body.typeMovimentPallet !== "string" ||
    body.typeMovimentPallet.trim() === ""
  ) {
    return reply
      .status(400)
      .send({
        error: "Informe typeMovimentPallet (FORKLIFT ou ANY).",
      });
  }
  const typeMovimentPalletRaw = body.typeMovimentPallet.trim();
  if (!isTypeMovimentPallet(typeMovimentPalletRaw)) {
    return reply.status(400).send({
      error: "typeMovimentPallet invalido. Use FORKLIFT ou ANY.",
    });
  }
  const typeMovimentPallet = typeMovimentPalletRaw;

  let priority: PriorityLevel | undefined;
  if (body.priorityLevel !== undefined) {
    if (!isPriorityLevel(body.priorityLevel)) {
      return reply.status(400).send({
        error: "priorityLevel invalido. Use VERY_HIGH, HIGH ou NORMAL.",
      });
    }
    priority = body.priorityLevel;
  }

  try {
    const row = await createMachineReplenishmentRequest({
      requestedById: user.sub,
      destinationId: body.destinationId.trim(),
      movementCube: body.movementCube,
      typeMovimentPallet,
      ...(priority !== undefined ? { priorityLevel: priority } : {}),
    });
    return reply.status(201).send(row);
  } catch (error) {
    if (error instanceof MachineNotFoundError) {
      return reply.status(404).send({ error: error.message });
    }
    throw error;
  }
};

export const getPendingPreparationRequests: RouteHandlerMethod = async (
  request,
  reply,
) => {
  const user = request.user as AppJwtPayload;
  try {
    const result = await listPendingPreparationForSupplyUser(user.sub);
    return reply.send(result);
  } catch (error) {
    if (error instanceof OperatorWithoutSectorError) {
      return reply.status(400).send({ error: error.message });
    }
    throw error;
  }
};

export const postMarkPalletReady: RouteHandlerMethod = async (
  request,
  reply,
) => {
  const { requestId } = request.params as { requestId?: string };
  if (!requestId) {
    return reply.status(400).send({ error: "requestId invalido." });
  }
  try {
    const requestRow = await markReplenishmentPalletReady(requestId);
    return reply.send({
      message:
        "Pallet pronto — pedido liberado na fila da empilhadeira/transpaleteira.",
      request: requestRow,
    });
  } catch (error) {
    if (error instanceof MachineReplenishmentRequestNotFoundError) {
      return reply.status(404).send({ error: error.message });
    }
    if (error instanceof ReplenishmentNotAwaitingPreparationError) {
      return reply.status(409).send({ error: error.message });
    }
    if (error instanceof ReplenishmentPalletReadyCubePendingError) {
      return reply.status(409).send({ error: error.message });
    }
    throw error;
  }
};

export const getListMachineReplenishmentRequests: RouteHandlerMethod = async (
  request,
  reply,
) => {
  const q = (request.query ?? {}) as {
    requestedById?: string;
    status?: string;
    destinationId?: string;
  };

  const status = parseOptionalRequestStatus(q.status);
  if (q.status !== undefined && q.status !== "" && status === undefined) {
    return reply.status(400).send({ error: "status invalido." });
  }

  const filters: {
    requestedById?: string;
    status?: RequestStatus;
    destinationId?: string;
  } = {};
  if (typeof q.requestedById === "string" && q.requestedById.trim() !== "") {
    filters.requestedById = q.requestedById.trim();
  }
  if (status !== undefined) {
    filters.status = status;
  }
  if (typeof q.destinationId === "string" && q.destinationId.trim() !== "") {
    filters.destinationId = q.destinationId.trim();
  }

  const requests = await listMachineReplenishmentRequests(filters);
  return reply.send({ requests });
};

export const getMachineReplenishmentRequestByIdHandler: RouteHandlerMethod =
  async (request, reply) => {
    const { requestId } = request.params as { requestId?: string };
    if (!requestId) {
      return reply.status(400).send({ error: "requestId invalido." });
    }
    try {
      const row = await getMachineReplenishmentRequestById(requestId);
      return reply.send(row);
    } catch (error) {
      if (error instanceof MachineReplenishmentRequestNotFoundError) {
        return reply.status(404).send({ error: error.message });
      }
      throw error;
    }
  };

export const patchUpdateMachineReplenishmentRequest: RouteHandlerMethod =
  async (request, reply) => {
    const { requestId } = request.params as { requestId?: string };
    const body = (request.body ?? {}) as {
      destinationId?: string;
      movementCube?: string;
      typeMovimentPallet?: string;
      priorityLevel?: string;
    };

    if (!requestId) {
      return reply.status(400).send({ error: "requestId invalido." });
    }

    const patch: {
      destinationId?: string;
      movementCube?: string;
      typeMovimentPallet?: TypeMovimentPallet;
      priorityLevel?: PriorityLevel;
    } = {};

    if (typeof body.destinationId === "string") {
      if (body.destinationId.trim() === "") {
        return reply
          .status(400)
          .send({ error: "destinationId nao pode ser vazio." });
      }
      patch.destinationId = body.destinationId.trim();
    }
    if (typeof body.movementCube === "string") {
      if (body.movementCube.trim() === "") {
        return reply
          .status(400)
          .send({ error: "movementCube nao pode ser vazio." });
      }
      patch.movementCube = body.movementCube;
    }
    if (body.priorityLevel !== undefined) {
      if (!isPriorityLevel(body.priorityLevel)) {
        return reply.status(400).send({
          error: "priorityLevel invalido. Use VERY_HIGH, HIGH ou NORMAL.",
        });
      }
      patch.priorityLevel = body.priorityLevel;
    }
    if (body.typeMovimentPallet !== undefined) {
      if (typeof body.typeMovimentPallet !== "string") {
        return reply
          .status(400)
          .send({ error: "typeMovimentPallet invalido." });
      }
      const raw = body.typeMovimentPallet.trim();
      if (raw === "") {
        return reply
          .status(400)
          .send({ error: "typeMovimentPallet nao pode ser vazio." });
      }
      if (!isTypeMovimentPallet(raw)) {
        return reply.status(400).send({
          error: "typeMovimentPallet invalido. Use FORKLIFT ou ANY.",
        });
      }
      patch.typeMovimentPallet = raw;
    }

    if (Object.keys(patch).length === 0) {
      return reply.status(400).send({
        error:
          "Envie ao menos um campo: destinationId, movementCube, typeMovimentPallet ou priorityLevel.",
      });
    }

    try {
      const row = await updateMachineReplenishmentRequest(requestId, patch);
      return reply.send(row);
    } catch (error) {
      if (error instanceof MachineReplenishmentRequestNotFoundError) {
        return reply.status(404).send({ error: error.message });
      }
      if (error instanceof MachineReplenishmentRequestNotEditableError) {
        return reply.status(409).send({ error: error.message });
      }
      if (error instanceof MachineNotFoundError) {
        return reply.status(404).send({ error: error.message });
      }
      throw error;
    }
  };

export const deleteMachineReplenishmentRequestHandler: RouteHandlerMethod =
  async (request, reply) => {
    const { requestId } = request.params as { requestId?: string };
    if (!requestId) {
      return reply.status(400).send({ error: "requestId invalido." });
    }
    try {
      await deleteMachineReplenishmentRequest(requestId);
      return reply.status(204).send();
    } catch (error) {
      if (error instanceof MachineReplenishmentRequestNotFoundError) {
        return reply.status(404).send({ error: error.message });
      }
      if (error instanceof MachineReplenishmentRequestDeleteBlockedError) {
        return reply.status(409).send({ error: error.message });
      }
      throw error;
    }
  };

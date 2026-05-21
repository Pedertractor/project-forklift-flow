import {
  ForkliftTaskStatus,
  ForkliftTaskType,
  MovimentPalletTripSuggestionStatus,
  PriorityLevel,
  RequestStatus,
  MovimentPalletEquipmentType,
  RoleUser,
  TypeMovimentPallet,
} from "../generated/prisma/enums.js";
import {
  MachineReplenishmentRequestNotFoundError,
  MovimentPalletDeliverTaskAcceptError,
  MovimentPalletDeliverTaskCompletionError,
  MovimentPalletNotFoundError,
  MovimentPalletNotInOperatorSectorError,
  MovimentPalletOccupiedByOtherOperatorError,
  MovimentPalletPickupTaskAcceptError,
  MovimentPalletPickupTaskCompletionError,
  MovimentPalletTaskNotFoundError,
  MovimentPalletTypeNotAllowedForRoleError,
  MovimentOperatorHasIncompleteTasksError,
  OperatorWithoutBoundMovimentPalletError,
  OperatorWithoutSectorError,
  ReplenishmentRequestAlreadyAssignedError,
  ReplenishmentRequestTypeMismatchError,
  TripRouteSuggestionAcceptForbiddenError,
  TripRouteSuggestionNotFoundError,
  TripRouteSuggestionNotOpenError,
} from "../errors/domain-errors.js";
import type { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import {
  operatorMovimentPalletWsBroadcastTripSuggestionsUpdated,
  operatorMovimentPalletWsNotifyReplenishmentChange,
} from "../ws/operator-moviment-pallet-ws.hub.js";
import { requestStatusPatch } from "../utils/request-status-since.js";
import { machineReplenishmentRequestRepository } from "../repositories/machine-replenishment-request.repository.js";
import { operatorMachineSupplyRequestRepository } from "../repositories/operator-machine-supply-request.repository.js";
import { movimentPalletRepository } from "../repositories/moviment-pallet.repository.js";
import {
  isOpenTripTaskPairValid,
  movimentPalletTripSuggestionRepository,
} from "../repositories/moviment-pallet-trip-suggestion.repository.js";
import { movimentPalletTaskRepository } from "../repositories/moviment-pallet-task.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import {
  assertEquipmentMovimentType,
  openPoolTypesForEquipment,
  requestTypeAfterEquipmentClaim,
  requestTypeMatchesEquipment,
  type EquipmentMovimentType,
} from "../utils/replenishment-moviment-type.js";

const poolClaimableRequestStatuses: RequestStatus[] = [
  RequestStatus.PALLET_READY,
  RequestStatus.CREATED,
];

async function claimPoolReplenishmentRequestForTransportInTx(
  tx: Prisma.TransactionClient,
  requestId: string,
  currentStatus: RequestStatus,
  palletType: EquipmentMovimentType,
): Promise<void> {
  if (!poolClaimableRequestStatuses.includes(currentStatus)) {
    return;
  }
  const claimed = await tx.machineReplenishmentRequest.updateMany({
    where: {
      id: requestId,
      status: { in: poolClaimableRequestStatuses },
      typeMovimentPallet: { in: openPoolTypesForEquipment(palletType) },
    },
    data: {
      ...requestStatusPatch(RequestStatus.IN_PROGRESS),
      ...requestTypeAfterEquipmentClaim(palletType),
    },
  });
  if (claimed.count !== 1) {
    throw new ReplenishmentRequestAlreadyAssignedError();
  }
}

function equipmentTypesAllowedForRole(
  role: RoleUser,
): MovimentPalletEquipmentType[] {
  switch (role) {
    case RoleUser.FORKLIFT_OPERATOR:
      return [MovimentPalletEquipmentType.FORKLIFT];
    case RoleUser.FOLLOW_UP_OPERATOR:
      return [MovimentPalletEquipmentType.PALLET_TRUCK];
    case RoleUser.ADMIN:
      return [
        MovimentPalletEquipmentType.FORKLIFT,
        MovimentPalletEquipmentType.PALLET_TRUCK,
      ];
    default:
      return [];
  }
}

const priorityRank: Record<PriorityLevel, number> = {
  [PriorityLevel.VERY_HIGH]: 0,
  [PriorityLevel.HIGH]: 1,
  [PriorityLevel.NORMAL]: 2,
};

/** Retorna a prioridade mais urgente (ex.: VERY_HIGH vence HIGH e NORMAL). */
function mostUrgentPriority(a: PriorityLevel, b: PriorityLevel): PriorityLevel {
  return priorityRank[a] <= priorityRank[b] ? a : b;
}

async function assertNoIncompleteTasksBlockingNewAccept(
  palletId: string,
  excludeTaskIds?: string[],
) {
  const count =
    await movimentPalletTaskRepository.countIncompleteTasksAssignedToPallet(
      palletId,
      excludeTaskIds,
    );
  if (count > 0) {
    throw new MovimentOperatorHasIncompleteTasksError();
  }
}

export async function listMovimentPalletsForOperatorPicker(
  operatorUserId: string,
  role: RoleUser,
) {
  const types = equipmentTypesAllowedForRole(role);
  if (types.length === 0) {
    return [];
  }
  const user = await userRepository.findUniqueByIdWithSector(operatorUserId);
  if (!user?.sectorId) {
    return [];
  }
  return movimentPalletRepository.findManyForOperatorPicker({
    sectorId: user.sectorId,
    types,
  });
}

export async function getOperatorCurrentMovimentPallet(operatorUserId: string) {
  return movimentPalletRepository.findFirstByOperatorUserId(operatorUserId);
}

export async function bindOperatorToMovimentPallet(
  operatorUserId: string,
  role: RoleUser,
  movimentPalletId: string,
) {
  const allowed = equipmentTypesAllowedForRole(role);
  if (allowed.length === 0) {
    throw new MovimentPalletTypeNotAllowedForRoleError();
  }

  const user = await userRepository.findUniqueByIdWithSector(operatorUserId);
  if (!user?.sectorId) {
    throw new OperatorWithoutSectorError();
  }

  const pallet =
    await movimentPalletRepository.findUniqueById(movimentPalletId);
  if (!pallet) {
    throw new MovimentPalletNotFoundError();
  }
  if (!pallet.sectorId || pallet.sectorId !== user.sectorId) {
    throw new MovimentPalletNotInOperatorSectorError();
  }
  if (!allowed.includes(pallet.type)) {
    throw new MovimentPalletTypeNotAllowedForRoleError(
      "Este equipamento nao corresponde ao tipo permitido para o seu perfil.",
    );
  }
  if (
    pallet.operatorId !== null &&
    pallet.operatorId !== operatorUserId
  ) {
    throw new MovimentPalletOccupiedByOtherOperatorError();
  }

  return movimentPalletRepository.assignOperatorExclusive(
    movimentPalletId,
    operatorUserId,
  );
}

export async function unbindOperatorFromMovimentPallets(
  operatorUserId: string,
) {
  await movimentPalletRepository.disconnectOperatorFromAllMovimentPallets(
    operatorUserId,
  );
}

/** Itens na fila de entrega do tipo do equipamento (substituto leve de push). */
export async function listMovimentOperatorTransportNotifications(
  operatorUserId: string,
) {
  const { requests, onMachinePickupTasks } =
    await listOpenReplenishmentRequestsForMyMovimentType(operatorUserId);
  return {
    deliverRequestsAvailable: requests.length,
    onMachinePickupTasksAvailable: onMachinePickupTasks.length,
    deliverRequests: requests,
    onMachinePickupTasks,
  };
}

export async function listOpenReplenishmentRequestsForMyMovimentType(
  operatorUserId: string,
) {
  const pallet =
    await movimentPalletRepository.findFirstByOperatorUserId(operatorUserId);
  if (!pallet) {
    return { requests: [], onMachinePickupTasks: [] };
  }

  const user = await userRepository.findUniqueByIdWithSector(operatorUserId);
  const sectorId = user?.sectorId;

  if (sectorId == null || sectorId === "") {
    return { requests: [], onMachinePickupTasks: [] };
  }

  const [requests, onMachinePickupTasks] = await Promise.all([
    machineReplenishmentRequestRepository.findManyOpenPoolForSectorAndMovimentType(
      sectorId,
      pallet.type,
    ),
    movimentPalletTaskRepository.findManyOpenPickupTasksForSectorAndMovimentType(
      sectorId,
      pallet.type,
    ),
  ]);

  return { requests, onMachinePickupTasks };
}

/**
 * Equipamento vinculado ao operador + tarefas atribuídas a esse equipamento
 * (mesma ordenação que `listMyMovimentPalletTasks`). Útil para montar linha do
 * tempo no front após aceitar sugestão, retirada avulsa ou pedido de entrega.
 */
function sortTasksByRequestPriority<T extends { request: { priorityLevel: PriorityLevel }; createdAt: Date }>(
  tasks: T[],
): T[] {
  return [...tasks].sort((a, b) => {
    const pa = priorityRank[a.request.priorityLevel];
    const pb = priorityRank[b.request.priorityLevel];
    if (pa !== pb) {
      return pa - pb;
    }
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

async function listTasksVisibleToMovimentOperator(
  operatorUserId: string,
  _role: RoleUser,
) {
  const movimentPallet =
    await movimentPalletRepository.findFirstByOperatorUserId(operatorUserId);

  if (!movimentPallet) {
    return { movimentPallet: null, tasks: [] };
  }

  /** Somente tarefas do equipamento vinculado (fila / setor ficam em trip-suggestions e replenishment-requests). */
  const tasks = await movimentPalletTaskRepository.findManyForAssignedPallet(
    movimentPallet.id,
  );
  return {
    movimentPallet,
    tasks: sortTasksByRequestPriority(tasks),
  };
}

export async function getOperatorMovimentPalletActiveFlow(
  operatorUserId: string,
  role: RoleUser,
) {
  return listTasksVisibleToMovimentOperator(operatorUserId, role);
}

export async function listMyMovimentPalletTasks(
  operatorUserId: string,
  role: RoleUser,
) {
  const { tasks } = await listTasksVisibleToMovimentOperator(
    operatorUserId,
    role,
  );
  return tasks;
}

type TaskWithReq = Awaited<
  ReturnType<
    typeof movimentPalletTaskRepository.findManyOpenDeliverTasksForSectorAndMovimentType
  >
>[number];

type ComputedTripPair = {
  deliverTask: TaskWithReq;
  pickupTask: TaskWithReq;
  typeMovimentPallet: MovimentPalletEquipmentType;
};

type TripRouteSuggestionRow = {
  kind: "COMBINE_DELIVER_AND_PICKUP_AT_MACHINE";
  typeMovimentPallet: MovimentPalletEquipmentType;
  effectivePriority: PriorityLevel;
  deferRecommended: boolean;
  machine: { id: string; name: string; position: string };
  message: string;
  suggestedOrder: Array<{
    step: number;
    taskType: ForkliftTaskType;
    taskId: string;
    requestId: string;
    movementCube: string;
  }>;
  deliverTask: TaskWithReq;
  pickupTask: TaskWithReq;
  tripSuggestion: {
    id: string;
    status: MovimentPalletTripSuggestionStatus;
    acceptedAt: Date | null;
    acceptedByUserId: string | null;
    assignedMovimentPalletId: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
};

type StandalonePickupRow = {
  kind: "PICKUP_ONLY_AT_MACHINE";
  typeMovimentPallet: MovimentPalletEquipmentType;
  effectivePriority: PriorityLevel;
  deferRecommended: boolean;
  machine: { id: string; name: string; position: string };
  message: string;
  suggestedOrder: Array<{
    step: number;
    taskType: ForkliftTaskType;
    taskId: string;
    requestId: string;
    movementCube: string;
  }>;
  pickupTask: TaskWithReq;
};

type StandalonePickupEntry = {
  pickupTask: TaskWithReq;
  typeMovimentPallet: MovimentPalletEquipmentType;
};

type StandaloneDeliverEntry =
  | {
      kind: "POOL";
      poolRequest: PoolRequestRow;
      typeMovimentPallet: MovimentPalletEquipmentType;
    }
  | {
      kind: "DELIVER_TASK";
      deliverTask: TaskWithReq;
      typeMovimentPallet: MovimentPalletEquipmentType;
    };

type StandaloneDeliverRow = {
  kind: "DELIVER_ONLY_TO_MACHINE";
  typeMovimentPallet: MovimentPalletEquipmentType;
  effectivePriority: PriorityLevel;
  deferRecommended: boolean;
  machine: { id: string; name: string; position: string };
  message: string;
  suggestedOrder: Array<{
    step: number;
    taskType: ForkliftTaskType;
    taskId: string;
    requestId: string;
    movementCube: string;
  }>;
  requestId: string;
  deliverTask: TaskWithReq | null;
};

/** Candidatos a um unico par 1× entrega + 1× retirada por tipo/setor — sem criar DELIVER ate escolher o melhor. */
type TripPairCandidate =
  | {
      kind: "POOL";
      pickupTask: TaskWithReq;
      poolRequest: PoolRequestRow;
      typeMovimentPallet: MovimentPalletEquipmentType;
    }
  | {
      kind: "EXISTING_DELIVER";
      pickupTask: TaskWithReq;
      deliverTask: TaskWithReq;
      typeMovimentPallet: MovimentPalletEquipmentType;
    };

function effectivePriorityForTripCandidate(
  candidate: TripPairCandidate,
): PriorityLevel {
  const pickupPri = candidate.pickupTask.request.priorityLevel;
  if (candidate.kind === "POOL") {
    return mostUrgentPriority(pickupPri, candidate.poolRequest.priorityLevel);
  }
  return mostUrgentPriority(
    pickupPri,
    candidate.deliverTask.request.priorityLevel,
  );
}

function compareTripCandidates(
  a: TripPairCandidate,
  b: TripPairCandidate,
): number {
  const effA = priorityRank[effectivePriorityForTripCandidate(a)];
  const effB = priorityRank[effectivePriorityForTripCandidate(b)];
  if (effA !== effB) {
    return effA - effB;
  }
  const ta = new Date(a.pickupTask.createdAt).getTime();
  const tb = new Date(b.pickupTask.createdAt).getTime();
  if (ta !== tb) {
    return ta - tb;
  }
  /** Empate: prioriza recebimento CREATED (POOL) antes de entrega DELIVER ja aberta — alinha ao comportamento anterior. */
  const kindPri = (c: TripPairCandidate) => (c.kind === "POOL" ? 0 : 1);
  const kdiff = kindPri(a) - kindPri(b);
  if (kdiff !== 0) {
    return kdiff;
  }
  const destA =
    a.kind === "POOL"
      ? a.poolRequest.destinationId
      : a.deliverTask.request.destinationId;
  const destB =
    b.kind === "POOL"
      ? b.poolRequest.destinationId
      : b.deliverTask.request.destinationId;
  const dCmp = destA.localeCompare(destB);
  if (dCmp !== 0) {
    return dCmp;
  }
  if (a.kind === "POOL" && b.kind === "POOL") {
    return a.poolRequest.id.localeCompare(b.poolRequest.id);
  }
  if (a.kind === "EXISTING_DELIVER" && b.kind === "EXISTING_DELIVER") {
    const dca = new Date(a.deliverTask.createdAt).getTime();
    const dcb = new Date(b.deliverTask.createdAt).getTime();
    if (dca !== dcb) {
      return dca - dcb;
    }
    return a.deliverTask.id.localeCompare(b.deliverTask.id);
  }
  return a.pickupTask.id.localeCompare(b.pickupTask.id);
}

function emptyPriorityContext() {
  return {
    mostUrgentOpenInSector: null as PriorityLevel | null,
    hint: undefined as string | undefined,
  };
}

async function ensureOpenDeliverTaskForPoolRequest(
  requestId: string,
  requestedById: string,
): Promise<TaskWithReq> {
  const existing =
    await movimentPalletTaskRepository.findOpenDeliverForRequest(requestId);
  if (existing) {
    return existing;
  }
  return movimentPalletTaskRepository.createOpenDeliverTaskForRequest(
    requestId,
    requestedById,
  );
}

type PoolRequestRow = Awaited<
  ReturnType<
    typeof machineReplenishmentRequestRepository.findManyOpenPoolForSectorAndMovimentType
  >
>[number];

function sortPoolByPriority(requests: PoolRequestRow[]) {
  return [...requests].sort((a, b) => {
    const pa = priorityRank[a.priorityLevel];
    const pb = priorityRank[b.priorityLevel];
    if (pa !== pb) {
      return pa - pb;
    }
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

async function computeTripPairsAndSectorUrgency(
  sectorId: string,
  types: MovimentPalletEquipmentType[],
): Promise<{
  pairs: ComputedTripPair[];
  standalonePickups: StandalonePickupEntry[];
  standaloneDelivers: StandaloneDeliverEntry[];
  mostUrgentOpenInSector: PriorityLevel | null;
}> {
  let mostUrgentOpenInSector: PriorityLevel | null = null;
  const pairs: ComputedTripPair[] = [];
  const standalonePickups: StandalonePickupEntry[] = [];
  const standaloneDelivers: StandaloneDeliverEntry[] = [];

  for (const type of types) {
    const [pickups, delivers, poolRequests] = await Promise.all([
      movimentPalletTaskRepository.findManyOpenPickupTasksForSectorAndMovimentType(
        sectorId,
        type,
      ),
      movimentPalletTaskRepository.findManyOpenDeliverTasksForSectorAndMovimentType(
        sectorId,
        type,
      ),
      machineReplenishmentRequestRepository.findManyOpenPoolForSectorAndMovimentType(
        sectorId,
        type,
      ),
    ]);

    for (const t of pickups) {
      mostUrgentOpenInSector =
        mostUrgentOpenInSector === null
          ? t.request.priorityLevel
          : mostUrgentPriority(mostUrgentOpenInSector, t.request.priorityLevel);
    }
    for (const t of delivers) {
      mostUrgentOpenInSector =
        mostUrgentOpenInSector === null
          ? t.request.priorityLevel
          : mostUrgentPriority(mostUrgentOpenInSector, t.request.priorityLevel);
    }
    for (const r of poolRequests) {
      mostUrgentOpenInSector =
        mostUrgentOpenInSector === null
          ? r.priorityLevel
          : mostUrgentPriority(mostUrgentOpenInSector, r.priorityLevel);
    }

    const pairedPickupIds = new Set<string>();
    const pairedDeliverIds = new Set<string>();
    const usedPoolRequestIds = new Set<string>();
    /** No maximo **uma** sugestao combinada por `typeMovimentPallet` neste setor (1 DELIVER + 1 PICKUP). */
    const candidates: TripPairCandidate[] = [];

    const pickupsByMachine = new Map<string, TaskWithReq[]>();
    for (const t of pickups) {
      const mid = t.request.destinationId;
      const list = pickupsByMachine.get(mid) ?? [];
      list.push(t);
      pickupsByMachine.set(mid, list);
    }

    const deliversByMachine = new Map<string, TaskWithReq[]>();
    for (const t of delivers) {
      const mid = t.request.destinationId;
      const list = deliversByMachine.get(mid) ?? [];
      list.push(t);
      deliversByMachine.set(mid, list);
    }

    const poolByMachine = new Map<string, PoolRequestRow[]>();
    for (const r of poolRequests) {
      const mid = r.destinationId;
      const list = poolByMachine.get(mid) ?? [];
      list.push(r);
      poolByMachine.set(mid, list);
    }

    if (pickups.length > 0) {
      for (const [machineId, machinePickups] of pickupsByMachine) {
        const machineDelivers = deliversByMachine.get(machineId) ?? [];
        const machinePool = poolByMachine.get(machineId) ?? [];

        const sortedDeliver = sortTasksByRequestPriority(machineDelivers);
        const sortedPickups = sortTasksByRequestPriority(machinePickups);
        const sortedPool = sortPoolByPriority(machinePool);

        for (const pickupTask of sortedPickups) {
          for (const poolReq of sortedPool) {
            if (poolReq.id === pickupTask.requestId) {
              continue;
            }
            candidates.push({
              kind: "POOL",
              pickupTask,
              poolRequest: poolReq,
              typeMovimentPallet: type,
            });
          }
          for (const deliverTask of sortedDeliver) {
            if (deliverTask.requestId === pickupTask.requestId) {
              continue;
            }
            candidates.push({
              kind: "EXISTING_DELIVER",
              pickupTask,
              deliverTask,
              typeMovimentPallet: type,
            });
          }
        }
      }

      candidates.sort(compareTripCandidates);

      const pairsForType: ComputedTripPair[] = [];
      if (candidates.length > 0) {
        const best = candidates[0]!;
        if (best.kind === "POOL") {
          usedPoolRequestIds.add(best.poolRequest.id);
          const deliverTask = await ensureOpenDeliverTaskForPoolRequest(
            best.poolRequest.id,
            best.poolRequest.requestedById,
          );
          pairsForType.push({
            deliverTask,
            pickupTask: best.pickupTask,
            typeMovimentPallet: type,
          });
        } else {
          usedPoolRequestIds.add(best.deliverTask.requestId);
          pairsForType.push({
            deliverTask: best.deliverTask,
            pickupTask: best.pickupTask,
            typeMovimentPallet: type,
          });
        }
      }

      if (pairsForType.length > 0) {
        const pair = pairsForType[0]!;
        pairedPickupIds.add(pair.pickupTask.id);
        pairedDeliverIds.add(pair.deliverTask.id);
      }
      pairs.push(...pairsForType);

      for (const pickupTask of pickups) {
        if (!pairedPickupIds.has(pickupTask.id)) {
          standalonePickups.push({ pickupTask, typeMovimentPallet: type });
        }
      }
    }

    const operatorLinkedPoolIds =
      await operatorMachineSupplyRequestRepository.findFulfilledReplenishmentIds(
        poolRequests.map((r) => r.id),
      );

    for (const poolReq of sortPoolByPriority(poolRequests)) {
      if (usedPoolRequestIds.has(poolReq.id)) {
        continue;
      }
      if (!operatorLinkedPoolIds.has(poolReq.id)) {
        continue;
      }
      standaloneDelivers.push({
        kind: "POOL",
        poolRequest: poolReq,
        typeMovimentPallet: type,
      });
    }

    for (const deliverTask of sortTasksByRequestPriority(delivers)) {
      if (pairedDeliverIds.has(deliverTask.id)) {
        continue;
      }
      if (deliverTask.assignedMovimentPalletId !== null) {
        continue;
      }
      if (deliverTask.status !== ForkliftTaskStatus.CREATED) {
        continue;
      }
      standaloneDelivers.push({
        kind: "DELIVER_TASK",
        deliverTask,
        typeMovimentPallet: type,
      });
    }
  }

  return {
    pairs: dedupeComputedTripPairs(pairs),
    standalonePickups: dedupeStandalonePickupEntries(standalonePickups),
    standaloneDelivers,
    mostUrgentOpenInSector,
  };
}

async function tryCompleteTripSuggestionForPickupTask(pickupTaskId: string) {
  const suggestion =
    await movimentPalletTripSuggestionRepository.findAcceptedByPickupTaskId(
      pickupTaskId,
    );
  if (!suggestion) {
    return;
  }
  if (
    suggestion.deliverTask.status === ForkliftTaskStatus.COMPLETED &&
    suggestion.pickupTask.status === ForkliftTaskStatus.COMPLETED
  ) {
    await movimentPalletTripSuggestionRepository.markCompleted(suggestion.id);
  }
}

function dedupeComputedTripPairs(pairs: ComputedTripPair[]): ComputedTripPair[] {
  const byPickup = new Map<string, ComputedTripPair>();
  for (const pair of pairs) {
    if (!byPickup.has(pair.pickupTask.id)) {
      byPickup.set(pair.pickupTask.id, pair);
    }
  }
  return [...byPickup.values()];
}

function dedupeStandalonePickupEntries(
  entries: StandalonePickupEntry[],
): StandalonePickupEntry[] {
  const byPickup = new Map<string, StandalonePickupEntry>();
  for (const entry of entries) {
    if (!byPickup.has(entry.pickupTask.id)) {
      byPickup.set(entry.pickupTask.id, entry);
    }
  }
  return [...byPickup.values()];
}

function dedupeStandalonePickupRows(
  rows: StandalonePickupRow[],
): StandalonePickupRow[] {
  const byPickup = new Map<string, StandalonePickupRow>();
  for (const row of rows) {
    if (!byPickup.has(row.pickupTask.id)) {
      byPickup.set(row.pickupTask.id, row);
    }
  }
  return [...byPickup.values()];
}

function dedupeCombinedSuggestionsByPickup(
  rows: TripRouteSuggestionRow[],
): TripRouteSuggestionRow[] {
  const bestByPickup = new Map<string, TripRouteSuggestionRow>();
  for (const row of rows) {
    const pickupId = row.pickupTask.id;
    const current = bestByPickup.get(pickupId);
    if (
      !current ||
      row.tripSuggestion.updatedAt > current.tripSuggestion.updatedAt
    ) {
      bestByPickup.set(pickupId, row);
    }
  }
  const bestByRequest = new Map<string, TripRouteSuggestionRow>();
  for (const row of bestByPickup.values()) {
    const requestId = row.pickupTask.requestId;
    const current = bestByRequest.get(requestId);
    if (
      !current ||
      row.tripSuggestion.updatedAt > current.tripSuggestion.updatedAt
    ) {
      bestByRequest.set(requestId, row);
    }
  }
  return [...bestByRequest.values()];
}

function excludeStandalonesCoveredByCombined(
  suggestions: TripRouteSuggestionRow[],
  standalonePickups: StandalonePickupRow[],
  standaloneDelivers: StandaloneDeliverRow[],
) {
  const pairedPickupIds = new Set(suggestions.map((s) => s.pickupTask.id));
  const pairedPickupRequestIds = new Set(
    suggestions.map((s) => s.pickupTask.requestId),
  );
  const pairedDeliverIds = new Set(suggestions.map((s) => s.deliverTask.id));
  const pairedDeliverRequestIds = new Set(
    suggestions.map((s) => s.deliverTask.requestId),
  );
  const combinedMachineIds = new Set(suggestions.map((s) => s.machine.id));

  return {
    standalonePickupTasks: standalonePickups.filter(
      (s) =>
        !pairedPickupIds.has(s.pickupTask.id) &&
        !pairedPickupRequestIds.has(s.pickupTask.requestId),
    ),
    standaloneDeliverTasks: standaloneDelivers.filter((d) => {
      if (d.deliverTask && pairedDeliverIds.has(d.deliverTask.id)) {
        return false;
      }
      if (pairedDeliverRequestIds.has(d.requestId)) {
        return false;
      }
      if (combinedMachineIds.has(d.machine.id)) {
        return false;
      }
      return true;
    }),
  };
}

async function syncTripSuggestionsToDb(
  sectorId: string,
  types: MovimentPalletEquipmentType[],
  pairs: ComputedTripPair[],
) {
  const openRows =
    await movimentPalletTripSuggestionRepository.findManyOpenForSector(
      sectorId,
      types,
    );
  const validKeys = new Set(
    pairs.map((p) => `${p.deliverTask.id}:${p.pickupTask.id}`),
  );
  const deliverIdForPickup = new Map(
    pairs.map((p) => [p.pickupTask.id, p.deliverTask.id] as const),
  );
  const toExpire: string[] = [];
  for (const row of openRows) {
    const key = `${row.deliverTaskId}:${row.pickupTaskId}`;
    const canonicalDeliverId = deliverIdForPickup.get(row.pickupTaskId);
    if (
      canonicalDeliverId !== undefined &&
      row.deliverTaskId !== canonicalDeliverId
    ) {
      toExpire.push(row.id);
      continue;
    }
    if (!validKeys.has(key)) {
      toExpire.push(row.id);
      continue;
    }
    const { deliverTask, pickupTask } = row;
    if (
      !isOpenTripTaskPairValid(
        deliverTask.type,
        deliverTask.status,
        pickupTask.type,
        pickupTask.status,
        deliverTask.requestId,
        pickupTask.requestId,
        deliverTask.request.destinationId,
        pickupTask.request.destinationId,
        deliverTask.request.status,
        pickupTask.request.status,
      )
    ) {
      toExpire.push(row.id);
    }
  }
  await movimentPalletTripSuggestionRepository.expireByIds(toExpire);
  const typesNotified = new Set<MovimentPalletEquipmentType>();
  for (const p of pairs) {
    const { created } = await movimentPalletTripSuggestionRepository.upsertOpenPair({
      deliverTaskId: p.deliverTask.id,
      pickupTaskId: p.pickupTask.id,
      machineId: p.deliverTask.request.destinationId,
      typeMovimentPallet: p.typeMovimentPallet,
    });
    if (created) {
      typesNotified.add(p.typeMovimentPallet);
    }
  }

  for (const equipmentType of typesNotified) {
    operatorMovimentPalletWsBroadcastTripSuggestionsUpdated(
      sectorId,
      equipmentType as TypeMovimentPallet,
    );
  }
}

function mapDbRowToTripRouteSuggestion(
  row: {
    id: string;
    status: MovimentPalletTripSuggestionStatus;
    acceptedAt: Date | null;
    acceptedByUserId: string | null;
    assignedMovimentPalletId: string | null;
    createdAt: Date;
    updatedAt: Date;
    deliverTask: TaskWithReq;
    pickupTask: TaskWithReq;
    typeMovimentPallet: MovimentPalletEquipmentType;
  },
  mostUrgentOpenInSector: PriorityLevel | null,
): TripRouteSuggestionRow {
  const effectivePriority = mostUrgentPriority(
    row.pickupTask.request.priorityLevel,
    row.deliverTask.request.priorityLevel,
  );
  const deferRecommended =
    mostUrgentOpenInSector !== null &&
    priorityRank[effectivePriority] > priorityRank[mostUrgentOpenInSector];

  const machine = row.pickupTask.request.destination;
  const baseMessage =
    `Na máquina ${machine.name} (${machine.position}): há pallet no recebimento destinado a esta máquina e retirada já solicitada pelo operador da máquina. ` +
    `Sugestão: uma única ida — buscar no recebimento, entregar na máquina, retirar o prisma finalizado e levar à expedição.`;

  const prioritySuffix = deferRecommended
    ? ` Prioridade desta sugestao: ${effectivePriority}; ha itens mais urgentes em aberto no setor (${mostUrgentOpenInSector}).`
    : "";

  return {
    kind: "COMBINE_DELIVER_AND_PICKUP_AT_MACHINE",
    typeMovimentPallet: row.typeMovimentPallet,
    effectivePriority,
    deferRecommended,
    machine: {
      id: machine.id,
      name: machine.name,
      position: machine.position,
    },
    message: baseMessage + prioritySuffix,
    suggestedOrder: [
      {
        step: 1,
        taskType: ForkliftTaskType.DELIVER_TO_MACHINE,
        taskId: row.deliverTask.id,
        requestId: row.deliverTask.requestId,
        movementCube: row.deliverTask.request.movementCube,
      },
      {
        step: 2,
        taskType: ForkliftTaskType.PICKUP_TO_EXPEDITION,
        taskId: row.pickupTask.id,
        requestId: row.pickupTask.requestId,
        movementCube: row.pickupTask.request.movementCube,
      },
    ],
    deliverTask: row.deliverTask,
    pickupTask: row.pickupTask,
    tripSuggestion: {
      id: row.id,
      status: row.status,
      acceptedAt: row.acceptedAt,
      acceptedByUserId: row.acceptedByUserId,
      assignedMovimentPalletId: row.assignedMovimentPalletId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    },
  };
}

function mapStandalonePickupToRow(
  entry: StandalonePickupEntry,
  mostUrgentOpenInSector: PriorityLevel | null,
): StandalonePickupRow {
  const { pickupTask, typeMovimentPallet } = entry;
  const effectivePriority = pickupTask.request.priorityLevel;
  const deferRecommended =
    mostUrgentOpenInSector !== null &&
    priorityRank[effectivePriority] > priorityRank[mostUrgentOpenInSector];

  const machine = pickupTask.request.destination;
  const baseMessage =
    `Na máquina ${machine.name} (${machine.position}): retirada avulsa sugerida — prisma pronto na máquina. ` +
    `Aceite para retirar o pallet e levar à expedição (sem entrega combinada nesta máquina).`;

  const prioritySuffix = deferRecommended
    ? ` Prioridade: ${effectivePriority}; ha itens mais urgentes em aberto no setor (${mostUrgentOpenInSector}).`
    : "";

  return {
    kind: "PICKUP_ONLY_AT_MACHINE",
    typeMovimentPallet,
    effectivePriority,
    deferRecommended,
    machine: {
      id: machine.id,
      name: machine.name,
      position: machine.position,
    },
    message: baseMessage + prioritySuffix,
    suggestedOrder: [
      {
        step: 1,
        taskType: ForkliftTaskType.PICKUP_TO_EXPEDITION,
        taskId: pickupTask.id,
        requestId: pickupTask.requestId,
        movementCube: pickupTask.request.movementCube,
      },
    ],
    pickupTask,
  };
}

function mapStandaloneDeliverToRow(
  entry: StandaloneDeliverEntry,
  mostUrgentOpenInSector: PriorityLevel | null,
): StandaloneDeliverRow {
  const machine =
    entry.kind === "POOL"
      ? entry.poolRequest.destination
      : entry.deliverTask.request.destination;
  const effectivePriority =
    entry.kind === "POOL"
      ? entry.poolRequest.priorityLevel
      : entry.deliverTask.request.priorityLevel;
  const movementCube =
    entry.kind === "POOL"
      ? entry.poolRequest.movementCube
      : entry.deliverTask.request.movementCube;
  const requestId =
    entry.kind === "POOL" ? entry.poolRequest.id : entry.deliverTask.requestId;
  const deliverTask = entry.kind === "DELIVER_TASK" ? entry.deliverTask : null;
  const taskId =
    deliverTask?.id ??
    `pool:${entry.kind === "POOL" ? entry.poolRequest.id : ""}`;

  const deferRecommended =
    mostUrgentOpenInSector !== null &&
    priorityRank[effectivePriority] > priorityRank[mostUrgentOpenInSector];

  const baseMessage =
    entry.kind === "POOL"
      ? `Entrega avulsa sugerida: prisma ${movementCube} no recebimento para a máquina ${machine.name} (${machine.position}). ` +
        `Aceite para buscar no recebimento e entregar na máquina (sem retirada combinada neste momento).`
      : `Entrega avulsa sugerida: levar prisma ${movementCube} do recebimento até a máquina ${machine.name} (${machine.position}).`;

  const prioritySuffix = deferRecommended
    ? ` Prioridade: ${effectivePriority}; há itens mais urgentes em aberto no setor (${mostUrgentOpenInSector}).`
    : "";

  return {
    kind: "DELIVER_ONLY_TO_MACHINE",
    typeMovimentPallet: entry.typeMovimentPallet,
    effectivePriority,
    deferRecommended,
    machine: {
      id: machine.id,
      name: machine.name,
      position: machine.position,
    },
    message: baseMessage + prioritySuffix,
    suggestedOrder: [
      {
        step: 1,
        taskType: ForkliftTaskType.DELIVER_TO_MACHINE,
        taskId,
        requestId,
        movementCube,
      },
    ],
    requestId,
    deliverTask,
  };
}

/**
 * Sugestoes de viagem persistidas em `MovimentPalletTripSuggestion`, sincronizadas
 * a partir do par entrega+retirada na mesma maquina.
 */
export async function listTripRouteSuggestionsForOperator(
  operatorUserId: string,
  role: RoleUser,
) {
  const types = equipmentTypesAllowedForRole(role);
  if (types.length === 0) {
    return {
      suggestions: [] as TripRouteSuggestionRow[],
      standalonePickupTasks: [] as StandalonePickupRow[],
      standaloneDeliverTasks: [] as StandaloneDeliverRow[],
      priorityContext: emptyPriorityContext(),
    };
  }

  const user = await userRepository.findUniqueByIdWithSector(operatorUserId);
  if (!user?.sectorId) {
    return {
      suggestions: [],
      standalonePickupTasks: [],
      standaloneDeliverTasks: [],
      priorityContext: emptyPriorityContext(),
    };
  }

  const { pairs, standalonePickups, standaloneDelivers, mostUrgentOpenInSector } =
    await computeTripPairsAndSectorUrgency(user.sectorId, types);

  const uniquePairs = dedupeComputedTripPairs(pairs);

  await syncTripSuggestionsToDb(user.sectorId, types, uniquePairs);

  await movimentPalletTripSuggestionRepository.reconcileCompletedAcceptedInSector(
    user.sectorId,
    types,
  );

  const dbRows =
    await movimentPalletTripSuggestionRepository.findManyOpenListableForOperator(
      user.sectorId,
      types,
    );

  const suggestions: TripRouteSuggestionRow[] = [];
  for (const row of dbRows) {
    if (row.status === MovimentPalletTripSuggestionStatus.OPEN) {
      if (
        !isOpenTripTaskPairValid(
          row.deliverTask.type,
          row.deliverTask.status,
          row.pickupTask.type,
          row.pickupTask.status,
          row.deliverTask.requestId,
          row.pickupTask.requestId,
          row.deliverTask.request.destinationId,
          row.pickupTask.request.destinationId,
          row.deliverTask.request.status,
          row.pickupTask.request.status,
        )
      ) {
        continue;
      }
    }
    suggestions.push(
      mapDbRowToTripRouteSuggestion(row, mostUrgentOpenInSector),
    );
  }

  const dedupedSuggestions = dedupeCombinedSuggestionsByPickup(suggestions);

  dedupedSuggestions.sort((a, b) => {
    const ra = priorityRank[a.effectivePriority];
    const rb = priorityRank[b.effectivePriority];
    if (ra !== rb) {
      return ra - rb;
    }
    return a.machine.id.localeCompare(b.machine.id);
  });

  const standalonePickupTasks: StandalonePickupRow[] = dedupeStandalonePickupRows(
    standalonePickups.map((s) => mapStandalonePickupToRow(s, mostUrgentOpenInSector)),
  );
  standalonePickupTasks.sort((a, b) => {
    const ra = priorityRank[a.effectivePriority];
    const rb = priorityRank[b.effectivePriority];
    if (ra !== rb) {
      return ra - rb;
    }
    return a.machine.id.localeCompare(b.machine.id);
  });

  const standaloneDeliverTasks: StandaloneDeliverRow[] = standaloneDelivers.map(
    (s) => mapStandaloneDeliverToRow(s, mostUrgentOpenInSector),
  );
  standaloneDeliverTasks.sort((a, b) => {
    const ra = priorityRank[a.effectivePriority];
    const rb = priorityRank[b.effectivePriority];
    if (ra !== rb) {
      return ra - rb;
    }
    return a.machine.id.localeCompare(b.machine.id);
  });

  const filtered = excludeStandalonesCoveredByCombined(
    dedupedSuggestions,
    standalonePickupTasks,
    standaloneDeliverTasks,
  );

  return {
    suggestions: dedupedSuggestions,
    standalonePickupTasks: filtered.standalonePickupTasks,
    standaloneDeliverTasks: filtered.standaloneDeliverTasks,
    priorityContext: {
      mostUrgentOpenInSector,
      hint: undefined,
    },
  };
}

export async function acceptTripRouteSuggestion(
  operatorUserId: string,
  role: RoleUser,
  tripSuggestionId: string,
) {
  const allowed = equipmentTypesAllowedForRole(role);
  if (allowed.length === 0) {
    throw new MovimentPalletTypeNotAllowedForRoleError();
  }

  const user = await userRepository.findUniqueByIdWithSector(operatorUserId);
  if (!user?.sectorId) {
    throw new OperatorWithoutSectorError();
  }

  const full =
    await movimentPalletTripSuggestionRepository.findByIdWithTasks(
      tripSuggestionId,
    );
  if (!full) {
    throw new TripRouteSuggestionNotFoundError();
  }
  if (full.status !== MovimentPalletTripSuggestionStatus.OPEN) {
    throw new TripRouteSuggestionNotOpenError();
  }
  if (full.machine.sectorId !== user.sectorId) {
    throw new TripRouteSuggestionAcceptForbiddenError(
      "Sugestao nao pertence ao seu setor.",
    );
  }
  if (!allowed.includes(full.typeMovimentPallet)) {
    throw new MovimentPalletTypeNotAllowedForRoleError();
  }

  const pallet =
    await movimentPalletRepository.findFirstByOperatorUserId(operatorUserId);
  if (!pallet) {
    throw new OperatorWithoutBoundMovimentPalletError();
  }
  if (pallet.type !== full.typeMovimentPallet) {
    throw new MovimentPalletTypeNotAllowedForRoleError();
  }
  if (
    !requestTypeMatchesEquipment(
      full.deliverTask.request.typeMovimentPallet,
      assertEquipmentMovimentType(pallet.type),
    )
  ) {
    throw new ReplenishmentRequestTypeMismatchError();
  }

  const dt = full.deliverTask;
  const pt = full.pickupTask;
  if (
    dt.assignedMovimentPalletId &&
    dt.assignedMovimentPalletId !== pallet.id
  ) {
    throw new TripRouteSuggestionAcceptForbiddenError(
      "A entrega ja esta vinculada a outro equipamento.",
    );
  }
  if (
    pt.assignedMovimentPalletId &&
    pt.assignedMovimentPalletId !== pallet.id
  ) {
    throw new TripRouteSuggestionAcceptForbiddenError(
      "A retirada ja esta vinculada a outro equipamento.",
    );
  }
  if (
    !isOpenTripTaskPairValid(
      dt.type,
      dt.status,
      pt.type,
      pt.status,
      dt.requestId,
      pt.requestId,
      dt.request.destinationId,
      pt.request.destinationId,
      dt.request.status,
      pt.request.status,
    )
  ) {
    throw new TripRouteSuggestionNotOpenError(
      "Par de tarefas nao esta mais disponivel para aceite.",
    );
  }

  await assertNoIncompleteTasksBlockingNewAccept(pallet.id);

  await prisma.$transaction(async (tx) => {
    await claimPoolReplenishmentRequestForTransportInTx(
      tx,
      dt.requestId,
      dt.request.status,
      assertEquipmentMovimentType(pallet.type),
    );

    const claimed = await tx.movimentPalletTripSuggestion.updateMany({
      where: {
        id: tripSuggestionId,
        status: MovimentPalletTripSuggestionStatus.OPEN,
      },
      data: {
        status: MovimentPalletTripSuggestionStatus.ACCEPTED,
        acceptedByUserId: operatorUserId,
        assignedMovimentPalletId: pallet.id,
        acceptedAt: new Date(),
      },
    });
    if (claimed.count !== 1) {
      throw new TripRouteSuggestionNotOpenError();
    }

    const deliverData: {
      assignedMovimentPalletId: string;
      status?: ForkliftTaskStatus;
    } = { assignedMovimentPalletId: pallet.id };
    if (dt.status === ForkliftTaskStatus.CREATED) {
      deliverData.status = ForkliftTaskStatus.ASSIGNED;
    }
    await tx.movimentPalletTask.update({
      where: { id: dt.id },
      data: deliverData,
    });

    const pickupData: {
      assignedMovimentPalletId: string;
      status?: ForkliftTaskStatus;
    } = { assignedMovimentPalletId: pallet.id };
    if (pt.status === ForkliftTaskStatus.CREATED) {
      pickupData.status = ForkliftTaskStatus.ASSIGNED;
    }
    await tx.movimentPalletTask.update({
      where: { id: pt.id },
      data: pickupData,
    });
  });

  const tripSuggestion =
    await movimentPalletTripSuggestionRepository.findByIdWithTasks(
      tripSuggestionId,
    );
  if (!tripSuggestion) {
    throw new Error("Inconsistencia ao carregar sugestao apos aceite.");
  }

  return {
    tripSuggestion,
    deliverTask: tripSuggestion.deliverTask,
    pickupTask: tripSuggestion.pickupTask,
  };
}

const openPickupTaskStatusesAccept: ForkliftTaskStatus[] = [
  ForkliftTaskStatus.CREATED,
  ForkliftTaskStatus.ASSIGNED,
  ForkliftTaskStatus.IN_PROGRESS,
];

/** Vincula retirada CREATED sem equipamento ao pallet do operador (aceite / conclusao). */
async function claimOpenPickupTaskToPallet(params: {
  taskId: string;
  palletId: string;
  palletEquipmentType: EquipmentMovimentType;
  sectorId: string;
}): Promise<boolean> {
  const claimed = await prisma.movimentPalletTask.updateMany({
    where: {
      id: params.taskId,
      type: ForkliftTaskType.PICKUP_TO_EXPEDITION,
      status: ForkliftTaskStatus.CREATED,
      assignedMovimentPalletId: null,
      request: {
        status: RequestStatus.ON_MACHINE,
        typeMovimentPallet: {
          in: openPoolTypesForEquipment(params.palletEquipmentType),
        },
        destination: { sectorId: params.sectorId },
      },
    },
    data: {
      assignedMovimentPalletId: params.palletId,
      status: ForkliftTaskStatus.ASSIGNED,
    },
  });
  return claimed.count === 1;
}

/**
 * Apos entrega na maquina, vincula retirada ja aberta (mesma solicitacao) ao
 * equipamento que concluiu a entrega — evita retirada visivel sem assignedMovimentPalletId.
 */
async function linkOpenPickupToPalletAfterDeliver(
  requestId: string,
  palletId: string,
  palletEquipmentType: EquipmentMovimentType,
  sectorId: string,
) {
  await prisma.movimentPalletTask.updateMany({
    where: {
      requestId,
      type: ForkliftTaskType.PICKUP_TO_EXPEDITION,
      status: {
        in: [ForkliftTaskStatus.CREATED, ForkliftTaskStatus.ASSIGNED],
      },
      assignedMovimentPalletId: null,
      request: {
        status: RequestStatus.ON_MACHINE,
        typeMovimentPallet: {
          in: openPoolTypesForEquipment(palletEquipmentType),
        },
        destination: { sectorId },
      },
    },
    data: {
      assignedMovimentPalletId: palletId,
      status: ForkliftTaskStatus.ASSIGNED,
    },
  });
}

/**
 * Operador de empilhadeira aceita retirada ja solicitada (ON_MACHINE) quando
 * nao ha sugestao de viagem combinada — tarefa fica vinculada ao equipamento.
 */
const openDeliverTaskStatusesAccept: ForkliftTaskStatus[] = [
  ForkliftTaskStatus.CREATED,
];

/**
 * Aceita tarefa DELIVER_TO_MACHINE avulsa (CREATED, sem equipamento) sugerida na fila de rotas.
 */
export async function acceptOpenDeliverTaskForMovimentOperator(
  operatorUserId: string,
  role: RoleUser,
  taskId: string,
) {
  const allowed = equipmentTypesAllowedForRole(role);
  if (allowed.length === 0) {
    throw new MovimentPalletTypeNotAllowedForRoleError();
  }

  const user = await userRepository.findUniqueByIdWithSector(operatorUserId);
  if (!user?.sectorId) {
    throw new OperatorWithoutSectorError();
  }

  const pallet =
    await movimentPalletRepository.findFirstByOperatorUserId(operatorUserId);
  if (!pallet) {
    throw new OperatorWithoutBoundMovimentPalletError();
  }
  if (!allowed.includes(pallet.type)) {
    throw new MovimentPalletTypeNotAllowedForRoleError();
  }

  const task = await movimentPalletTaskRepository.findByIdWithRequest(taskId);
  if (!task) {
    throw new MovimentPalletTaskNotFoundError();
  }

  if (task.type !== ForkliftTaskType.DELIVER_TO_MACHINE) {
    throw new MovimentPalletDeliverTaskAcceptError(
      "Somente tarefas de entrega (DELIVER_TO_MACHINE) podem ser aceitas por este endpoint.",
    );
  }

  if (!openDeliverTaskStatusesAccept.includes(task.status)) {
    throw new MovimentPalletDeliverTaskAcceptError(
      "Esta entrega nao esta mais disponivel (ja atribuida, em andamento ou concluida).",
    );
  }

  if (
    !requestTypeMatchesEquipment(
      task.request.typeMovimentPallet,
      assertEquipmentMovimentType(pallet.type),
    )
  ) {
    throw new ReplenishmentRequestTypeMismatchError();
  }

  const destSectorId = task.request.destination.sector?.id;
  if (!destSectorId || destSectorId !== user.sectorId) {
    throw new MovimentPalletDeliverTaskAcceptError(
      "Esta entrega nao pertence ao seu setor.",
    );
  }

  if (task.assignedMovimentPalletId && task.assignedMovimentPalletId !== pallet.id) {
    throw new MovimentPalletDeliverTaskAcceptError(
      "Esta entrega ja esta vinculada a outro equipamento.",
    );
  }

  await assertNoIncompleteTasksBlockingNewAccept(pallet.id, [taskId]);

  const claimed = await prisma.movimentPalletTask.updateMany({
    where: {
      id: taskId,
      type: ForkliftTaskType.DELIVER_TO_MACHINE,
      status: ForkliftTaskStatus.CREATED,
      assignedMovimentPalletId: null,
      request: {
        status: {
          in: [RequestStatus.PALLET_READY, RequestStatus.CREATED],
        },
        typeMovimentPallet: {
          in: openPoolTypesForEquipment(assertEquipmentMovimentType(pallet.type)),
        },
        destination: { sectorId: user.sectorId },
      },
    },
    data: {
      assignedMovimentPalletId: pallet.id,
      status: ForkliftTaskStatus.ASSIGNED,
    },
  });

  if (claimed.count !== 1) {
    throw new MovimentPalletDeliverTaskAcceptError(
      "Esta entrega nao esta mais disponivel para aceite.",
    );
  }

  if (poolClaimableRequestStatuses.includes(task.request.status)) {
    const claimedRequest = await prisma.machineReplenishmentRequest.updateMany({
      where: {
        id: task.requestId,
        status: { in: poolClaimableRequestStatuses },
        typeMovimentPallet: {
          in: openPoolTypesForEquipment(assertEquipmentMovimentType(pallet.type)),
        },
      },
      data: {
        ...requestStatusPatch(RequestStatus.IN_PROGRESS),
        ...requestTypeAfterEquipmentClaim(
          assertEquipmentMovimentType(pallet.type),
        ),
      },
    });
    if (claimedRequest.count !== 1) {
      throw new ReplenishmentRequestAlreadyAssignedError();
    }
  }

  const updated =
    await movimentPalletTaskRepository.findByIdWithRequest(taskId);
  if (!updated) {
    throw new MovimentPalletTaskNotFoundError();
  }

  const requestAfterAccept =
    await machineReplenishmentRequestRepository.findUniqueById(
      updated.requestId,
    );
  if (requestAfterAccept) {
    operatorMovimentPalletWsNotifyReplenishmentChange(requestAfterAccept);
  }

  return { task: updated };
}

export async function acceptOpenPickupTaskForMovimentOperator(
  operatorUserId: string,
  role: RoleUser,
  taskId: string,
) {
  const allowed = equipmentTypesAllowedForRole(role);
  if (allowed.length === 0) {
    throw new MovimentPalletTypeNotAllowedForRoleError();
  }

  const user = await userRepository.findUniqueByIdWithSector(operatorUserId);
  if (!user?.sectorId) {
    throw new OperatorWithoutSectorError();
  }

  const pallet =
    await movimentPalletRepository.findFirstByOperatorUserId(operatorUserId);
  if (!pallet) {
    throw new OperatorWithoutBoundMovimentPalletError();
  }
  if (!allowed.includes(pallet.type)) {
    throw new MovimentPalletTypeNotAllowedForRoleError();
  }

  const task = await movimentPalletTaskRepository.findByIdWithRequest(taskId);
  if (!task) {
    throw new MovimentPalletTaskNotFoundError();
  }

  if (task.type !== ForkliftTaskType.PICKUP_TO_EXPEDITION) {
    throw new MovimentPalletPickupTaskAcceptError(
      "Somente tarefas de retirada (PICKUP_TO_EXPEDITION) podem ser aceitas por este endpoint.",
    );
  }

  if (!openPickupTaskStatusesAccept.includes(task.status)) {
    throw new MovimentPalletPickupTaskAcceptError(
      "Esta retirada nao esta mais disponivel (ja concluida ou cancelada).",
    );
  }

  if (
    !requestTypeMatchesEquipment(
      task.request.typeMovimentPallet,
      assertEquipmentMovimentType(pallet.type),
    )
  ) {
    throw new ReplenishmentRequestTypeMismatchError();
  }

  if (task.request.status !== RequestStatus.ON_MACHINE) {
    throw new MovimentPalletPickupTaskAcceptError(
      "A solicitacao precisa estar em ON_MACHINE para aceitar a retirada.",
    );
  }

  const destSectorId = task.request.destination.sector?.id;
  if (!destSectorId || destSectorId !== user.sectorId) {
    throw new MovimentPalletPickupTaskAcceptError(
      "Esta retirada nao pertence ao seu setor.",
    );
  }

  if (
    task.assignedMovimentPalletId &&
    task.assignedMovimentPalletId !== pallet.id
  ) {
    throw new MovimentPalletPickupTaskAcceptError(
      "Esta retirada ja esta vinculada a outro equipamento.",
    );
  }

  if (
    task.assignedMovimentPalletId === pallet.id &&
    task.status !== ForkliftTaskStatus.CREATED
  ) {
    const reloaded =
      await movimentPalletTaskRepository.findByIdWithRequest(taskId);
    if (!reloaded) {
      throw new MovimentPalletTaskNotFoundError();
    }
    return { task: reloaded };
  }

  await assertNoIncompleteTasksBlockingNewAccept(pallet.id, [taskId]);

  const claimed = await claimOpenPickupTaskToPallet({
    taskId,
    palletId: pallet.id,
    palletEquipmentType: assertEquipmentMovimentType(pallet.type),
    sectorId: user.sectorId,
  });

  if (!claimed) {
    const reloaded =
      await movimentPalletTaskRepository.findByIdWithRequest(taskId);
    if (
      reloaded &&
      reloaded.type === ForkliftTaskType.PICKUP_TO_EXPEDITION &&
      reloaded.assignedMovimentPalletId === pallet.id &&
      openPickupTaskStatusesAccept.includes(reloaded.status)
    ) {
      return { task: reloaded };
    }
    throw new MovimentPalletPickupTaskAcceptError(
      "Esta retirada nao esta mais disponivel ou foi aceita por outro operador.",
    );
  }

  const updated =
    await movimentPalletTaskRepository.findByIdWithRequest(taskId);
  if (!updated) {
    throw new MovimentPalletTaskNotFoundError();
  }

  return { task: updated };
}

export async function acceptReplenishmentRequestAsMovimentOperator(
  operatorUserId: string,
  role: RoleUser,
  requestId: string,
) {
  const allowed = equipmentTypesAllowedForRole(role);
  if (allowed.length === 0) {
    throw new MovimentPalletTypeNotAllowedForRoleError();
  }

  const pallet =
    await movimentPalletRepository.findFirstByOperatorUserId(operatorUserId);
  if (!pallet) {
    throw new OperatorWithoutBoundMovimentPalletError();
  }
  if (!allowed.includes(pallet.type)) {
    throw new MovimentPalletTypeNotAllowedForRoleError();
  }

  const request =
    await machineReplenishmentRequestRepository.findUniqueById(requestId);
  if (!request) {
    throw new MachineReplenishmentRequestNotFoundError();
  }
  if (
    !requestTypeMatchesEquipment(
      request.typeMovimentPallet,
      assertEquipmentMovimentType(pallet.type),
    )
  ) {
    throw new ReplenishmentRequestTypeMismatchError();
  }

  await assertNoIncompleteTasksBlockingNewAccept(pallet.id);

  const created = await prisma.$transaction(async (tx) => {
    const claimed = await tx.machineReplenishmentRequest.updateMany({
      where: {
        id: requestId,
        status: {
          in: [RequestStatus.PALLET_READY, RequestStatus.CREATED],
        },
        typeMovimentPallet: { in: openPoolTypesForEquipment(assertEquipmentMovimentType(pallet.type)) },
      },
      data: {
        ...requestStatusPatch(RequestStatus.IN_PROGRESS),
        ...requestTypeAfterEquipmentClaim(
          assertEquipmentMovimentType(pallet.type),
        ),
      },
    });
    if (claimed.count !== 1) {
      throw new ReplenishmentRequestAlreadyAssignedError();
    }

    return tx.movimentPalletTask.create({
      data: {
        type: ForkliftTaskType.DELIVER_TO_MACHINE,
        status: ForkliftTaskStatus.ASSIGNED,
        request: { connect: { id: requestId } },
        requestedBy: { connect: { id: request.requestedById } },
        assignedMovimentPallet: { connect: { id: pallet.id } },
      },
    });
  });

  const task = await movimentPalletTaskRepository.findByIdWithRequest(
    created.id,
  );
  if (!task) {
    throw new Error("Inconsistencia ao carregar tarefa apos aceite.");
  }
  const updatedRequest =
    await machineReplenishmentRequestRepository.findUniqueById(requestId);

  if (updatedRequest) {
    operatorMovimentPalletWsNotifyReplenishmentChange(updatedRequest);
  }

  return { task, request: updatedRequest };
}

const openDeliverTaskStatuses: ForkliftTaskStatus[] = [
  ForkliftTaskStatus.CREATED,
  ForkliftTaskStatus.ASSIGNED,
  ForkliftTaskStatus.IN_PROGRESS,
];

/**
 * Operador de empilhadeira / transpaleteira confirma que entregou o prisma na maquina:
 * conclui a tarefa DELIVER_TO_MACHINE e coloca a solicitacao em ON_MACHINE
 * (habilita retirada pelo operador de maquina).
 */
export async function completeDeliverTaskToMachine(
  operatorUserId: string,
  role: RoleUser,
  taskId: string,
) {
  const allowed = equipmentTypesAllowedForRole(role);
  if (allowed.length === 0) {
    throw new MovimentPalletTypeNotAllowedForRoleError();
  }

  const pallet =
    await movimentPalletRepository.findFirstByOperatorUserId(operatorUserId);
  if (!pallet) {
    throw new OperatorWithoutBoundMovimentPalletError();
  }
  if (!allowed.includes(pallet.type)) {
    throw new MovimentPalletTypeNotAllowedForRoleError();
  }

  const task = await movimentPalletTaskRepository.findByIdWithRequest(taskId);
  if (!task) {
    throw new MovimentPalletTaskNotFoundError();
  }

  if (task.type !== ForkliftTaskType.DELIVER_TO_MACHINE) {
    throw new MovimentPalletDeliverTaskCompletionError(
      "Somente tarefas de entrega (DELIVER_TO_MACHINE) podem ser concluidas aqui.",
    );
  }

  if (
    !requestTypeMatchesEquipment(
      task.request.typeMovimentPallet,
      assertEquipmentMovimentType(pallet.type),
    )
  ) {
    throw new ReplenishmentRequestTypeMismatchError();
  }

  if (task.assignedMovimentPalletId !== pallet.id) {
    throw new MovimentPalletDeliverTaskCompletionError(
      "Esta entrega nao esta atribuida ao equipamento que voce esta operando.",
    );
  }

  if (!openDeliverTaskStatuses.includes(task.status)) {
    if (
      task.status === ForkliftTaskStatus.COMPLETED &&
      task.request.status === RequestStatus.ON_MACHINE
    ) {
      const request =
        await machineReplenishmentRequestRepository.findUniqueById(
          task.requestId,
        );
      if (!request) {
        throw new MovimentPalletTaskNotFoundError();
      }
      return { task, request };
    }
    throw new MovimentPalletDeliverTaskCompletionError(
      "Esta entrega ja foi concluida ou esta cancelada.",
    );
  }

  if (task.request.status !== RequestStatus.IN_PROGRESS) {
    throw new MovimentPalletDeliverTaskCompletionError(
      "A solicitacao precisa estar em andamento (IN_PROGRESS) para registrar a entrega na maquina.",
    );
  }

  await prisma.$transaction(async (tx) => {
    const taskUpdate = await tx.movimentPalletTask.updateMany({
      where: {
        id: taskId,
        assignedMovimentPalletId: pallet.id,
        type: ForkliftTaskType.DELIVER_TO_MACHINE,
        status: { in: openDeliverTaskStatuses },
      },
      data: {
        status: ForkliftTaskStatus.COMPLETED,
        completedAt: new Date(),
      },
    });
    if (taskUpdate.count !== 1) {
      throw new MovimentPalletDeliverTaskCompletionError();
    }

    const requestUpdate = await tx.machineReplenishmentRequest.updateMany({
      where: {
        id: task.requestId,
        status: RequestStatus.IN_PROGRESS,
      },
      data: requestStatusPatch(RequestStatus.ON_MACHINE),
    });
    if (requestUpdate.count !== 1) {
      throw new Error(
        "Inconsistencia ao atualizar solicitacao apos entrega; tente novamente ou contate o suporte.",
      );
    }
  });

  const updatedTask =
    await movimentPalletTaskRepository.findByIdWithRequest(taskId);
  const updatedRequest =
    await machineReplenishmentRequestRepository.findUniqueById(task.requestId);
  if (!updatedTask || !updatedRequest) {
    throw new Error("Inconsistencia ao carregar dados apos entrega.");
  }

  const user = await userRepository.findUniqueByIdWithSector(operatorUserId);
  if (user?.sectorId) {
    await linkOpenPickupToPalletAfterDeliver(
      task.requestId,
      pallet.id,
      assertEquipmentMovimentType(pallet.type),
      user.sectorId,
    );
  }

  operatorMovimentPalletWsNotifyReplenishmentChange(updatedRequest);

  return { task: updatedTask, request: updatedRequest };
}

/**
 * Operador confirma que retirou o prisma da maquina (expedicao): conclui PICKUP_TO_EXPEDITION
 * e encerra a solicitacao (COMPLETED).
 */
export async function completePickupTaskToExpedition(
  operatorUserId: string,
  role: RoleUser,
  taskId: string,
) {
  const allowed = equipmentTypesAllowedForRole(role);
  if (allowed.length === 0) {
    throw new MovimentPalletTypeNotAllowedForRoleError();
  }

  const pallet =
    await movimentPalletRepository.findFirstByOperatorUserId(operatorUserId);
  if (!pallet) {
    throw new OperatorWithoutBoundMovimentPalletError();
  }
  if (!allowed.includes(pallet.type)) {
    throw new MovimentPalletTypeNotAllowedForRoleError();
  }

  let task = await movimentPalletTaskRepository.findByIdWithRequest(taskId);
  if (!task) {
    throw new MovimentPalletTaskNotFoundError();
  }

  if (task.type !== ForkliftTaskType.PICKUP_TO_EXPEDITION) {
    throw new MovimentPalletPickupTaskCompletionError(
      "Somente tarefas de retirada (PICKUP_TO_EXPEDITION) podem ser concluidas aqui.",
    );
  }

  if (
    !requestTypeMatchesEquipment(
      task.request.typeMovimentPallet,
      assertEquipmentMovimentType(pallet.type),
    )
  ) {
    throw new ReplenishmentRequestTypeMismatchError();
  }

  if (task.assignedMovimentPalletId !== pallet.id) {
    if (task.assignedMovimentPalletId) {
      throw new MovimentPalletPickupTaskCompletionError(
        "Esta retirada nao esta atribuida ao equipamento que voce esta operando.",
      );
    }

    const user = await userRepository.findUniqueByIdWithSector(operatorUserId);
    if (!user?.sectorId) {
      throw new OperatorWithoutSectorError();
    }

    const destSectorId = task.request.destination.sector?.id;
    if (!destSectorId || destSectorId !== user.sectorId) {
      throw new MovimentPalletPickupTaskCompletionError(
        "Esta retirada nao pertence ao seu setor.",
      );
    }

    if (task.request.status !== RequestStatus.ON_MACHINE) {
      throw new MovimentPalletPickupTaskCompletionError(
        "A solicitacao precisa estar em ON_MACHINE para registrar a retirada na expedicao.",
      );
    }

    await assertNoIncompleteTasksBlockingNewAccept(pallet.id, [taskId]);

    const claimed = await claimOpenPickupTaskToPallet({
      taskId,
      palletId: pallet.id,
      palletEquipmentType: assertEquipmentMovimentType(pallet.type),
      sectorId: user.sectorId,
    });

    if (!claimed) {
      throw new MovimentPalletPickupTaskCompletionError(
        "Esta retirada nao esta atribuida ao equipamento que voce esta operando. Aceite a retirada na fila antes de concluir.",
      );
    }

    const reloaded =
      await movimentPalletTaskRepository.findByIdWithRequest(taskId);
    if (!reloaded) {
      throw new MovimentPalletTaskNotFoundError();
    }
    task = reloaded;
  }

  if (task.assignedMovimentPalletId !== pallet.id) {
    throw new MovimentPalletPickupTaskCompletionError(
      "Esta retirada nao esta atribuida ao equipamento que voce esta operando.",
    );
  }

  if (!openPickupTaskStatusesAccept.includes(task.status)) {
    if (
      task.status === ForkliftTaskStatus.COMPLETED &&
      task.request.status === RequestStatus.COMPLETED
    ) {
      const request =
        await machineReplenishmentRequestRepository.findUniqueById(
          task.requestId,
        );
      if (!request) {
        throw new MovimentPalletTaskNotFoundError();
      }
      return { task, request };
    }
    throw new MovimentPalletPickupTaskCompletionError(
      "Esta retirada ja foi concluida ou esta cancelada.",
    );
  }

  if (task.request.status !== RequestStatus.ON_MACHINE) {
    throw new MovimentPalletPickupTaskCompletionError(
      "A solicitacao precisa estar em ON_MACHINE para registrar a retirada na expedicao.",
    );
  }

  await prisma.$transaction(async (tx) => {
    const taskUpdate = await tx.movimentPalletTask.updateMany({
      where: {
        id: taskId,
        assignedMovimentPalletId: pallet.id,
        type: ForkliftTaskType.PICKUP_TO_EXPEDITION,
        status: { in: openPickupTaskStatusesAccept },
      },
      data: {
        status: ForkliftTaskStatus.COMPLETED,
        completedAt: new Date(),
      },
    });
    if (taskUpdate.count !== 1) {
      throw new MovimentPalletPickupTaskCompletionError();
    }

    const requestUpdate = await tx.machineReplenishmentRequest.updateMany({
      where: {
        id: task.requestId,
        status: RequestStatus.ON_MACHINE,
      },
      data: {
        ...requestStatusPatch(RequestStatus.COMPLETED),
        completedAt: new Date(),
      },
    });
    if (requestUpdate.count !== 1) {
      throw new Error(
        "Inconsistencia ao atualizar solicitacao apos retirada; tente novamente ou contate o suporte.",
      );
    }
  });

  const updatedTask =
    await movimentPalletTaskRepository.findByIdWithRequest(taskId);
  const updatedRequest =
    await machineReplenishmentRequestRepository.findUniqueById(task.requestId);
  if (!updatedTask || !updatedRequest) {
    throw new Error("Inconsistencia ao carregar dados apos retirada.");
  }

  await tryCompleteTripSuggestionForPickupTask(taskId);

  operatorMovimentPalletWsNotifyReplenishmentChange(updatedRequest);

  return { task: updatedTask, request: updatedRequest };
}

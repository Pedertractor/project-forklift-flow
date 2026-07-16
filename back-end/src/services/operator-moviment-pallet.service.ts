import {
  IsOperating,
  MachineProductionStatus,
  MachineTaskStatus,
  MovimentPalletTripSuggestionStatus,
  RoleUser,
  TypeMovimentPallet,
} from "../generated/prisma/enums.js";
import {
  DeliveryTaskNotFoundError,
  MovimentPalletDeliverTaskAcceptError,
  MovimentPalletDeliverTaskCompletionError,
  InvalidOperatingModeError,
  MovimentPalletPickupTaskAcceptError,
  MovimentPalletPickupTaskCompletionError,
  MovimentPalletTaskNotFoundError,
  MovimentOperatorHasIncompleteTasksError,
  OperatorWithoutBoundMovimentPalletError,
  OperatorWithoutSectorError,
  PickupTaskNotFoundError,
  ReplenishmentRequestTypeMismatchError,
  TripRouteSuggestionAcceptForbiddenError,
  TripRouteSuggestionNotFoundError,
  TripRouteSuggestionNotOpenError,
} from "../errors/domain-errors.js";
import { prisma } from "../lib/prisma.js";
import {
  operatorMovimentPalletWsBroadcastMachineProductionStatusUpdated,
  operatorMovimentPalletWsBroadcastQueueUpdated,
  operatorMovimentPalletWsBroadcastTripSuggestionsUpdated,
  operatorMovimentPalletWsNotifyDeliveryTaskChange,
  operatorMovimentPalletWsNotifyPickupTaskChange,
} from "../ws/operator-moviment-pallet-ws.hub.js";
import {
  openMachineTaskStatuses,
  incompleteAssignedMachineTaskStatuses,
} from "../constants/machine-task-status.js";
import { deliveryTaskRepository } from "../repositories/delivery-task.repository.js";
import { machineRepository } from "../repositories/machine.repository.js";
import { pickupTaskRepository } from "../repositories/pickup-task.repository.js";
import {
  isOpenTripTaskPairValid,
  movimentPalletTripSuggestionRepository,
  type MovimentPalletTripSuggestionWithTasks,
} from "../repositories/moviment-pallet-trip-suggestion.repository.js";
import { syncOpenTripSuggestionsForSector } from "./trip-suggestion-sync.service.js";
import { listPreferredMachineIdsForOperator } from "./moviment-operator-machine-link.service.js";
import type { DeliveryTaskListRow } from "../repositories/delivery-task.repository.js";
import type { PickupTaskListRow } from "../repositories/pickup-task.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import {
  assertOperatingMode,
  openPoolTypesForOperatingMode,
  requestTypeMatchesOperatingMode,
} from "../utils/replenishment-moviment-type.js";
import { isAdminOrSuperAdmin } from "../utils/role-user.js";
import {
  findBlockedMachineIdsForTransportInSector,
  isMachineDeliveryBlockedFromTransportQueue,
} from "../utils/machine-transport-queue-block.js";
import {
  compareTripQueuePriority,
  resolveLastCompletedTripTaskKind,
  tripQueueKindAffinityRank,
  type LastCompletedTripTaskKind,
} from "../utils/trip-queue-priority.js";

function assertPalletTransporterRole(role: RoleUser) {
  if (role !== RoleUser.PALLET_TRANSPORTER) {
    throw new InvalidOperatingModeError(
      "Sem permissao para operar movimentacao de pallets.",
    );
  }
}

function parseOperatingMode(value: unknown): IsOperating {
  if (value === IsOperating.FORKLIFT || value === IsOperating.PALLET_TRUCK) {
    return value;
  }
  throw new InvalidOperatingModeError();
}

async function requireOperatorWithOperatingMode(operatorUserId: string) {
  const user = await userRepository.findUniqueByIdWithSector(operatorUserId);
  if (!user) throw new OperatorWithoutSectorError();
  if (!isAdminOrSuperAdmin(user.role) && !user.sectorId) {
    throw new OperatorWithoutSectorError();
  }
  if (!user.isOperating) throw new OperatorWithoutBoundMovimentPalletError();
  return {
    user,
    operatingMode: assertOperatingMode(user.isOperating),
  };
}

function poolTypesForOperatingMode(mode: IsOperating): TypeMovimentPallet[] {
  return openPoolTypesForOperatingMode(mode);
}

function sortByCritical<T extends { isCritical: boolean; createdAt: Date }>(
  items: T[],
): T[] {
  return [...items].sort((a, b) => {
    if (a.isCritical !== b.isCritical) {
      return a.isCritical ? -1 : 1;
    }
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

async function findLastCompletedTripTaskKindForOperator(
  operatorUserId: string,
): Promise<LastCompletedTripTaskKind | null> {
  const [latestDeliver, latestPickup] = await Promise.all([
    deliveryTaskRepository.findLatestCompletedByOperator(operatorUserId),
    pickupTaskRepository.findLatestCompletedByOperator(operatorUserId),
  ]);
  return resolveLastCompletedTripTaskKind(
    latestDeliver?.completedAt,
    latestPickup?.completedAt,
  );
}

type LinkedOpenTripTaskIds = {
  deliverIds: Set<string>;
  pickupIds: Set<string>;
};

function linkedOpenTripTaskIdsFromRows(
  rows: MovimentPalletTripSuggestionWithTasks[],
): LinkedOpenTripTaskIds {
  const deliverIds = new Set<string>();
  const pickupIds = new Set<string>();
  for (const row of rows) {
    const d = row.deliverTask;
    const p = row.pickupTask;
    if (
      !isOpenTripTaskPairValid(
        d.status,
        p.status,
        d.machineId,
        p.machineId,
        d.preparedAt != null,
      )
    ) {
      continue;
    }
    deliverIds.add(row.deliverTaskId);
    pickupIds.add(row.pickupTaskId);
  }
  return { deliverIds, pickupIds };
}

async function linkedOpenTripTaskIdsForSector(
  sectorId: string | null | undefined,
  types: TypeMovimentPallet[],
): Promise<LinkedOpenTripTaskIds> {
  const rows =
    await movimentPalletTripSuggestionRepository.findManyOpenListableForOperator(
      sectorId,
      types,
    );
  return linkedOpenTripTaskIdsFromRows(rows);
}

type TripSuggestionMachineBrief = {
  id: string;
  name: string;
  assetNumber: string | null;
  pillar: string | null;
  machineStreet: {
    id: string;
    name: string;
    machineStreetColor: string;
  } | null;
};

function mapMachineForTripSuggestion(
  machine: PickupTaskListRow["machine"] | DeliveryTaskListRow["machine"],
): TripSuggestionMachineBrief {
  return {
    id: machine.id,
    name: machine.name,
    assetNumber: machine.assetNumber ?? null,
    pillar: machine.pillar ?? null,
    machineStreet: machine.machineStreet
      ? {
          id: machine.machineStreet.id,
          name: machine.machineStreet.name,
          machineStreetColor: machine.machineStreet.machineStreetColor,
        }
      : null,
  };
}

type StandalonePickupSuggestionRow = {
  kind: "PICKUP_ONLY_AT_MACHINE";
  typeMovimentPallet: TypeMovimentPallet;
  effectiveCritical: boolean;
  preferredMachine: boolean;
  deferRecommended: boolean;
  machine: TripSuggestionMachineBrief;
  message: string;
  suggestedOrder: [];
  pickupTask: PickupTaskListRow;
};

type StandaloneDeliverSuggestionRow = {
  kind: "DELIVER_ONLY_TO_MACHINE";
  typeMovimentPallet: TypeMovimentPallet;
  effectiveCritical: boolean;
  preferredMachine: boolean;
  deferRecommended: boolean;
  machine: TripSuggestionMachineBrief;
  message: string;
  suggestedOrder: [];
  requestId: string;
  deliverTask: DeliveryTaskListRow;
};

function mapStandalonePickupRow(
  task: PickupTaskListRow,
  preferredMachine = false,
): StandalonePickupSuggestionRow {
  const machine = task.machine!;
  return {
    kind: "PICKUP_ONLY_AT_MACHINE",
    typeMovimentPallet: task.typeMovimentPallet,
    effectiveCritical: task.isCritical,
    preferredMachine,
    deferRecommended: false,
    machine: mapMachineForTripSuggestion(machine),
    message: preferredMachine
      ? `Prioridade vinculada — maquina ${machine.name}: retirada solicitada.`
      : `Na maquina ${machine.name}: retirada solicitada — aceite para levar o pallet a expedicao.`,
    suggestedOrder: [],
    pickupTask: task,
  };
}

function mapStandaloneDeliverRow(
  task: DeliveryTaskListRow,
  preferredMachine = false,
): StandaloneDeliverSuggestionRow {
  const machine = task.machine!;
  return {
    kind: "DELIVER_ONLY_TO_MACHINE",
    typeMovimentPallet: task.typeMovimentPallet,
    effectiveCritical: task.isCritical,
    preferredMachine,
    deferRecommended: false,
    machine: mapMachineForTripSuggestion(machine),
    suggestedOrder: [],
    message: preferredMachine
      ? `Prioridade vinculada — maquina ${machine.name}: entrega preparada no recebimento.`
      : `Na maquina ${machine.name}: entrega preparada no recebimento — aceite para levar o pallet.`,
    requestId: task.id,
    deliverTask: task,
  };
}

/**
 * Retirada explicitamente vinculada a um aviso de abastecimento
 * (`linkedSupplyRequestId`) so entra na fila do empilhadeirista via par
 * combinado — nunca avulsa, mesmo que o par ainda não tenha sido formado.
 */
function isPickupEligibleForStandaloneQueue(pickup: PickupTaskListRow): boolean {
  return pickup.linkedSupplyRequestId === null
}

async function listStandaloneTripTasksForSector(
  sectorId: string | null | undefined,
  operatingMode: IsOperating,
  linked: LinkedOpenTripTaskIds,
  blockedMachineIds: Set<string>,
  preferredMachineIds: Set<string> = new Set(),
  lastCompleted: LastCompletedTripTaskKind | null = null,
): Promise<{
  standalonePickupTasks: StandalonePickupSuggestionRow[];
  standaloneDeliverTasks: StandaloneDeliverSuggestionRow[];
}> {
  const standalonePickupTasks: StandalonePickupSuggestionRow[] = [];
  const standaloneDeliverTasks: StandaloneDeliverSuggestionRow[] = [];

  const [deliveries, pickups] = await Promise.all([
    deliveryTaskRepository.findManyOpenPoolForSectorAndOperatingMode(
      sectorId,
      operatingMode,
    ),
    pickupTaskRepository.findManyOpenPickupForSectorAndOperatingMode(
      sectorId,
      operatingMode,
    ),
  ]);

  for (const pickup of pickups) {
    if (pickup.status !== MachineTaskStatus.CREATED) continue;
    if (pickup.assignedOperatorId) continue;
    if (linked.pickupIds.has(pickup.id)) continue;
    if (!isPickupEligibleForStandaloneQueue(pickup)) continue;
    if (!pickup.machine) continue;
    const preferred = preferredMachineIds.has(pickup.machineId);
    // Criticas ou maquinas priorizadas do operador entram na sugestao principal.
    if (!pickup.isCritical && !preferred) continue;
    standalonePickupTasks.push(mapStandalonePickupRow(pickup, preferred));
  }

  for (const deliver of deliveries) {
    if (linked.deliverIds.has(deliver.id)) continue;
    if (!deliver.machine) continue;
    if (blockedMachineIds.has(deliver.machineId)) continue;
    const preferred = preferredMachineIds.has(deliver.machineId);
    if (!deliver.isCritical && !preferred) continue;
    standaloneDeliverTasks.push(mapStandaloneDeliverRow(deliver, preferred));
  }

  standalonePickupTasks.sort((a, b) =>
    compareTripQueuePriority(
      {
        preferredMachine: a.preferredMachine,
        effectiveCritical: a.effectiveCritical,
        kindRank: tripQueueKindAffinityRank("pickup", lastCompleted),
        sortAt: new Date(a.pickupTask.createdAt).getTime(),
      },
      {
        preferredMachine: b.preferredMachine,
        effectiveCritical: b.effectiveCritical,
        kindRank: tripQueueKindAffinityRank("pickup", lastCompleted),
        sortAt: new Date(b.pickupTask.createdAt).getTime(),
      },
    ),
  );
  standaloneDeliverTasks.sort((a, b) =>
    compareTripQueuePriority(
      {
        preferredMachine: a.preferredMachine,
        effectiveCritical: a.effectiveCritical,
        kindRank: tripQueueKindAffinityRank("deliver", lastCompleted),
        sortAt: new Date(a.deliverTask.createdAt).getTime(),
      },
      {
        preferredMachine: b.preferredMachine,
        effectiveCritical: b.effectiveCritical,
        kindRank: tripQueueKindAffinityRank("deliver", lastCompleted),
        sortAt: new Date(b.deliverTask.createdAt).getTime(),
      },
    ),
  );

  return { standalonePickupTasks, standaloneDeliverTasks };
}

/** Quando a tela principal estaria vazia, promove uma avulsa nao critica (fila manual). */
async function listOneNonCriticalStandaloneFallback(
  sectorId: string | null | undefined,
  operatingMode: IsOperating,
  linked: LinkedOpenTripTaskIds,
  blockedMachineIds: Set<string>,
  lastCompleted: LastCompletedTripTaskKind | null = null,
): Promise<{
  standalonePickupTasks: StandalonePickupSuggestionRow[];
  standaloneDeliverTasks: StandaloneDeliverSuggestionRow[];
}> {
  const empty = {
    standalonePickupTasks: [] as StandalonePickupSuggestionRow[],
    standaloneDeliverTasks: [] as StandaloneDeliverSuggestionRow[],
  };
  const candidates: Array<
    | {
        kind: "pickup";
        createdAt: Date;
        kindRank: number;
        row: StandalonePickupSuggestionRow;
      }
    | {
        kind: "deliver";
        createdAt: Date;
        kindRank: number;
        row: StandaloneDeliverSuggestionRow;
      }
  > = [];

  const [deliveries, pickups] = await Promise.all([
    deliveryTaskRepository.findManyOpenPoolForSectorAndOperatingMode(
      sectorId,
      operatingMode,
    ),
    pickupTaskRepository.findManyOpenPickupForSectorAndOperatingMode(
      sectorId,
      operatingMode,
    ),
  ]);

  for (const pickup of pickups) {
    if (pickup.status !== MachineTaskStatus.CREATED) continue;
    if (pickup.assignedOperatorId) continue;
    if (linked.pickupIds.has(pickup.id)) continue;
    if (!isPickupEligibleForStandaloneQueue(pickup)) continue;
    if (pickup.isCritical) continue;
    if (!pickup.machine) continue;
    candidates.push({
      kind: "pickup",
      createdAt: pickup.createdAt,
      kindRank: tripQueueKindAffinityRank("pickup", lastCompleted),
      row: mapStandalonePickupRow(pickup),
    });
  }

  for (const deliver of deliveries) {
    if (linked.deliverIds.has(deliver.id)) continue;
    if (deliver.isCritical) continue;
    if (!deliver.machine) continue;
    if (blockedMachineIds.has(deliver.machineId)) continue;
    candidates.push({
      kind: "deliver",
      createdAt: deliver.createdAt,
      kindRank: tripQueueKindAffinityRank("deliver", lastCompleted),
      row: mapStandaloneDeliverRow(deliver),
    });
  }

  if (candidates.length === 0) return empty;

  const best = candidates.reduce((current, cur) => {
    if (cur.kindRank !== current.kindRank) {
      return cur.kindRank < current.kindRank ? cur : current;
    }
    return new Date(cur.createdAt).getTime() <
      new Date(current.createdAt).getTime()
      ? cur
      : current;
  });

  if (best.kind === "pickup") {
    return { standalonePickupTasks: [best.row], standaloneDeliverTasks: [] };
  }
  return { standalonePickupTasks: [], standaloneDeliverTasks: [best.row] };
}

async function assertNoIncompleteTasks(
  operatorUserId: string,
  excludeIds: string[] = [],
) {
  const [deliverCount, pickupCount] = await Promise.all([
    deliveryTaskRepository.countIncompleteAssignedToOperator(
      operatorUserId,
      excludeIds,
    ),
    pickupTaskRepository.countIncompleteAssignedToOperator(
      operatorUserId,
      excludeIds,
    ),
  ]);
  if (deliverCount + pickupCount > 0) {
    throw new MovimentOperatorHasIncompleteTasksError(
      "Voce ja possui atividade em aberto. Conclua antes de trocar o modo de operacao.",
    );
  }
}

export async function getOperatorOperatingMode(operatorUserId: string) {
  const user = await userRepository.findUniqueByIdWithSector(operatorUserId);
  return { isOperating: user?.isOperating ?? null };
}

export async function setOperatorOperatingMode(
  operatorUserId: string,
  role: RoleUser,
  isOperatingRaw: unknown,
) {
  assertPalletTransporterRole(role);
  const isOperating = parseOperatingMode(isOperatingRaw);
  const user = await userRepository.findUniqueByIdWithSector(operatorUserId);
  if (!user) throw new OperatorWithoutSectorError();
  if (!isAdminOrSuperAdmin(role) && !user.sectorId) {
    throw new OperatorWithoutSectorError();
  }
  await userRepository.updateOperatingMode(operatorUserId, isOperating);
  return getOperatorCurrentMovimentPallet(operatorUserId);
}

export async function clearOperatorOperatingMode(operatorUserId: string) {
  await assertNoIncompleteTasks(operatorUserId);
  return userRepository.updateOperatingMode(operatorUserId, null);
}

/** Compatibilidade com clientes que ainda leem "my-moviment-pallet". */
export async function getOperatorCurrentMovimentPallet(operatorUserId: string) {
  const { isOperating } = await getOperatorOperatingMode(operatorUserId);
  if (!isOperating) return null;
  return {
    id: operatorUserId,
    code:
      isOperating === IsOperating.FORKLIFT ? "EMPILHADEIRA" : "TRANSPALETEIRA",
    type: isOperating,
    operatorId: operatorUserId,
    sectorId: null,
    operator: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export async function bindOperatorToMovimentPallet(
  operatorUserId: string,
  role: RoleUser,
  isOperatingRaw: unknown,
) {
  return setOperatorOperatingMode(operatorUserId, role, isOperatingRaw);
}

export async function unbindOperatorFromMovimentPallets(
  operatorUserId: string,
) {
  return clearOperatorOperatingMode(operatorUserId);
}

export async function listOpenReplenishmentRequestsForMyMovimentType(
  operatorUserId: string,
) {
  const user = await userRepository.findUniqueByIdWithSector(operatorUserId);
  if (!user?.isOperating) {
    return { deliveryTasks: [], pickupTasks: [] };
  }
  const crossSector = isAdminOrSuperAdmin(user.role);
  if (!crossSector && !user.sectorId) {
    return { deliveryTasks: [], pickupTasks: [] };
  }

  const sectorScope = crossSector ? (user.sectorId ?? null) : user.sectorId!;
  const operatingMode = assertOperatingMode(user.isOperating);
  const poolTypes = poolTypesForOperatingMode(operatingMode);
  if (sectorScope) {
    await syncTripSuggestions(sectorScope, poolTypes);
  }
  const linked = await linkedOpenTripTaskIdsForSector(sectorScope, poolTypes);
  const blockedMachineIds = await findBlockedMachineIdsForTransportInSector(
    sectorScope,
  );
  const preferredMachineIds = new Set(
    await listPreferredMachineIdsForOperator(operatorUserId),
  );

  const [deliveryTasks, pickupTasks] = await Promise.all([
    deliveryTaskRepository.findManyOpenPoolForSectorAndOperatingMode(
      sectorScope,
      operatingMode,
    ),
    pickupTaskRepository.findManyOpenPickupForSectorAndOperatingMode(
      sectorScope,
      operatingMode,
    ),
  ]);

  const openDeliveryTasks = deliveryTasks.filter(
    (t) =>
      !linked.deliverIds.has(t.id) &&
      !t.isCritical &&
      !preferredMachineIds.has(t.machineId) &&
      !blockedMachineIds.has(t.machineId),
  );
  const openPickupTasks: PickupTaskListRow[] = [];
  for (const task of pickupTasks) {
    if (task.status !== MachineTaskStatus.CREATED) continue;
    if (task.assignedOperatorId) continue;
    if (linked.pickupIds.has(task.id)) continue;
    if (task.isCritical) continue;
    if (preferredMachineIds.has(task.machineId)) continue;
    if (!isPickupEligibleForStandaloneQueue(task)) continue;
    openPickupTasks.push(task);
  }

  return {
    deliveryTasks: sortByCritical(openDeliveryTasks),
    pickupTasks: sortByCritical(openPickupTasks),
    requests: openDeliveryTasks,
    onMachinePickupTasks: openPickupTasks,
  };
}

export async function listMovimentOperatorTransportNotifications(
  operatorUserId: string,
) {
  const { deliveryTasks, pickupTasks } =
    await listOpenReplenishmentRequestsForMyMovimentType(operatorUserId);
  return {
    deliverRequestsAvailable: deliveryTasks.length,
    onMachinePickupTasksAvailable: pickupTasks.length,
    deliverRequests: deliveryTasks,
    deliveryTasks,
    onMachinePickupTasks: pickupTasks,
    pickupTasks,
  };
}

async function listAssignedTasks(operatorUserId: string) {
  const user = await userRepository.findUniqueByIdWithSector(operatorUserId);
  if (!user?.isOperating) {
    return { movimentPallet: null, deliveryTasks: [], pickupTasks: [] };
  }

  const movimentPallet = await getOperatorCurrentMovimentPallet(operatorUserId);
  const [deliveryTasks, pickupTasks] = await Promise.all([
    deliveryTaskRepository.findManyForAssignedOperator(operatorUserId),
    pickupTaskRepository.findManyForAssignedOperator(operatorUserId),
  ]);

  return {
    movimentPallet,
    deliveryTasks: sortByCritical(
      deliveryTasks.filter((t) =>
        incompleteAssignedMachineTaskStatuses.includes(t.status),
      ),
    ),
    pickupTasks: sortByCritical(
      pickupTasks.filter((t) =>
        incompleteAssignedMachineTaskStatuses.includes(t.status),
      ),
    ),
  };
}

export async function getOperatorMovimentPalletActiveFlow(
  operatorUserId: string,
  _role: RoleUser,
) {
  const { movimentPallet, deliveryTasks, pickupTasks } =
    await listAssignedTasks(operatorUserId);
  return {
    movimentPallet,
    deliveryTasks,
    pickupTasks,
    tasks: [
      ...deliveryTasks.map((t) => ({ kind: "DELIVERY" as const, task: t })),
      ...pickupTasks.map((t) => ({ kind: "PICKUP" as const, task: t })),
    ],
  };
}

export async function listMyMovimentPalletTasks(
  operatorUserId: string,
  role: RoleUser,
) {
  const flow = await getOperatorMovimentPalletActiveFlow(operatorUserId, role);
  return flow.tasks;
}

async function syncTripSuggestions(
  sectorId: string,
  types: TypeMovimentPallet[],
) {
  await syncOpenTripSuggestionsForSector(sectorId, types);
}

export async function listTripRouteSuggestionsForOperator(
  operatorUserId: string,
  role: RoleUser,
) {
  assertPalletTransporterRole(role);
  const user = await userRepository.findUniqueByIdWithSector(operatorUserId);
  if (!user?.isOperating) {
    return {
      suggestions: [],
      standalonePickupTasks: [],
      standaloneDeliverTasks: [],
      priorityContext: {
        hasCritical: false,
        lastCompletedTaskKind: null,
      },
    };
  }
  const types = poolTypesForOperatingMode(
    assertOperatingMode(user.isOperating),
  );
  if (types.length === 0) {
    return {
      suggestions: [],
      standalonePickupTasks: [],
      standaloneDeliverTasks: [],
      priorityContext: {
        hasCritical: false,
        lastCompletedTaskKind: null,
      },
    };
  }

  if (!user.sectorId && !isAdminOrSuperAdmin(role)) {
    return {
      suggestions: [],
      standalonePickupTasks: [],
      standaloneDeliverTasks: [],
      priorityContext: {
        hasCritical: false,
        lastCompletedTaskKind: null,
      },
    };
  }

  const sectorScope = isAdminOrSuperAdmin(role)
    ? (user.sectorId ?? null)
    : user.sectorId!;

  if (sectorScope) {
    await syncTripSuggestions(sectorScope, types);
    await movimentPalletTripSuggestionRepository.reconcileCompletedAcceptedInSector(
      sectorScope,
      types,
    );
  }

  const rows =
    await movimentPalletTripSuggestionRepository.findManyOpenListableForOperator(
      sectorScope,
      types,
    );

  const blockedMachineIds = await findBlockedMachineIdsForTransportInSector(
    sectorScope,
  );

  const preferredMachineIdList =
    await listPreferredMachineIdsForOperator(operatorUserId);
  const preferredMachineIds = new Set(preferredMachineIdList);
  const lastCompleted =
    await findLastCompletedTripTaskKindForOperator(operatorUserId);
  const combinedKindRank = tripQueueKindAffinityRank(
    "combined",
    lastCompleted,
  );

  const suggestions = rows
    .filter((row) => {
      const d = row.deliverTask;
      const p = row.pickupTask;
      if (blockedMachineIds.has(row.machineId)) {
        return false;
      }
      return isOpenTripTaskPairValid(
        d.status,
        p.status,
        d.machineId,
        p.machineId,
        d.preparedAt != null,
      );
    })
    .map((row) => ({
      kind: "COMBINE_DELIVER_AND_PICKUP_AT_MACHINE" as const,
      machine: row.machine,
      preferredMachine: preferredMachineIds.has(row.machineId),
      effectiveCritical:
        row.deliverTask.isCritical || row.pickupTask.isCritical,
      message: preferredMachineIds.has(row.machineId)
        ? `Prioridade vinculada — entregar e retirar na maquina ${row.machine.name}.`
        : `Entregar pallet na máquina ${row.machine.name} e retirar o pallet finalizado na mesma maquina.`,
      deliverTask: row.deliverTask,
      pickupTask: row.pickupTask,
      tripSuggestion: {
        id: row.id,
        status: row.status,
        acceptedAt: null,
        acceptedByUserId: null,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      },
    }))
    .sort((a, b) =>
      compareTripQueuePriority(
        {
          preferredMachine: a.preferredMachine,
          effectiveCritical: a.effectiveCritical,
          kindRank: combinedKindRank,
          sortAt: Math.min(
            new Date(a.deliverTask.createdAt).getTime(),
            new Date(a.pickupTask.createdAt).getTime(),
          ),
        },
        {
          preferredMachine: b.preferredMachine,
          effectiveCritical: b.effectiveCritical,
          kindRank: combinedKindRank,
          sortAt: Math.min(
            new Date(b.deliverTask.createdAt).getTime(),
            new Date(b.pickupTask.createdAt).getTime(),
          ),
        },
      ),
    );

  const operatingMode = assertOperatingMode(user.isOperating!);
  const linked = linkedOpenTripTaskIdsFromRows(rows);
  let { standalonePickupTasks, standaloneDeliverTasks } =
    await listStandaloneTripTasksForSector(
      sectorScope,
      operatingMode,
      linked,
      blockedMachineIds,
      preferredMachineIds,
      lastCompleted,
    );

  if (
    suggestions.length === 0 &&
    standalonePickupTasks.length === 0 &&
    standaloneDeliverTasks.length === 0
  ) {
    const fallback = await listOneNonCriticalStandaloneFallback(
      sectorScope,
      operatingMode,
      linked,
      blockedMachineIds,
      lastCompleted,
    );
    standalonePickupTasks = fallback.standalonePickupTasks;
    standaloneDeliverTasks = fallback.standaloneDeliverTasks;
  }

  const hasPreferred =
    suggestions.some((s) => s.preferredMachine) ||
    standalonePickupTasks.some((s) => s.preferredMachine) ||
    standaloneDeliverTasks.some((s) => s.preferredMachine);
  const hasCritical =
    suggestions.some((s) => s.effectiveCritical) ||
    standalonePickupTasks.some((s) => s.effectiveCritical) ||
    standaloneDeliverTasks.some((s) => s.effectiveCritical);

  const affinityHint =
    !hasPreferred && !hasCritical && lastCompleted === "PICKUP"
      ? "Apos retirada, priorizamos entrega+retirada ou entrega."
      : !hasPreferred && !hasCritical && lastCompleted === "DELIVER"
        ? "Apos abastecimento, priorizamos entrega+retirada ou retirada."
        : undefined;

  return {
    suggestions,
    standalonePickupTasks,
    standaloneDeliverTasks,
    priorityContext: {
      hasCritical,
      hasPreferredMachine: hasPreferred,
      lastCompletedTaskKind: lastCompleted,
      hint: hasPreferred
        ? "Existem maquinas vinculadas a voce — elas cortam a fila."
        : hasCritical
          ? "Existem tarefas criticas no setor — priorize-as."
          : affinityHint,
    },
  };
}

export async function acceptTripRouteSuggestion(
  operatorUserId: string,
  role: RoleUser,
  tripSuggestionId: string,
) {
  assertPalletTransporterRole(role);
  const { user, operatingMode } =
    await requireOperatorWithOperatingMode(operatorUserId);

  const full =
    await movimentPalletTripSuggestionRepository.findByIdWithTasks(
      tripSuggestionId,
    );
  if (!full) throw new TripRouteSuggestionNotFoundError();
  if (full.status !== MovimentPalletTripSuggestionStatus.OPEN) {
    throw new TripRouteSuggestionNotOpenError();
  }
  if (
    !isAdminOrSuperAdmin(role) &&
    full.machine.sectorId !== user.sectorId
  ) {
    throw new TripRouteSuggestionAcceptForbiddenError();
  }

  if (await isMachineDeliveryBlockedFromTransportQueue(full.machine)) {
    throw new MovimentPalletDeliverTaskAcceptError(
      "Maquina em producao — aguardando liberacao do abastecimento.",
    );
  }

  if (
    !requestTypeMatchesOperatingMode(
      full.deliverTask.typeMovimentPallet,
      operatingMode,
    )
  ) {
    throw new ReplenishmentRequestTypeMismatchError();
  }

  await assertNoIncompleteTasks(operatorUserId);

  await prisma.$transaction(async (tx) => {
    const claimed = await tx.movimentPalletTripSuggestion.updateMany({
      where: {
        id: tripSuggestionId,
        status: MovimentPalletTripSuggestionStatus.OPEN,
      },
      data: {
        status: MovimentPalletTripSuggestionStatus.ACCEPTED,
        acceptedByUserId: operatorUserId,
        acceptedAt: new Date(),
      },
    });
    if (claimed.count !== 1) throw new TripRouteSuggestionNotOpenError();

    const acceptedAt = new Date();
    await tx.deliveryTask.updateMany({
      where: { id: full.deliverTaskId, status: MachineTaskStatus.CREATED },
      data: {
        status: MachineTaskStatus.ASSIGNED,
        assignedOperatorId: operatorUserId,
        assignedAt: acceptedAt,
        operatedWith: operatingMode,
      },
    });
    await tx.pickupTask.updateMany({
      where: { id: full.pickupTaskId, status: MachineTaskStatus.CREATED },
      data: {
        status: MachineTaskStatus.ASSIGNED,
        assignedOperatorId: operatorUserId,
        assignedAt: acceptedAt,
        operatedWith: operatingMode,
      },
    });
  });

  const accepted =
    await movimentPalletTripSuggestionRepository.findByIdWithTasks(
      tripSuggestionId,
    );
  if (accepted?.deliverTask?.machine) {
    operatorMovimentPalletWsNotifyDeliveryTaskChange({
      id: accepted.deliverTask.id,
      status: accepted.deliverTask.status,
      typeMovimentPallet: accepted.deliverTask.typeMovimentPallet,
      preparedAt: accepted.deliverTask.preparedAt,
      machine: accepted.deliverTask.machine,
    });
  }
  if (accepted?.pickupTask?.machine) {
    operatorMovimentPalletWsNotifyPickupTaskChange({
      id: accepted.pickupTask.id,
      status: accepted.pickupTask.status,
      typeMovimentPallet: accepted.pickupTask.typeMovimentPallet,
      machine: accepted.pickupTask.machine,
    });
  }
  return accepted;
}

export async function acceptOpenDeliverTaskForMovimentOperator(
  operatorUserId: string,
  role: RoleUser,
  taskId: string,
) {
  assertPalletTransporterRole(role);
  const { operatingMode } =
    await requireOperatorWithOperatingMode(operatorUserId);

  const task = await deliveryTaskRepository.findById(taskId);
  if (!task) throw new DeliveryTaskNotFoundError();

  if (!task.acceptedBySupply || !task.preparedAt) {
    throw new MovimentPalletDeliverTaskAcceptError(
      "Pallet ainda nao esta pronto.",
    );
  }
  if (
    task.machine &&
    (await isMachineDeliveryBlockedFromTransportQueue(task.machine))
  ) {
    throw new MovimentPalletDeliverTaskAcceptError(
      "Maquina em producao — aguardando liberacao do abastecimento.",
    );
  }
  if (
    !requestTypeMatchesOperatingMode(task.typeMovimentPallet, operatingMode)
  ) {
    throw new ReplenishmentRequestTypeMismatchError();
  }
  if (task.status !== MachineTaskStatus.CREATED) {
    throw new MovimentPalletDeliverTaskAcceptError();
  }

  await assertNoIncompleteTasks(operatorUserId);

  const updated = await deliveryTaskRepository.update(taskId, {
    status: MachineTaskStatus.ASSIGNED,
    assignedOperator: { connect: { id: operatorUserId } },
    assignedAt: new Date(),
    operatedWith: operatingMode,
  });

  if (updated.machine) {
    operatorMovimentPalletWsNotifyDeliveryTaskChange({
      id: updated.id,
      status: updated.status,
      typeMovimentPallet: updated.typeMovimentPallet,
      preparedAt: updated.preparedAt,
      machine: updated.machine,
    });
  }

  return { task: updated, deliveryTask: updated };
}

export async function acceptOpenPickupTaskForMovimentOperator(
  operatorUserId: string,
  role: RoleUser,
  taskId: string,
) {
  assertPalletTransporterRole(role);
  const { operatingMode } =
    await requireOperatorWithOperatingMode(operatorUserId);

  const task = await pickupTaskRepository.findById(taskId);
  if (!task) throw new PickupTaskNotFoundError();

  if (
    !requestTypeMatchesOperatingMode(task.typeMovimentPallet, operatingMode)
  ) {
    throw new ReplenishmentRequestTypeMismatchError();
  }
  if (task.status !== MachineTaskStatus.CREATED) {
    throw new MovimentPalletPickupTaskAcceptError();
  }

  await assertNoIncompleteTasks(operatorUserId);

  const updated = await pickupTaskRepository.update(taskId, {
    status: MachineTaskStatus.ASSIGNED,
    assignedOperator: { connect: { id: operatorUserId } },
    assignedAt: new Date(),
    operatedWith: operatingMode,
  });

  if (updated.machine) {
    operatorMovimentPalletWsNotifyPickupTaskChange({
      id: updated.id,
      status: updated.status,
      typeMovimentPallet: updated.typeMovimentPallet,
      machine: updated.machine,
    });
  }

  return { task: updated, pickupTask: updated };
}

export async function completeDeliverTaskToMachine(
  operatorUserId: string,
  role: RoleUser,
  taskId: string,
) {
  assertPalletTransporterRole(role);
  await requireOperatorWithOperatingMode(operatorUserId);

  const task = await deliveryTaskRepository.findById(taskId);
  if (!task) throw new MovimentPalletTaskNotFoundError();
  if (task.assignedOperatorId !== operatorUserId) {
    throw new MovimentPalletDeliverTaskCompletionError();
  }
  if (!openMachineTaskStatuses.includes(task.status)) {
    if (task.status === MachineTaskStatus.COMPLETED) {
      return { task, deliveryTask: task };
    }
    throw new MovimentPalletDeliverTaskCompletionError();
  }

  const updated = await deliveryTaskRepository.update(taskId, {
    status: MachineTaskStatus.COMPLETED,
    completedAt: new Date(),
  });

  if (updated.machine) {
    operatorMovimentPalletWsNotifyDeliveryTaskChange({
      id: updated.id,
      status: updated.status,
      typeMovimentPallet: updated.typeMovimentPallet,
      preparedAt: updated.preparedAt,
      machine: updated.machine,
    });

    // Entrega concluída: a máquina volta a produzir, então retorna para TRABALHANDO.
    if (
      updated.machine.productionStatus !== MachineProductionStatus.TRABALHANDO
    ) {
      const machineAfter = await machineRepository.update(updated.machine.id, {
        productionStatus: MachineProductionStatus.TRABALHANDO,
      });
      operatorMovimentPalletWsBroadcastMachineProductionStatusUpdated({
        machineId: machineAfter.id,
        sectorId: machineAfter.sectorId,
        productionStatus: machineAfter.productionStatus,
        operatorUserId: machineAfter.userId ?? null,
      });
    }
  }

  return { task: updated, deliveryTask: updated, request: updated };
}

export async function completePickupTaskToExpedition(
  operatorUserId: string,
  role: RoleUser,
  taskId: string,
) {
  assertPalletTransporterRole(role);
  const { operatingMode } =
    await requireOperatorWithOperatingMode(operatorUserId);

  const task = await pickupTaskRepository.findById(taskId);
  if (!task) throw new MovimentPalletTaskNotFoundError();
  if (task.assignedOperatorId && task.assignedOperatorId !== operatorUserId) {
    throw new MovimentPalletPickupTaskCompletionError();
  }
  if (!openMachineTaskStatuses.includes(task.status)) {
    if (task.status === MachineTaskStatus.COMPLETED) {
      return { task, pickupTask: task };
    }
    throw new MovimentPalletPickupTaskCompletionError();
  }

  const completedAt = new Date();
  const wasAssignedBefore = Boolean(task.assignedAt);
  const updated = await pickupTaskRepository.update(taskId, {
    status: MachineTaskStatus.COMPLETED,
    completedAt,
    assignedOperator: { connect: { id: operatorUserId } },
    ...(wasAssignedBefore
      ? {}
      : { assignedAt: completedAt, operatedWith: operatingMode }),
  });

  const acceptedSuggestion =
    await prisma.movimentPalletTripSuggestion.findFirst({
      where: {
        pickupTaskId: taskId,
        status: MovimentPalletTripSuggestionStatus.ACCEPTED,
      },
    });
  if (acceptedSuggestion) {
    await movimentPalletTripSuggestionRepository.markCompleted(
      acceptedSuggestion.id,
    );
  }

  if (updated.machine) {
    operatorMovimentPalletWsNotifyPickupTaskChange({
      id: updated.id,
      status: updated.status,
      typeMovimentPallet: updated.typeMovimentPallet,
      machine: updated.machine,
    });
  }

  return { task: updated, pickupTask: updated, request: updated };
}

import {
  IsOperating,
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
import { pickupTaskRepository } from "../repositories/pickup-task.repository.js";
import {
  isOpenTripTaskPairValid,
  movimentPalletTripSuggestionRepository,
  type MovimentPalletTripSuggestionWithTasks,
} from "../repositories/moviment-pallet-trip-suggestion.repository.js";
import { syncOpenTripSuggestionsForSector } from "./trip-suggestion-sync.service.js";
import type { DeliveryTaskListRow } from "../repositories/delivery-task.repository.js";
import type { PickupTaskListRow } from "../repositories/pickup-task.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import {
  assertOperatingMode,
  openPoolTypesForOperatingMode,
  requestTypeMatchesOperatingMode,
} from "../utils/replenishment-moviment-type.js";

function assertPalletTransporterRole(role: RoleUser) {
  if (role !== RoleUser.PALLET_TRANSPORTER && role !== RoleUser.ADMIN) {
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
  if (!user?.sectorId) throw new OperatorWithoutSectorError();
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
  sectorId: string,
  types: TypeMovimentPallet[],
): Promise<LinkedOpenTripTaskIds> {
  const rows =
    await movimentPalletTripSuggestionRepository.findManyOpenListableForOperator(
      sectorId,
      types,
    );
  return linkedOpenTripTaskIdsFromRows(rows);
}

type StandalonePickupSuggestionRow = {
  kind: "PICKUP_ONLY_AT_MACHINE";
  typeMovimentPallet: TypeMovimentPallet;
  effectiveCritical: boolean;
  deferRecommended: boolean;
  machine: { id: string; name: string };
  message: string;
  suggestedOrder: [];
  pickupTask: PickupTaskListRow;
};

type StandaloneDeliverSuggestionRow = {
  kind: "DELIVER_ONLY_TO_MACHINE";
  typeMovimentPallet: TypeMovimentPallet;
  effectiveCritical: boolean;
  deferRecommended: boolean;
  machine: { id: string; name: string };
  message: string;
  suggestedOrder: [];
  requestId: string;
  deliverTask: DeliveryTaskListRow;
};

function mapStandalonePickupRow(
  task: PickupTaskListRow,
): StandalonePickupSuggestionRow {
  const machine = task.machine!;
  return {
    kind: "PICKUP_ONLY_AT_MACHINE",
    typeMovimentPallet: task.typeMovimentPallet,
    effectiveCritical: task.isCritical,
    deferRecommended: false,
    machine: {
      id: machine.id,
      name: machine.name,
    },
    message: `Na maquina ${machine.name}: retirada solicitada — aceite para levar o pallet a expedicao.`,
    suggestedOrder: [],
    pickupTask: task,
  };
}

function mapStandaloneDeliverRow(
  task: DeliveryTaskListRow,
): StandaloneDeliverSuggestionRow {
  const machine = task.machine!;
  return {
    kind: "DELIVER_ONLY_TO_MACHINE",
    typeMovimentPallet: task.typeMovimentPallet,
    effectiveCritical: task.isCritical,
    deferRecommended: false,
    machine: {
      id: machine.id,
      name: machine.name,
    },
    suggestedOrder: [],
    message: `Na maquina ${machine.name}: entrega preparada no recebimento — aceite para levar o pallet.`,
    requestId: task.id,
    deliverTask: task,
  };
}

/** Retirada + abastecimento so entra na fila do empilhadeirista via par combinado (entrega preparada). */
function isPickupEligibleForStandaloneQueue(pickup: {
  triggersReplenishment: boolean;
}): boolean {
  return !pickup.triggersReplenishment;
}

async function listStandaloneTripTasksForSector(
  sectorId: string,
  operatingMode: IsOperating,
  linked: LinkedOpenTripTaskIds,
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
      if (!pickup.isCritical) continue;
      if (!pickup.machine) continue;
      standalonePickupTasks.push(mapStandalonePickupRow(pickup));
    }

    for (const deliver of deliveries) {
      if (linked.deliverIds.has(deliver.id)) continue;
      if (!deliver.isCritical) continue;
      if (!deliver.machine) continue;
      standaloneDeliverTasks.push(mapStandaloneDeliverRow(deliver));
    }

  const byTaskUrgency = (
    a: { effectiveCritical: boolean; createdAt: Date },
    b: { effectiveCritical: boolean; createdAt: Date },
  ) => {
    if (a.effectiveCritical !== b.effectiveCritical) {
      return a.effectiveCritical ? -1 : 1;
    }
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  };

  standalonePickupTasks.sort((a, b) =>
    byTaskUrgency(
      {
        effectiveCritical: a.effectiveCritical,
        createdAt: a.pickupTask.createdAt,
      },
      {
        effectiveCritical: b.effectiveCritical,
        createdAt: b.pickupTask.createdAt,
      },
    ),
  );
  standaloneDeliverTasks.sort((a, b) =>
    byTaskUrgency(
      {
        effectiveCritical: a.effectiveCritical,
        createdAt: a.deliverTask.createdAt,
      },
      {
        effectiveCritical: b.effectiveCritical,
        createdAt: b.deliverTask.createdAt,
      },
    ),
  );

  return { standalonePickupTasks, standaloneDeliverTasks };
}

/** Quando a tela principal estaria vazia, promove uma avulsa nao critica (fila manual). */
async function listOneNonCriticalStandaloneFallback(
  sectorId: string,
  operatingMode: IsOperating,
  linked: LinkedOpenTripTaskIds,
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
        row: StandalonePickupSuggestionRow;
      }
    | {
        kind: "deliver";
        createdAt: Date;
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
        row: mapStandalonePickupRow(pickup),
      });
    }

    for (const deliver of deliveries) {
      if (linked.deliverIds.has(deliver.id)) continue;
      if (deliver.isCritical) continue;
      if (!deliver.machine) continue;
      candidates.push({
        kind: "deliver",
        createdAt: deliver.createdAt,
        row: mapStandaloneDeliverRow(deliver),
      });
    }

  if (candidates.length === 0) return empty;

  const oldest = candidates.reduce((best, cur) =>
    new Date(cur.createdAt).getTime() < new Date(best.createdAt).getTime()
      ? cur
      : best,
  );

  if (oldest.kind === "pickup") {
    return { standalonePickupTasks: [oldest.row], standaloneDeliverTasks: [] };
  }
  return { standalonePickupTasks: [], standaloneDeliverTasks: [oldest.row] };
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
  if (!user?.sectorId) throw new OperatorWithoutSectorError();
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
    code: isOperating === IsOperating.FORKLIFT ? 'EMPILHADEIRA' : 'TRANSPALETEIRA',
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

export async function unbindOperatorFromMovimentPallets(operatorUserId: string) {
  return clearOperatorOperatingMode(operatorUserId);
}

export async function listOpenReplenishmentRequestsForMyMovimentType(
  operatorUserId: string,
) {
  const user = await userRepository.findUniqueByIdWithSector(operatorUserId);
  if (!user?.sectorId || !user.isOperating) {
    return { deliveryTasks: [], pickupTasks: [] };
  }

  const operatingMode = assertOperatingMode(user.isOperating);
  const poolTypes = poolTypesForOperatingMode(operatingMode);
  await syncTripSuggestions(user.sectorId, poolTypes);
  const linked = await linkedOpenTripTaskIdsForSector(user.sectorId, poolTypes);

  const [deliveryTasks, pickupTasks] = await Promise.all([
    deliveryTaskRepository.findManyOpenPoolForSectorAndOperatingMode(
      user.sectorId,
      operatingMode,
    ),
    pickupTaskRepository.findManyOpenPickupForSectorAndOperatingMode(
      user.sectorId,
      operatingMode,
    ),
  ]);

  const openDeliveryTasks = deliveryTasks.filter(
    (t) => !linked.deliverIds.has(t.id) && !t.isCritical,
  );
  const openPickupTasks = pickupTasks.filter(
    (t) =>
      t.status === MachineTaskStatus.CREATED &&
      !t.assignedOperatorId &&
      !linked.pickupIds.has(t.id) &&
      !t.isCritical &&
      isPickupEligibleForStandaloneQueue(t),
  );

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
      priorityContext: { hasCritical: false },
    };
  }
  const types = poolTypesForOperatingMode(assertOperatingMode(user.isOperating));
  if (types.length === 0) {
    return {
      suggestions: [],
      standalonePickupTasks: [],
      standaloneDeliverTasks: [],
      priorityContext: { hasCritical: false },
    };
  }

  if (!user.sectorId) {
    return {
      suggestions: [],
      standalonePickupTasks: [],
      standaloneDeliverTasks: [],
      priorityContext: { hasCritical: false },
    };
  }

  await syncTripSuggestions(user.sectorId, types);
  await movimentPalletTripSuggestionRepository.reconcileCompletedAcceptedInSector(
    user.sectorId,
    types,
  );

  const rows =
    await movimentPalletTripSuggestionRepository.findManyOpenListableForOperator(
      user.sectorId,
      types,
    );

  const suggestions = rows
    .filter((row) => {
      const d = row.deliverTask;
      const p = row.pickupTask;
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
      effectiveCritical:
        row.deliverTask.isCritical || row.pickupTask.isCritical,
      message: `Entregar pallet na máquina ${row.machine.name} e retirar o pallet finalizado na mesma maquina.`,
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
    .sort((a, b) => {
      if (a.effectiveCritical !== b.effectiveCritical) {
        return a.effectiveCritical ? -1 : 1;
      }
      const aAt = Math.min(
        new Date(a.deliverTask.createdAt).getTime(),
        new Date(a.pickupTask.createdAt).getTime(),
      );
      const bAt = Math.min(
        new Date(b.deliverTask.createdAt).getTime(),
        new Date(b.pickupTask.createdAt).getTime(),
      );
      return aAt - bAt;
    });

  const operatingMode = assertOperatingMode(user.isOperating!);
  const linked = linkedOpenTripTaskIdsFromRows(rows);
  let { standalonePickupTasks, standaloneDeliverTasks } =
    await listStandaloneTripTasksForSector(user.sectorId, operatingMode, linked);

  if (
    suggestions.length === 0 &&
    standalonePickupTasks.length === 0 &&
    standaloneDeliverTasks.length === 0
  ) {
    const fallback = await listOneNonCriticalStandaloneFallback(
      user.sectorId,
      operatingMode,
      linked,
    );
    standalonePickupTasks = fallback.standalonePickupTasks;
    standaloneDeliverTasks = fallback.standaloneDeliverTasks;
  }

  const hasCritical =
    suggestions.some((s) => s.effectiveCritical) ||
    standalonePickupTasks.some((s) => s.effectiveCritical) ||
    standaloneDeliverTasks.some((s) => s.effectiveCritical);

  return {
    suggestions,
    standalonePickupTasks,
    standaloneDeliverTasks,
    priorityContext: {
      hasCritical,
      hint: hasCritical
        ? "Existem tarefas criticas no setor — priorize-as."
        : undefined,
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
  if (full.machine.sectorId !== user.sectorId) {
    throw new TripRouteSuggestionAcceptForbiddenError();
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

    await tx.deliveryTask.updateMany({
      where: { id: full.deliverTaskId, status: MachineTaskStatus.CREATED },
      data: {
        status: MachineTaskStatus.ASSIGNED,
        assignedOperatorId: operatorUserId,
      },
    });
    await tx.pickupTask.updateMany({
      where: { id: full.pickupTaskId, status: MachineTaskStatus.CREATED },
      data: {
        status: MachineTaskStatus.ASSIGNED,
        assignedOperatorId: operatorUserId,
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
  }

  return { task: updated, deliveryTask: updated, request: updated };
}

export async function completePickupTaskToExpedition(
  operatorUserId: string,
  role: RoleUser,
  taskId: string,
) {
  assertPalletTransporterRole(role);
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

  const updated = await pickupTaskRepository.update(taskId, {
    status: MachineTaskStatus.COMPLETED,
    completedAt: new Date(),
    assignedOperator: { connect: { id: operatorUserId } },
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

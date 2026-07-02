import { endOfDay, format, startOfDay, min, max } from "date-fns";
import {
  IsOperating,
  MachineTaskStatus,
  RoleUser,
  TypeMovimentPallet,
} from "../generated/prisma/enums.js";
import { AuthError, UserNotFoundError } from "../errors/domain-errors.js";
import { prisma } from "../lib/prisma.js";
import { userRepository } from "../repositories/user.repository.js";
import { getOperatorMovimentPalletActiveFlow } from "./operator-moviment-pallet.service.js";
import { buildMachineScopeFilter } from "./operational-dashboard-sector.js";
import type { AppJwtPayload } from "../types/auth.types.js";

export interface OperationalDashboardWaitMetrics {
  avg_wait_ms: number | null;
  p95_wait_ms: number | null;
  sample_size: number;
}

export interface OperationalDashboardCounts {
  pickups: number;
  deliveries: number;
  total: number;
}

export interface OperationalDashboardPeakSlot {
  slot: string;
  pickups: number;
  deliveries: number;
}

export interface OperationalDashboardMachineRow {
  machine_id: string;
  machine_name: string;
  pickups_total: number;
  deliveries_total: number;
  avg_pickup_wait_ms: number | null;
  avg_delivery_wait_ms: number | null;
}

export interface OperationalDashboardSnapshot {
  now: string;
  date: string;
  end_date: string | null;
  sector_id: string | null;
  machine_id: string | null;
  pickup_wait: OperationalDashboardWaitMetrics;
  delivery_wait: OperationalDashboardWaitMetrics;
  counts: OperationalDashboardCounts;
  peak_slots: OperationalDashboardPeakSlot[];
  machines: OperationalDashboardMachineRow[];
}

export interface OperationalDashboardOperatorRow {
  operator_id: string;
  operator_name: string;
  pickups_total: number;
  deliveries_total: number;
  pickups_open: number;
  deliveries_open: number;
  /** Atividades atribuídas ao operador enquanto operava empilhadeira. */
  forklift_total: number;
  /** Atividades atribuídas ao operador enquanto operava transpaleteira. */
  pallet_truck_total: number;
  avg_pickup_duration_ms: number | null;
  avg_delivery_duration_ms: number | null;
}

export interface OperationalDashboardByOperatorSnapshot {
  now: string;
  date: string;
  end_date: string | null;
  sector_id: string | null;
  type_moviment_pallet: TypeMovimentPallet | null;
  machine_id: string | null;
  operators: OperationalDashboardOperatorRow[];
}

type TaskDurationRow = {
  status: MachineTaskStatus;
  createdAt: Date;
  completedAt: Date | null;
};

type PickupRow = TaskDurationRow & {
  id: string;
  machineId: string;
  machine: { id: string; name: string };
};

type DeliveryRow = TaskDurationRow & {
  id: string;
  machineId: string;
  preparedAt: Date | null;
  machine: { id: string; name: string };
};

function parseDashboardIsoDate(value?: string): Date | null {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const parsed = new Date(`${value}T12:00:00`);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return null;
}

function resolveDashboardRange(options?: {
  date?: string;
  startDate?: string;
  endDate?: string;
}): { rangeStart: Date; rangeEnd: Date; labelStart: string; labelEnd: string } {
  const parsedStart =
    parseDashboardIsoDate(options?.startDate) ??
    parseDashboardIsoDate(options?.date) ??
    new Date();
  const parsedEnd = parseDashboardIsoDate(options?.endDate) ?? parsedStart;

  const startDay = startOfDay(min([parsedStart, parsedEnd]));
  const endDay = endOfDay(max([parsedStart, parsedEnd]));

  return {
    rangeStart: startDay,
    rangeEnd: endDay,
    labelStart: format(startDay, "yyyy-MM-dd"),
    labelEnd: format(endOfDay(max([parsedStart, parsedEnd])), "yyyy-MM-dd"),
  };
}

function percentile(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null;
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((p / 100) * sorted.length) - 1),
  );
  return sorted[index] ?? null;
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round(
    values.reduce((sum, value) => sum + value, 0) / values.length,
  );
}

/** Duração da tarefa: criação até conclusão; em aberto, até o instante da consulta. */
function taskCycleDurationMs(
  task: TaskDurationRow,
  referenceNow: Date,
): number {
  const start = task.createdAt.getTime();
  if (task.status === MachineTaskStatus.COMPLETED) {
    const end = task.completedAt?.getTime() ?? referenceNow.getTime();
    return Math.max(0, end - start);
  }
  return Math.max(0, referenceNow.getTime() - start);
}

/**
 * Duração da tarefa sob a ótica do operador: do momento em que ele aceitou a
 * atividade (`assignedAt`) até a conclusão; em aberto, até o instante da
 * consulta. Tarefas anteriores ao registro de `assignedAt` usam a criação como
 * início (mesmo comportamento do painel por máquina).
 */
function operatorTaskDurationMs(
  task: TaskDurationRow & { assignedAt: Date | null },
  referenceNow: Date,
): number {
  const start = (task.assignedAt ?? task.createdAt).getTime();
  if (task.status === MachineTaskStatus.COMPLETED) {
    const end = task.completedAt?.getTime() ?? referenceNow.getTime();
    return Math.max(0, end - start);
  }
  return Math.max(0, referenceNow.getTime() - start);
}

const PEAK_SLOT_MINUTES = 30;
const PEAK_SLOTS_PER_DAY = (24 * 60) / PEAK_SLOT_MINUTES;

function peakSlotIndex(date: Date): number {
  const minutes = date.getHours() * 60 + date.getMinutes();
  return Math.min(
    PEAK_SLOTS_PER_DAY - 1,
    Math.floor(minutes / PEAK_SLOT_MINUTES),
  );
}

function buildPeakSlots(
  pickups: PickupRow[],
  deliveries: DeliveryRow[],
): OperationalDashboardPeakSlot[] {
  const slots: OperationalDashboardPeakSlot[] = [];

  for (let index = 0; index < PEAK_SLOTS_PER_DAY; index += 1) {
    const hour = Math.floor((index * PEAK_SLOT_MINUTES) / 60);
    const minute = (index * PEAK_SLOT_MINUTES) % 60;
    const slotLabel = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    slots.push({ slot: slotLabel, pickups: 0, deliveries: 0 });
  }

  for (const task of pickups) {
    const slot = slots[peakSlotIndex(task.createdAt)];
    if (slot) slot.pickups += 1;
  }

  for (const task of deliveries) {
    const at = task.preparedAt ?? task.createdAt;
    const slot = slots[peakSlotIndex(at)];
    if (slot) slot.deliveries += 1;
  }

  return slots;
}

function buildWaitMetrics(values: number[]): OperationalDashboardWaitMetrics {
  const sorted = [...values].sort((a, b) => a - b);
  return {
    avg_wait_ms: average(sorted),
    p95_wait_ms: percentile(sorted, 95),
    sample_size: sorted.length,
  };
}

function buildMachineRows(
  pickups: PickupRow[],
  deliveries: DeliveryRow[],
  referenceNow: Date,
): OperationalDashboardMachineRow[] {
  const byMachine = new Map<
    string,
    {
      machine_name: string;
      pickupWaits: number[];
      deliveryWaits: number[];
      pickups_total: number;
      deliveries_total: number;
    }
  >();

  const ensureMachine = (machineId: string, machineName: string) => {
    const existing = byMachine.get(machineId);
    if (existing) return existing;
    const created = {
      machine_name: machineName,
      pickupWaits: [] as number[],
      deliveryWaits: [] as number[],
      pickups_total: 0,
      deliveries_total: 0,
    };
    byMachine.set(machineId, created);
    return created;
  };

  for (const task of pickups) {
    const bucket = ensureMachine(task.machineId, task.machine.name);
    bucket.pickups_total += 1;
    bucket.pickupWaits.push(taskCycleDurationMs(task, referenceNow));
  }

  for (const task of deliveries) {
    const bucket = ensureMachine(task.machineId, task.machine.name);
    bucket.deliveries_total += 1;
    bucket.deliveryWaits.push(taskCycleDurationMs(task, referenceNow));
  }

  return [...byMachine.entries()]
    .map(([machine_id, row]) => ({
      machine_id,
      machine_name: row.machine_name,
      pickups_total: row.pickups_total,
      deliveries_total: row.deliveries_total,
      avg_pickup_wait_ms: average(row.pickupWaits),
      avg_delivery_wait_ms: average(row.deliveryWaits),
    }))
    .sort((a, b) => a.machine_name.localeCompare(b.machine_name, "pt-BR"));
}

function buildSnapshot(
  pickups: PickupRow[],
  deliveries: DeliveryRow[],
  referenceNow: Date,
): Omit<
  OperationalDashboardSnapshot,
  "now" | "date" | "end_date" | "sector_id" | "machine_id"
> {
  const pickupWaits = pickups.map((task) =>
    taskCycleDurationMs(task, referenceNow),
  );

  const deliveryWaits = deliveries.map((task) =>
    taskCycleDurationMs(task, referenceNow),
  );

  const pickupTotal = pickups.length;
  const deliveryTotal = deliveries.length;

  return {
    pickup_wait: buildWaitMetrics(pickupWaits),
    delivery_wait: buildWaitMetrics(deliveryWaits),
    counts: {
      pickups: pickupTotal,
      deliveries: deliveryTotal,
      total: pickupTotal + deliveryTotal,
    },
    peak_slots: buildPeakSlots(pickups, deliveries),
    machines: buildMachineRows(pickups, deliveries, referenceNow),
  };
}

export async function getOperationalDashboardSnapshot(options?: {
  date?: string;
  startDate?: string;
  endDate?: string;
  machineId?: string;
  sectorId?: string | null;
}): Promise<OperationalDashboardSnapshot> {
  const referenceNow = new Date();
  const { rangeStart, rangeEnd, labelStart, labelEnd } =
    resolveDashboardRange(options);
  const machineId =
    typeof options?.machineId === "string" && options.machineId.trim() !== ""
      ? options.machineId.trim()
      : null;
  const sectorId =
    typeof options?.sectorId === "string" && options.sectorId.trim() !== ""
      ? options.sectorId.trim()
      : null;

  const machineFilter = buildMachineScopeFilter({ machineId, sectorId });

  const [pickups, deliveries] = await Promise.all([
    prisma.pickupTask.findMany({
      where: {
        createdAt: { gte: rangeStart, lte: rangeEnd },
        status: { not: MachineTaskStatus.CANCELED },
        ...machineFilter,
      },
      select: {
        id: true,
        machineId: true,
        status: true,
        createdAt: true,
        completedAt: true,
        machine: { select: { id: true, name: true } },
      },
    }),
    prisma.deliveryTask.findMany({
      where: {
        OR: [
          { createdAt: { gte: rangeStart, lte: rangeEnd } },
          { preparedAt: { gte: rangeStart, lte: rangeEnd } },
        ],
        status: { not: MachineTaskStatus.CANCELED },
        ...machineFilter,
      },
      select: {
        id: true,
        machineId: true,
        status: true,
        createdAt: true,
        completedAt: true,
        preparedAt: true,
        machine: { select: { id: true, name: true } },
      },
    }),
  ]);

  const metrics = buildSnapshot(pickups, deliveries, referenceNow);

  return {
    now: referenceNow.toISOString(),
    date: labelStart,
    end_date: labelStart === labelEnd ? null : labelEnd,
    sector_id: sectorId,
    machine_id: machineId,
    ...metrics,
  };
}

const openTaskStatuses: MachineTaskStatus[] = [
  MachineTaskStatus.CREATED,
  MachineTaskStatus.ASSIGNED,
  MachineTaskStatus.IN_PROGRESS,
];

function isOpenTaskStatus(status: MachineTaskStatus): boolean {
  return openTaskStatuses.includes(status);
}

function parseTypeMovimentPalletFilter(
  value?: string,
): TypeMovimentPallet | null {
  if (
    value === TypeMovimentPallet.FORKLIFT ||
    value === TypeMovimentPallet.ANY
  ) {
    return value;
  }
  return null;
}

type OperatorTaskRow = TaskDurationRow & {
  assignedAt: Date | null;
  typeMovimentPallet: TypeMovimentPallet;
  assignedOperatorId: string | null;
  assignedOperator: {
    id: string;
    name: string;
    isOperating: IsOperating | null;
  } | null;
};

/**
 * Determina o equipamento usado numa tarefa. O banco não guarda o equipamento
 * por tarefa historicamente, então usamos o modo atual do operador
 * (`isOperating`) e, quando ausente, inferimos pelo tipo da tarefa
 * (FORKLIFT só pode ter sido feita por empilhadeira).
 */
function resolveTaskEquipment(task: OperatorTaskRow): IsOperating {
  if (task.assignedOperator?.isOperating) {
    return task.assignedOperator.isOperating;
  }
  return task.typeMovimentPallet === TypeMovimentPallet.FORKLIFT
    ? IsOperating.FORKLIFT
    : IsOperating.PALLET_TRUCK;
}

function buildOperatorRows(
  pickups: OperatorTaskRow[],
  deliveries: OperatorTaskRow[],
  referenceNow: Date,
): OperationalDashboardOperatorRow[] {
  const byOperator = new Map<
    string,
    {
      operator_name: string;
      pickups_total: number;
      deliveries_total: number;
      pickups_open: number;
      deliveries_open: number;
      forklift_total: number;
      pallet_truck_total: number;
      pickupDurations: number[];
      deliveryDurations: number[];
    }
  >();

  const ensureOperator = (operatorId: string, operatorName: string) => {
    const existing = byOperator.get(operatorId);
    if (existing) return existing;
    const created = {
      operator_name: operatorName,
      pickups_total: 0,
      deliveries_total: 0,
      pickups_open: 0,
      deliveries_open: 0,
      forklift_total: 0,
      pallet_truck_total: 0,
      pickupDurations: [] as number[],
      deliveryDurations: [] as number[],
    };
    byOperator.set(operatorId, created);
    return created;
  };

  const addEquipmentCount = (
    bucket: { forklift_total: number; pallet_truck_total: number },
    task: OperatorTaskRow,
  ) => {
    if (resolveTaskEquipment(task) === IsOperating.FORKLIFT) {
      bucket.forklift_total += 1;
    } else {
      bucket.pallet_truck_total += 1;
    }
  };

  for (const task of pickups) {
    if (!task.assignedOperatorId || !task.assignedOperator) continue;
    const bucket = ensureOperator(
      task.assignedOperatorId,
      task.assignedOperator.name,
    );
    bucket.pickups_total += 1;
    if (isOpenTaskStatus(task.status)) {
      bucket.pickups_open += 1;
    }
    addEquipmentCount(bucket, task);
    bucket.pickupDurations.push(operatorTaskDurationMs(task, referenceNow));
  }

  for (const task of deliveries) {
    if (!task.assignedOperatorId || !task.assignedOperator) continue;
    const bucket = ensureOperator(
      task.assignedOperatorId,
      task.assignedOperator.name,
    );
    bucket.deliveries_total += 1;
    if (isOpenTaskStatus(task.status)) {
      bucket.deliveries_open += 1;
    }
    addEquipmentCount(bucket, task);
    bucket.deliveryDurations.push(operatorTaskDurationMs(task, referenceNow));
  }

  return [...byOperator.entries()]
    .map(([operator_id, row]) => ({
      operator_id,
      operator_name: row.operator_name,
      pickups_total: row.pickups_total,
      deliveries_total: row.deliveries_total,
      pickups_open: row.pickups_open,
      deliveries_open: row.deliveries_open,
      forklift_total: row.forklift_total,
      pallet_truck_total: row.pallet_truck_total,
      avg_pickup_duration_ms: average(row.pickupDurations),
      avg_delivery_duration_ms: average(row.deliveryDurations),
    }))
    .sort((a, b) => a.operator_name.localeCompare(b.operator_name, "pt-BR"));
}

export async function getOperationalDashboardByOperator(options?: {
  date?: string;
  startDate?: string;
  endDate?: string;
  machineId?: string;
  typeMovimentPallet?: string;
  sectorId?: string | null;
}): Promise<OperationalDashboardByOperatorSnapshot> {
  const referenceNow = new Date();
  const { rangeStart, rangeEnd, labelStart, labelEnd } =
    resolveDashboardRange(options);
  const machineId =
    typeof options?.machineId === "string" && options.machineId.trim() !== ""
      ? options.machineId.trim()
      : null;
  const sectorId =
    typeof options?.sectorId === "string" && options.sectorId.trim() !== ""
      ? options.sectorId.trim()
      : null;
  const typeMovimentPallet = parseTypeMovimentPalletFilter(
    options?.typeMovimentPallet,
  );

  const machineFilter = buildMachineScopeFilter({ machineId, sectorId });
  const typeFilter = typeMovimentPallet ? { typeMovimentPallet } : {};

  const operatorSelect = {
    assignedOperatorId: true,
    assignedOperator: { select: { id: true, name: true, isOperating: true } },
    typeMovimentPallet: true,
    status: true,
    createdAt: true,
    assignedAt: true,
    completedAt: true,
  } as const;

  const [pickups, deliveries] = await Promise.all([
    prisma.pickupTask.findMany({
      where: {
        createdAt: { gte: rangeStart, lte: rangeEnd },
        status: { not: MachineTaskStatus.CANCELED },
        assignedOperatorId: { not: null },
        ...machineFilter,
        ...typeFilter,
      },
      select: operatorSelect,
    }),
    prisma.deliveryTask.findMany({
      where: {
        OR: [
          { createdAt: { gte: rangeStart, lte: rangeEnd } },
          { preparedAt: { gte: rangeStart, lte: rangeEnd } },
        ],
        status: { not: MachineTaskStatus.CANCELED },
        assignedOperatorId: { not: null },
        ...machineFilter,
        ...typeFilter,
      },
      select: operatorSelect,
    }),
  ]);

  return {
    now: referenceNow.toISOString(),
    date: labelStart,
    end_date: labelStart === labelEnd ? null : labelEnd,
    sector_id: sectorId,
    type_moviment_pallet: typeMovimentPallet,
    machine_id: machineId,
    operators: buildOperatorRows(pickups, deliveries, referenceNow),
  };
}

export async function getOperatorCurrentTrajectoryForDashboard(
  actor: AppJwtPayload,
  operatorUserId: string,
) {
  const trimmedOperatorId = operatorUserId.trim();
  if (!trimmedOperatorId) {
    throw new UserNotFoundError("Operador invalido.");
  }

  const operator =
    await userRepository.findUniqueByIdWithSector(trimmedOperatorId);
  if (!operator) {
    throw new UserNotFoundError("Operador nao encontrado.");
  }

  if (actor.role === RoleUser.LEADER) {
    const leader = await userRepository.findUniqueByIdWithSector(actor.sub);
    if (!leader?.sectorId) {
      throw new AuthError("Lider sem setor vinculado.");
    }
    if (operator.sectorId !== leader.sectorId) {
      throw new AuthError("Operador fora do setor do lider.");
    }
  }

  return getOperatorMovimentPalletActiveFlow(trimmedOperatorId, actor.role);
}

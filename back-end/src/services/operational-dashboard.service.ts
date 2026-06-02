import { endOfDay, format, startOfDay } from 'date-fns'
import { MachineTaskStatus } from '../generated/prisma/enums.js'
import { prisma } from '../lib/prisma.js'

export interface OperationalDashboardWaitMetrics {
  avg_wait_ms: number | null
  p95_wait_ms: number | null
  sample_size: number
}

export interface OperationalDashboardCounts {
  pickups: number
  deliveries: number
  total: number
}

export interface OperationalDashboardPeakSlot {
  slot: string
  pickups: number
  deliveries: number
}

export interface OperationalDashboardMachineRow {
  machine_id: string
  machine_name: string
  pickups_total: number
  deliveries_total: number
  avg_pickup_wait_ms: number | null
  avg_delivery_wait_ms: number | null
}

export interface OperationalDashboardSnapshot {
  now: string
  date: string
  machine_id: string | null
  pickup_wait: OperationalDashboardWaitMetrics
  delivery_wait: OperationalDashboardWaitMetrics
  counts: OperationalDashboardCounts
  peak_slots: OperationalDashboardPeakSlot[]
  machines: OperationalDashboardMachineRow[]
}

type PickupRow = {
  id: string
  machineId: string
  status: MachineTaskStatus
  createdAt: Date
  updatedAt: Date
  assignedOperatorId: string | null
  machine: { id: string; name: string }
}

type DeliveryRow = {
  id: string
  machineId: string
  status: MachineTaskStatus
  createdAt: Date
  updatedAt: Date
  preparedAt: Date | null
  assignedOperatorId: string | null
  machine: { id: string; name: string }
}

function parseDashboardDate(value?: string): Date {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const parsed = new Date(`${value}T12:00:00`)
    if (!Number.isNaN(parsed.getTime())) {
      return parsed
    }
  }
  return new Date()
}

function percentile(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((p / 100) * sorted.length) - 1),
  )
  return sorted[index] ?? null
}

function average(values: number[]): number | null {
  if (values.length === 0) return null
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
}

function pickupWaitMs(task: PickupRow, referenceNow: Date): number | null {
  const start = task.createdAt.getTime()
  if (task.status === MachineTaskStatus.CANCELED && !task.assignedOperatorId) {
    return null
  }
  if (task.status === MachineTaskStatus.CREATED) {
    return referenceNow.getTime() - start
  }
  return task.updatedAt.getTime() - start
}

function deliveryWaitMs(task: DeliveryRow, referenceNow: Date): number | null {
  if (!task.preparedAt) {
    if (task.status === MachineTaskStatus.CREATED) {
      return null
    }
  }
  const start = (task.preparedAt ?? task.createdAt).getTime()
  if (task.status === MachineTaskStatus.CANCELED && !task.assignedOperatorId) {
    return null
  }
  if (task.status === MachineTaskStatus.CREATED) {
    return referenceNow.getTime() - start
  }
  return task.updatedAt.getTime() - start
}

function buildPeakSlots(
  pickups: PickupRow[],
  deliveries: DeliveryRow[],
  day: Date,
): OperationalDashboardPeakSlot[] {
  const dayStart = startOfDay(day)
  const slots: OperationalDashboardPeakSlot[] = []

  for (let minutes = 0; minutes < 24 * 60; minutes += 30) {
    const slotStart = new Date(dayStart.getTime() + minutes * 60_000)
    const slotEnd = new Date(slotStart.getTime() + 30 * 60_000)
    const slotLabel = format(slotStart, 'HH:mm')

    const pickupCount = pickups.filter((task) => {
      const at = task.createdAt.getTime()
      return at >= slotStart.getTime() && at < slotEnd.getTime()
    }).length

    const deliveryCount = deliveries.filter((task) => {
      const at = (task.preparedAt ?? task.createdAt).getTime()
      return at >= slotStart.getTime() && at < slotEnd.getTime()
    }).length

    slots.push({
      slot: slotLabel,
      pickups: pickupCount,
      deliveries: deliveryCount,
    })
  }

  return slots
}

function buildWaitMetrics(values: number[]): OperationalDashboardWaitMetrics {
  const sorted = [...values].sort((a, b) => a - b)
  return {
    avg_wait_ms: average(sorted),
    p95_wait_ms: percentile(sorted, 95),
    sample_size: sorted.length,
  }
}

function buildMachineRows(
  pickups: PickupRow[],
  deliveries: DeliveryRow[],
  referenceNow: Date,
): OperationalDashboardMachineRow[] {
  const byMachine = new Map<
    string,
    {
      machine_name: string
      pickupWaits: number[]
      deliveryWaits: number[]
      pickups_total: number
      deliveries_total: number
    }
  >()

  const ensureMachine = (machineId: string, machineName: string) => {
    const existing = byMachine.get(machineId)
    if (existing) return existing
    const created = {
      machine_name: machineName,
      pickupWaits: [] as number[],
      deliveryWaits: [] as number[],
      pickups_total: 0,
      deliveries_total: 0,
    }
    byMachine.set(machineId, created)
    return created
  }

  for (const task of pickups) {
    const bucket = ensureMachine(task.machineId, task.machine.name)
    bucket.pickups_total += 1
    const wait = pickupWaitMs(task, referenceNow)
    if (wait != null) {
      bucket.pickupWaits.push(wait)
    }
  }

  for (const task of deliveries) {
    const bucket = ensureMachine(task.machineId, task.machine.name)
    bucket.deliveries_total += 1
    const wait = deliveryWaitMs(task, referenceNow)
    if (wait != null) {
      bucket.deliveryWaits.push(wait)
    }
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
    .sort((a, b) => a.machine_name.localeCompare(b.machine_name, 'pt-BR'))
}

function buildSnapshot(
  pickups: PickupRow[],
  deliveries: DeliveryRow[],
  day: Date,
  referenceNow: Date,
): Omit<OperationalDashboardSnapshot, 'now' | 'date' | 'machine_id'> {
  const pickupWaits = pickups
    .map((task) => pickupWaitMs(task, referenceNow))
    .filter((value): value is number => value != null)

  const deliveryWaits = deliveries
    .map((task) => deliveryWaitMs(task, referenceNow))
    .filter((value): value is number => value != null)

  const pickupTotal = pickups.length
  const deliveryTotal = deliveries.length

  return {
    pickup_wait: buildWaitMetrics(pickupWaits),
    delivery_wait: buildWaitMetrics(deliveryWaits),
    counts: {
      pickups: pickupTotal,
      deliveries: deliveryTotal,
      total: pickupTotal + deliveryTotal,
    },
    peak_slots: buildPeakSlots(pickups, deliveries, day),
    machines: buildMachineRows(pickups, deliveries, referenceNow),
  }
}

export async function getOperationalDashboardSnapshot(options?: {
  date?: string
  machineId?: string
}): Promise<OperationalDashboardSnapshot> {
  const referenceNow = new Date()
  const day = parseDashboardDate(options?.date)
  const rangeStart = startOfDay(day)
  const rangeEnd = endOfDay(day)
  const machineId =
    typeof options?.machineId === 'string' && options.machineId.trim() !== ''
      ? options.machineId.trim()
      : null

  const machineFilter = machineId ? { machineId } : {}

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
        updatedAt: true,
        assignedOperatorId: true,
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
        updatedAt: true,
        preparedAt: true,
        assignedOperatorId: true,
        machine: { select: { id: true, name: true } },
      },
    }),
  ])

  const metrics = buildSnapshot(pickups, deliveries, day, referenceNow)

  return {
    now: referenceNow.toISOString(),
    date: format(day, 'yyyy-MM-dd'),
    machine_id: machineId,
    ...metrics,
  }
}

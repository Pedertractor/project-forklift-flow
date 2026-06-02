import { apiAuthFetch } from '@/lib/api';

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
  machine_id: string | null;
  pickup_wait: OperationalDashboardWaitMetrics;
  delivery_wait: OperationalDashboardWaitMetrics;
  counts: OperationalDashboardCounts;
  peak_slots: OperationalDashboardPeakSlot[];
  machines: OperationalDashboardMachineRow[];
}

export interface OperationalDashboardFilters {
  date?: string;
  machineId?: string;
}

export async function getOperationalDashboardSnapshot(
  filters?: OperationalDashboardFilters,
) {
  const params = new URLSearchParams();
  if (filters?.date) {
    params.set('date', filters.date);
  }
  if (filters?.machineId) {
    params.set('machineId', filters.machineId);
  }
  const query = params.toString();
  const data = await apiAuthFetch<OperationalDashboardSnapshot>(
    `/operational-dashboard/snapshot${query ? `?${query}` : ''}`,
  );
  if (!data) {
    throw new Error('Resposta vazia do painel operacional.');
  }
  return data;
}

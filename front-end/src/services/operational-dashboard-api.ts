import { API_ENDPOINTS } from '@/constants/API_ENDPOINTS';
import { apiAuthFetch } from '@/lib/api';
import {
  mapOperatorActiveFlowResponse,
  type ActiveFlowApiResponse,
} from '@/services/operator-moviment-pallet-api';
import type { OperatorMovimentTaskItem } from '@/types/operator-moviment-pallet.types';

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

export interface OperationalDashboardFilters {
  /** @deprecated Prefer startDate/endDate */
  date?: string;
  startDate?: string;
  endDate?: string;
  sectorId?: string;
  machineId?: string;
  typeMovimentPallet?: 'FORKLIFT' | 'ANY';
}

export interface OperationalDashboardOperatorRow {
  operator_id: string;
  operator_name: string;
  pickups_total: number;
  deliveries_total: number;
  pickups_open: number;
  deliveries_open: number;
  /** Atividades feitas com empilhadeira (tarefas exclusivas de empilhadeira). */
  forklift_total: number;
  /** Atividades feitas com transpaleteira (tarefas de qualquer equipamento). */
  pallet_truck_total: number;
  avg_pickup_duration_ms: number | null;
  avg_delivery_duration_ms: number | null;
}

export interface OperationalDashboardByOperatorSnapshot {
  now: string;
  date: string;
  end_date: string | null;
  sector_id: string | null;
  type_moviment_pallet: 'FORKLIFT' | 'ANY' | null;
  machine_id: string | null;
  operators: OperationalDashboardOperatorRow[];
}

function appendDashboardQueryParams(
  params: URLSearchParams,
  filters?: OperationalDashboardFilters,
) {
  if (filters?.startDate) {
    params.set('startDate', filters.startDate);
  }
  if (filters?.endDate) {
    params.set('endDate', filters.endDate);
  }
  if (!filters?.startDate && !filters?.endDate && filters?.date) {
    params.set('date', filters.date);
  }
  if (filters?.sectorId) {
    params.set('sectorId', filters.sectorId);
  }
  if (filters?.machineId) {
    params.set('machineId', filters.machineId);
  }
  if (filters?.typeMovimentPallet) {
    params.set('typeMovimentPallet', filters.typeMovimentPallet);
  }
}

export async function getOperationalDashboardSnapshot(
  filters?: OperationalDashboardFilters,
) {
  const params = new URLSearchParams();
  appendDashboardQueryParams(params, filters);
  const query = params.toString();
  const data = await apiAuthFetch<OperationalDashboardSnapshot>(
    `/operational-dashboard/snapshot${query ? `?${query}` : ''}`,
  );
  if (!data) {
    throw new Error('Resposta vazia do painel operacional.');
  }
  return data;
}

export async function getOperationalDashboardByOperator(
  filters?: OperationalDashboardFilters,
) {
  const params = new URLSearchParams();
  appendDashboardQueryParams(params, filters);
  const query = params.toString();
  const data = await apiAuthFetch<OperationalDashboardByOperatorSnapshot>(
    `${API_ENDPOINTS.OPERATIONAL_DASHBOARD.BY_OPERATOR}${query ? `?${query}` : ''}`,
  );
  if (!data) {
    throw new Error('Resposta vazia do painel por empilhadeirista.');
  }
  return data;
}

export async function getOperatorCurrentTrajectory(
  operatorId: string,
): Promise<OperatorMovimentTaskItem[]> {
  const trimmedId = operatorId.trim();
  if (!trimmedId) {
    throw new Error('Operador inválido.');
  }

  const data = await apiAuthFetch<ActiveFlowApiResponse>(
    API_ENDPOINTS.OPERATIONAL_DASHBOARD.OPERATOR_CURRENT_TRAJECTORY(trimmedId),
    { method: 'GET' },
  );
  return mapOperatorActiveFlowResponse(data);
}

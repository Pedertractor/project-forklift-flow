import { ENV } from '@/constants/env';
import { apiServerOrigin } from '@/lib/api';
import type { OperatorMovimentWsEvent } from '@/types/operator-moviment-ws.types';

/** Caminho do WebSocket no servidor (sem prefixo `/api`). */
const WS_PATH = '/ws/operator-moviment-pallet';

export function resolveOperatorMovimentWsUrl(token: string): string | null {
  const explicit = (import.meta.env.VITE_WS_URL as string | undefined)?.trim();
  if (explicit) {
    const base = explicit.replace(/\/$/, '');
    return `${base}${WS_PATH}?token=${encodeURIComponent(token)}`;
  }

  const origin = apiServerOrigin();
  if (!origin || !ENV.API_URL) {
    return null;
  }

  const protocol = origin.startsWith('https') ? 'wss' : 'ws';
  const host = origin.replace(/^https?:\/\//, '');
  return `${protocol}://${host}${WS_PATH}?token=${encodeURIComponent(token)}`;
}

export function parseOperatorMovimentWsMessage(raw: string): OperatorMovimentWsEvent | null {
  try {
    const data = JSON.parse(raw) as { type?: string };
    if (typeof data.type !== 'string') {
      return null;
    }
    return data as OperatorMovimentWsEvent;
  } catch {
    return null;
  }
}

export function wsEventMatchesOperator(
  event: OperatorMovimentWsEvent,
  sectorId: string | null | undefined,
  allowedMovimentTypes: readonly string[],
): boolean {
  if (event.sectorId && sectorId && event.sectorId !== sectorId) {
    return false;
  }
  if (
    event.typeMovimentPallet &&
    allowedMovimentTypes.length > 0 &&
    !allowedMovimentTypes.includes(event.typeMovimentPallet)
  ) {
    return false;
  }
  return true;
}

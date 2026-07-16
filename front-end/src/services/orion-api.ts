import { API_ENDPOINTS } from '@/constants/API_ENDPOINTS';
import { apiAuthFetch } from '@/lib/api';

export type OrionTrackedModule = 'dashboard_geral' | 'dashboard_tv';

/** Evita POST duplicado no Strict Mode / remount da mesma abertura. */
const MODULE_ACCESS_COOLDOWN_MS = 30 * 60_000;
const lastModuleAccessAt = new Map<OrionTrackedModule, number>();

/** Registra acesso a módulo no Orion (fire-and-forget; falha não bloqueia a UI). */
export async function notifyOrionModuleAccess(
  module: OrionTrackedModule,
): Promise<void> {
  const now = Date.now();
  const last = lastModuleAccessAt.get(module) ?? 0;
  if (now - last < MODULE_ACCESS_COOLDOWN_MS) {
    return;
  }
  // Síncrono: o 2º useEffect do Strict Mode já encontra o cooldown.
  lastModuleAccessAt.set(module, now);

  try {
    await apiAuthFetch<{ ok: true }>(API_ENDPOINTS.ORION.MODULE_ACCESS, {
      method: 'POST',
      body: JSON.stringify({ module }),
    });
  } catch {
    /* Orion / rede: não impacta a tela */
  }
}

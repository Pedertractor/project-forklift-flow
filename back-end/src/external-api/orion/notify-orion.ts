import { env } from '../../env/index.js'
import type { OrionEventBody } from '../../types/external-api/orion-event.types.js'

/** Evita um evento por refetch do front (foco na janela, navegação, etc.). */
const APP_ACCESS_INTERVAL_MS = 30 * 60_000
const lastAppAccessByUserId = new Map<string, number>()

/** Mesmo intervalo para acesso a módulos (dash/TV podem remontar ao navegar). */
const MODULE_ACCESS_INTERVAL_MS = 30 * 60_000
const lastModuleAccessByKey = new Map<string, number>()

export const ORION_TRACKED_MODULES = [
  'dashboard_geral',
  'dashboard_tv',
] as const

export type OrionTrackedModule = (typeof ORION_TRACKED_MODULES)[number]

export function isOrionTrackedModule(
  value: unknown,
): value is OrionTrackedModule {
  return (
    typeof value === 'string' &&
    (ORION_TRACKED_MODULES as readonly string[]).includes(value)
  )
}

export async function notifyOrion(body: OrionEventBody): Promise<boolean> {
  const { ORION_URL, ORION_APP_TOKEN } = env
  if (!ORION_URL || !ORION_APP_TOKEN) {
    return false
  }

  try {
    const res = await fetch(ORION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ORION_APP_TOKEN}`,
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      console.error('[orion]', res.status, err)
      return false
    }

    const data = (await res.json().catch(() => null)) as { id?: string } | null
    console.log('[orion] evento registrado', data?.id ?? res.status)
    return true
  } catch (error) {
    console.error('[orion]', error)
    return false
  }
}

export function notifyOrionAppAccess(user: {
  id: string
  name: string
  card: string
  role: string
}): void {
  const now = Date.now()
  const last = lastAppAccessByUserId.get(user.id) ?? 0
  if (now - last < APP_ACCESS_INTERVAL_MS) {
    return
  }

  void notifyOrion({
    userId: user.id,
    userName: user.name,
    cardNumberUser: user.card,
    metadata: { action: 'app_access', role: user.role },
  }).then((ok) => {
    if (ok) {
      lastAppAccessByUserId.set(user.id, now)
    }
  })
}

export function notifyOrionModuleAccess(
  user: {
    id: string
    name: string
    card: string
    role: string
  },
  module: OrionTrackedModule,
): void {
  const now = Date.now()
  const key = `${user.id}:${module}`
  const last = lastModuleAccessByKey.get(key) ?? 0
  if (now - last < MODULE_ACCESS_INTERVAL_MS) {
    return
  }

  // Marca antes do fetch: evita race (Strict Mode / requests paralelos).
  lastModuleAccessByKey.set(key, now)

  void notifyOrion({
    userId: user.id,
    userName: user.name,
    cardNumberUser: user.card,
    metadata: {
      action: 'module_access',
      module,
      role: user.role,
    },
  })
}

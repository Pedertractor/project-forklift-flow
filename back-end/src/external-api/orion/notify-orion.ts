import { env } from '../../env/index.js'
import type { OrionEventBody } from '../../types/external-api/orion-event.types.js'

/** Evita um evento por refetch do front (foco na janela, navegação, etc.). */
const APP_ACCESS_INTERVAL_MS = 30 * 60_000
const lastAppAccessByUserId = new Map<string, number>()

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

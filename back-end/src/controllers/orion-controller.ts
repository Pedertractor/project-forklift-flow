import type { RouteHandlerMethod } from 'fastify'
import {
  isOrionTrackedModule,
  notifyOrionModuleAccess,
} from '../external-api/orion/index.js'
import { userRepository } from '../repositories/user.repository.js'
import type { AppJwtPayload } from '../types/auth.types.js'

export const postOrionModuleAccess: RouteHandlerMethod = async (
  request,
  reply,
) => {
  const { module } = (request.body ?? {}) as { module?: unknown }

  if (!isOrionTrackedModule(module)) {
    return reply.status(400).send({
      error:
        'Modulo invalido. Use: dashboard_geral ou dashboard_tv.',
    })
  }

  const actor = request.user as AppJwtPayload
  const profile = await userRepository.findProfileById(actor.sub)
  if (!profile) {
    return reply.status(404).send({ error: 'Usuario nao encontrado.' })
  }

  notifyOrionModuleAccess(
    {
      id: profile.id,
      name: profile.name,
      card: profile.card,
      role: profile.role,
    },
    module,
  )

  return reply.send({ ok: true })
}

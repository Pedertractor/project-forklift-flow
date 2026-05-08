import type { FastifyReply, FastifyRequest } from 'fastify'
import type { RoleUser } from '../generated/prisma/enums.js'
import type { AppJwtPayload } from '../types/auth.types.js'

export function requireRoles(...allowed: RoleUser[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as AppJwtPayload
    if (!allowed.includes(user.role)) {
      return reply.status(403).send({ error: 'Sem permissao para este recurso.' })
    }
  }
}

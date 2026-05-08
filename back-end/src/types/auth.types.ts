import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import type { RoleUser } from '../generated/prisma/enums.js'

export type AppJwtPayload = {
  sub: string
  role: RoleUser
  firstAccess: boolean
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: AppJwtPayload
    user: AppJwtPayload
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<void>
  }
}

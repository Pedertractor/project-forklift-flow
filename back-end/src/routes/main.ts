import type { FastifyInstance } from 'fastify'
import { registerAuthRoutes } from './auth.routes.js'
import { registerUserRoutes } from './user.routes.js'

export async function registerRoutes(fastify: FastifyInstance) {
  await registerAuthRoutes(fastify)
  await registerUserRoutes(fastify)

  fastify.get('/health', async () => {
    return { ok: true, service: 'forklift-back-end' }
  })
}

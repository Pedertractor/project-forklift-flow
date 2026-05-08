import type { FastifyInstance } from 'fastify'
import { getMe, postLogin, postPassword } from '../controllers/auth-controller.js'

export async function registerAuthRoutes(fastify: FastifyInstance) {
  await fastify.register(
    async (authRouter) => {
      authRouter.get('/me', { preHandler: [fastify.authenticate] }, getMe)
      authRouter.post('/login', postLogin)
      authRouter.post(
        '/password',
        { preHandler: [fastify.authenticate] },
        postPassword,
      )
    },
    { prefix: '/auth' },
  )
}

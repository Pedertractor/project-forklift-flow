import fastifyJwt from '@fastify/jwt'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { env } from '../env/index.js'

export async function registerJwtAuth(fastify: FastifyInstance) {
  const secret = env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET nao esta definido no ambiente.')
  }

  await fastify.register(fastifyJwt, {
    secret,
    sign: {
      expiresIn: env.JWT_EXPIRES_IN ?? '7d',
    },
  })

  fastify.decorate(
    'authenticate',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify()
      } catch {
        return reply.status(401).send({ error: 'Nao autorizado' })
      }
    },
  )
}

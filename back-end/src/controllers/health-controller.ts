import type { FastifyReply, FastifyRequest } from 'fastify'

export async function getHealth(_request: FastifyRequest, reply: FastifyReply) {
  return reply.status(200).send({ ok: true })
}

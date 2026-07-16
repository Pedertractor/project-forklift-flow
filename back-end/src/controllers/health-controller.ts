import type { FastifyReply, FastifyRequest } from 'fastify'

/** Liveness / saúde do sistema — público, sem auth. */
export async function getHealth(_request: FastifyRequest, reply: FastifyReply) {
  return reply.status(200).send({
    ok: true,
    service: 'forklift-back-end',
    status: 'healthy',
  })
}

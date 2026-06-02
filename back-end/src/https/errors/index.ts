import type { FastifyReply, FastifyRequest } from 'fastify'

export function defaultErrorHandler(error: Error, _request: FastifyRequest, reply: FastifyReply) {
  const statusCode = (error as Error & { statusCode?: number }).statusCode
  if (typeof statusCode === 'number' && statusCode >= 400 && statusCode < 500) {
    return reply.status(statusCode).send({ error: error.message })
  }
  return reply.status(500).send({
    error: error.message,
    message: error.message,
  })
}

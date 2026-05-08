import type { FastifyReply, FastifyRequest } from 'fastify';

export function defaultErrorHandler(error: Error, _request: FastifyRequest, reply: FastifyReply) {
  return reply.status(500).send({
    message: error.message,
  });
}

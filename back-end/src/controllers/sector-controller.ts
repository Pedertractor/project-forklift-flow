import type { RouteHandlerMethod } from 'fastify'
import { listSectors } from '../services/sector.service.js'

export const getListSectors: RouteHandlerMethod = async (_request, reply) => {
  const sectors = await listSectors()
  return reply.send({ sectors })
}

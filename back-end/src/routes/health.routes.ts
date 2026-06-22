import type { FastifyInstance } from 'fastify'
import { getHealth } from '../controllers/health-controller.js'

export async function registerHealthRoutes(fastify: FastifyInstance) {
  fastify.get('/health', getHealth)
}

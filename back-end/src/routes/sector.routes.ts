import type { FastifyInstance } from 'fastify'
import { getListSectors } from '../controllers/sector-controller.js'
import { requireMachineDomainRoles } from '../middleware/require-roles.js'

export async function registerSectorRoutes(fastify: FastifyInstance) {
  await fastify.register(
    async (router) => {
      router.get(
        '/',
        {
          preHandler: [fastify.authenticate, requireMachineDomainRoles()],
        },
        getListSectors,
      )
    },
    { prefix: '/sectors' },
  )
}

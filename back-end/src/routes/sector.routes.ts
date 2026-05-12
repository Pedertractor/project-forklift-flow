import type { FastifyInstance } from 'fastify'
import { RoleUser } from '../generated/prisma/enums.js'
import {
  deleteSectorHandler,
  getListSectors,
  getSectorByIdHandler,
  patchUpdateSector,
  postCreateSector,
} from '../controllers/sector-controller.js'
import {
  requireMachineDomainRoles,
  requireRoles,
} from '../middleware/require-roles.js'

export async function registerSectorRoutes(fastify: FastifyInstance) {
  await fastify.register(
    async (router) => {
      router.post(
        '/',
        {
          preHandler: [fastify.authenticate, requireRoles(RoleUser.ADMIN)],
        },
        postCreateSector,
      )
      router.get(
        '/',
        {
          preHandler: [fastify.authenticate, requireMachineDomainRoles()],
        },
        getListSectors,
      )
      router.get(
        '/:sectorId',
        {
          preHandler: [fastify.authenticate, requireRoles(RoleUser.ADMIN)],
        },
        getSectorByIdHandler,
      )
      router.patch(
        '/:sectorId',
        {
          preHandler: [fastify.authenticate, requireRoles(RoleUser.ADMIN)],
        },
        patchUpdateSector,
      )
      router.delete(
        '/:sectorId',
        {
          preHandler: [fastify.authenticate, requireRoles(RoleUser.ADMIN)],
        },
        deleteSectorHandler,
      )
    },
    { prefix: '/sectors' },
  )
}

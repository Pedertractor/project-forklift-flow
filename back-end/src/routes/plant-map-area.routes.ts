import type { FastifyInstance } from 'fastify'
import {
  deletePlantMapAreaHandler,
  getListPlantMapAreas,
  putUpsertPlantMapArea,
} from '../controllers/plant-map-area-controller.js'
import {
  requireMachineCatalogReadRoles,
  requireMachineDomainRoles,
} from '../middleware/require-roles.js'

export async function registerPlantMapAreaRoutes(fastify: FastifyInstance) {
  await fastify.register(
    async (router) => {
      router.get(
        '/areas',
        {
          preHandler: [fastify.authenticate, requireMachineCatalogReadRoles()],
        },
        getListPlantMapAreas,
      )
      router.put(
        '/areas',
        {
          preHandler: [fastify.authenticate, requireMachineDomainRoles()],
        },
        putUpsertPlantMapArea,
      )
      router.delete(
        '/areas/:areaId',
        {
          preHandler: [fastify.authenticate, requireMachineDomainRoles()],
        },
        deletePlantMapAreaHandler,
      )
    },
    { prefix: '/plant-map' },
  )
}

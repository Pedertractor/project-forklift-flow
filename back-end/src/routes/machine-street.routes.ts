import type { FastifyInstance } from 'fastify'
import {
  deleteMachineStreetHandler,
  getListMachineStreets,
  getMachineStreetByIdHandler,
  patchUpdateMachineStreet,
  postCreateMachineStreet,
} from '../controllers/machine-street-controller.js'
import {
  requireMachineCatalogReadRoles,
  requireMachineDomainRoles,
} from '../middleware/require-roles.js'

export async function registerMachineStreetRoutes(fastify: FastifyInstance) {
  await fastify.register(
    async (router) => {
      router.post(
        '/',
        {
          preHandler: [fastify.authenticate, requireMachineDomainRoles()],
        },
        postCreateMachineStreet,
      )
      router.get(
        '/',
        {
          preHandler: [fastify.authenticate, requireMachineCatalogReadRoles()],
        },
        getListMachineStreets,
      )
      router.get(
        '/:machineStreetId',
        {
          preHandler: [fastify.authenticate, requireMachineCatalogReadRoles()],
        },
        getMachineStreetByIdHandler,
      )
      router.patch(
        '/:machineStreetId',
        {
          preHandler: [fastify.authenticate, requireMachineDomainRoles()],
        },
        patchUpdateMachineStreet,
      )
      router.delete(
        '/:machineStreetId',
        {
          preHandler: [fastify.authenticate, requireMachineDomainRoles()],
        },
        deleteMachineStreetHandler,
      )
    },
    { prefix: '/machine-streets' },
  )
}

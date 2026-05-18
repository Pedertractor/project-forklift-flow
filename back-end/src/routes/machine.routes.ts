import type { FastifyInstance } from 'fastify'
import {
  deleteMachineHandler,
  getListMachines,
  getMachineByIdHandler,
  patchUpdateMachine,
  postCreateMachine,
} from '../controllers/machine-controller.js'
import {
  requireMachineCatalogReadRoles,
  requireMachineDomainRoles,
} from '../middleware/require-roles.js'

export async function registerMachineRoutes(fastify: FastifyInstance) {
  await fastify.register(
    async (router) => {
      router.post(
        '/',
        {
          preHandler: [fastify.authenticate, requireMachineDomainRoles()],
        },
        postCreateMachine,
      )
      router.get(
        '/',
        {
          preHandler: [fastify.authenticate, requireMachineCatalogReadRoles()],
        },
        getListMachines,
      )
      router.get(
        '/:machineId',
        {
          preHandler: [fastify.authenticate, requireMachineCatalogReadRoles()],
        },
        getMachineByIdHandler,
      )
      router.patch(
        '/:machineId',
        {
          preHandler: [fastify.authenticate, requireMachineDomainRoles()],
        },
        patchUpdateMachine,
      )
      router.delete(
        '/:machineId',
        {
          preHandler: [fastify.authenticate, requireMachineDomainRoles()],
        },
        deleteMachineHandler,
      )
    },
    { prefix: '/machines' },
  )
}

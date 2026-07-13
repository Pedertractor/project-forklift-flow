import type { FastifyInstance } from 'fastify'
import {
  deleteMachineHandler,
  getListMachines,
  getMachineByIdHandler,
  patchUpdateMachine,
  postCreateMachine,
} from '../controllers/machine-controller.js'
import {
  deleteMachineToolingHandler,
  getListMachineToolings,
  patchUpdateMachineTooling,
  postCreateMachineTooling,
} from '../controllers/machine-tooling-controller.js'
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
        '/:machineId/toolings',
        {
          preHandler: [fastify.authenticate, requireMachineDomainRoles()],
        },
        getListMachineToolings,
      )
      router.post(
        '/:machineId/toolings',
        {
          preHandler: [fastify.authenticate, requireMachineDomainRoles()],
        },
        postCreateMachineTooling,
      )
      router.patch(
        '/:machineId/toolings/:toolingId',
        {
          preHandler: [fastify.authenticate, requireMachineDomainRoles()],
        },
        patchUpdateMachineTooling,
      )
      router.delete(
        '/:machineId/toolings/:toolingId',
        {
          preHandler: [fastify.authenticate, requireMachineDomainRoles()],
        },
        deleteMachineToolingHandler,
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

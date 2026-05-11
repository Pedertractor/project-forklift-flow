import type { FastifyInstance } from 'fastify'
import {
  deleteMachineHandler,
  getListMachines,
  getMachineByIdHandler,
  patchUpdateMachine,
  postCreateMachine,
} from '../controllers/machine-controller.js'
import { requireMachineDomainRoles } from '../middleware/require-roles.js'

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
          preHandler: [fastify.authenticate, requireMachineDomainRoles()],
        },
        getListMachines,
      )
      router.get(
        '/:machineId',
        {
          preHandler: [fastify.authenticate, requireMachineDomainRoles()],
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

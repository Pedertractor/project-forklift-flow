import type { FastifyInstance } from 'fastify'
import {
  deleteTypeMachineHandler,
  getListTypeMachines,
  getTypeMachineByIdHandler,
  patchUpdateTypeMachine,
  postCreateTypeMachine,
} from '../controllers/type-machine-controller.js'
import { requireMachineDomainRoles } from '../middleware/require-roles.js'

export async function registerTypeMachineRoutes(fastify: FastifyInstance) {
  await fastify.register(
    async (router) => {
      router.post(
        '/',
        {
          preHandler: [fastify.authenticate, requireMachineDomainRoles()],
        },
        postCreateTypeMachine,
      )
      router.get(
        '/',
        {
          preHandler: [fastify.authenticate, requireMachineDomainRoles()],
        },
        getListTypeMachines,
      )
      router.get(
        '/:typeMachineId',
        {
          preHandler: [fastify.authenticate, requireMachineDomainRoles()],
        },
        getTypeMachineByIdHandler,
      )
      router.patch(
        '/:typeMachineId',
        {
          preHandler: [fastify.authenticate, requireMachineDomainRoles()],
        },
        patchUpdateTypeMachine,
      )
      router.delete(
        '/:typeMachineId',
        {
          preHandler: [fastify.authenticate, requireMachineDomainRoles()],
        },
        deleteTypeMachineHandler,
      )
    },
    { prefix: '/type-machines' },
  )
}

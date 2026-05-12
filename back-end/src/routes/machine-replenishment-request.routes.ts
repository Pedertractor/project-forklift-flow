import type { FastifyInstance } from 'fastify'
import {
  deleteMachineReplenishmentRequestHandler,
  getListMachineReplenishmentRequests,
  getMachineReplenishmentRequestByIdHandler,
  patchUpdateMachineReplenishmentRequest,
  postCreateMachineReplenishmentRequest,
} from '../controllers/machine-replenishment-request-controller.js'
import { requireMachineReplenishmentRequestRoles } from '../middleware/require-roles.js'

export async function registerMachineReplenishmentRequestRoutes(
  fastify: FastifyInstance,
) {
  await fastify.register(
    async (router) => {
      router.post(
        '/',
        {
          preHandler: [
            fastify.authenticate,
            requireMachineReplenishmentRequestRoles(),
          ],
        },
        postCreateMachineReplenishmentRequest,
      )
      router.get(
        '/',
        {
          preHandler: [
            fastify.authenticate,
            requireMachineReplenishmentRequestRoles(),
          ],
        },
        getListMachineReplenishmentRequests,
      )
      router.get(
        '/:requestId',
        {
          preHandler: [
            fastify.authenticate,
            requireMachineReplenishmentRequestRoles(),
          ],
        },
        getMachineReplenishmentRequestByIdHandler,
      )
      router.patch(
        '/:requestId',
        {
          preHandler: [
            fastify.authenticate,
            requireMachineReplenishmentRequestRoles(),
          ],
        },
        patchUpdateMachineReplenishmentRequest,
      )
      router.delete(
        '/:requestId',
        {
          preHandler: [
            fastify.authenticate,
            requireMachineReplenishmentRequestRoles(),
          ],
        },
        deleteMachineReplenishmentRequestHandler,
      )
    },
    { prefix: '/machine-replenishment-requests' },
  )
}

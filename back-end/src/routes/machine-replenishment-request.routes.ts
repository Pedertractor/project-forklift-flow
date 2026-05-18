import type { FastifyInstance } from 'fastify'
import {
  deleteMachineReplenishmentRequestHandler,
  getListMachineReplenishmentRequests,
  getMachineReplenishmentRequestByIdHandler,
  getPendingPreparationRequests,
  patchUpdateMachineReplenishmentRequest,
  postCreateMachineReplenishmentRequest,
  postMarkPalletReady,
} from '../controllers/machine-replenishment-request-controller.js'
import {
  requireMachineReplenishmentReadRoles,
  requireMachineReplenishmentRequestRoles,
} from '../middleware/require-roles.js'

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
            requireMachineReplenishmentReadRoles(),
          ],
        },
        getListMachineReplenishmentRequests,
      )
      router.get(
        '/pending-preparation',
        {
          preHandler: [
            fastify.authenticate,
            requireMachineReplenishmentReadRoles(),
          ],
        },
        getPendingPreparationRequests,
      )
      router.post(
        '/:requestId/mark-pallet-ready',
        {
          preHandler: [
            fastify.authenticate,
            requireMachineReplenishmentRequestRoles(),
          ],
        },
        postMarkPalletReady,
      )
      router.get(
        '/:requestId',
        {
          preHandler: [
            fastify.authenticate,
            requireMachineReplenishmentReadRoles(),
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

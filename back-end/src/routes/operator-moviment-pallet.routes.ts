import type { FastifyInstance } from 'fastify'
import {
  deleteUnbindOperatorMovimentPallet,
  getListMovimentPalletsForOperator,
  getListMyMovimentPalletTasks,
  getListOpenReplenishmentRequestsForMovimentOperator,
  getOperatorCurrentMovimentPalletHandler,
  postAcceptReplenishmentRequestForMovimentOperator,
  postBindOperatorMovimentPallet,
} from '../controllers/operator-moviment-pallet-controller.js'
import { requireForkliftOrFollowUpOperatorRole } from '../middleware/require-roles.js'

export async function registerOperatorMovimentPalletRoutes(
  fastify: FastifyInstance,
) {
  await fastify.register(
    async (router) => {
      router.get(
        '/moviment-pallets',
        {
          preHandler: [
            fastify.authenticate,
            requireForkliftOrFollowUpOperatorRole(),
          ],
        },
        getListMovimentPalletsForOperator,
      )
      router.get(
        '/my-moviment-pallet',
        {
          preHandler: [
            fastify.authenticate,
            requireForkliftOrFollowUpOperatorRole(),
          ],
        },
        getOperatorCurrentMovimentPalletHandler,
      )
      router.post(
        '/my-moviment-pallet',
        {
          preHandler: [
            fastify.authenticate,
            requireForkliftOrFollowUpOperatorRole(),
          ],
        },
        postBindOperatorMovimentPallet,
      )
      router.delete(
        '/my-moviment-pallet',
        {
          preHandler: [
            fastify.authenticate,
            requireForkliftOrFollowUpOperatorRole(),
          ],
        },
        deleteUnbindOperatorMovimentPallet,
      )
      router.get(
        '/replenishment-requests',
        {
          preHandler: [
            fastify.authenticate,
            requireForkliftOrFollowUpOperatorRole(),
          ],
        },
        getListOpenReplenishmentRequestsForMovimentOperator,
      )
      router.get(
        '/my-tasks',
        {
          preHandler: [
            fastify.authenticate,
            requireForkliftOrFollowUpOperatorRole(),
          ],
        },
        getListMyMovimentPalletTasks,
      )
      router.post(
        '/replenishment-requests/:requestId/accept',
        {
          preHandler: [
            fastify.authenticate,
            requireForkliftOrFollowUpOperatorRole(),
          ],
        },
        postAcceptReplenishmentRequestForMovimentOperator,
      )
    },
    { prefix: '/operator-moviment-pallet' },
  )
}

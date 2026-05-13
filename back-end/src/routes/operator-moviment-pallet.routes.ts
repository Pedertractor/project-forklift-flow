import type { FastifyInstance } from 'fastify'
import {
  deleteUnbindOperatorMovimentPallet,
  getListMovimentPalletsForOperator,
  getListMyMovimentPalletTasks,
  getListOpenReplenishmentRequestsForMovimentOperator,
  getListTripRouteSuggestions,
  getOperatorCurrentMovimentPalletHandler,
  postAcceptReplenishmentRequestForMovimentOperator,
  postAcceptTripRouteSuggestion,
  postAcceptOpenPickupTask,
  postBindOperatorMovimentPallet,
  postCompleteDeliverTask,
  postCompletePickupTask,
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
      router.get(
        '/trip-suggestions',
        {
          preHandler: [
            fastify.authenticate,
            requireForkliftOrFollowUpOperatorRole(),
          ],
        },
        getListTripRouteSuggestions,
      )
      router.post(
        '/trip-suggestions/:tripSuggestionId/accept',
        {
          preHandler: [
            fastify.authenticate,
            requireForkliftOrFollowUpOperatorRole(),
          ],
        },
        postAcceptTripRouteSuggestion,
      )
      router.post(
        '/tasks/:taskId/accept-pickup',
        {
          preHandler: [
            fastify.authenticate,
            requireForkliftOrFollowUpOperatorRole(),
          ],
        },
        postAcceptOpenPickupTask,
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
      router.post(
        '/tasks/:taskId/complete-deliver',
        {
          preHandler: [
            fastify.authenticate,
            requireForkliftOrFollowUpOperatorRole(),
          ],
        },
        postCompleteDeliverTask,
      )
      router.post(
        '/tasks/:taskId/complete-pickup',
        {
          preHandler: [
            fastify.authenticate,
            requireForkliftOrFollowUpOperatorRole(),
          ],
        },
        postCompletePickupTask,
      )
    },
    { prefix: '/operator-moviment-pallet' },
  )
}

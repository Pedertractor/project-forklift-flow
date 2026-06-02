import type { FastifyInstance } from 'fastify'
import {
  getDeliveryTaskByIdHandler,
  getListDeliveryTasks,
  getPendingSupplyRequests,
  getSectorTransportOperators,
  postCreateDeliveryTask,
  postMarkDeliveryTaskPrepared,
} from '../controllers/delivery-task-controller.js'
import {
  requireMachineReplenishmentReadRoles,
  requireMachineReplenishmentRequestRoles,
} from '../middleware/require-roles.js'

export async function registerDeliveryTaskRoutes(fastify: FastifyInstance) {
  await fastify.register(
    async (router) => {
      router.get(
        '/pending-supply-requests',
        {
          preHandler: [
            fastify.authenticate,
            requireMachineReplenishmentReadRoles(),
          ],
        },
        getPendingSupplyRequests,
      )
      router.get(
        '/sector-transport-operators',
        {
          preHandler: [
            fastify.authenticate,
            requireMachineReplenishmentReadRoles(),
          ],
        },
        getSectorTransportOperators,
      )
      router.post(
        '/',
        {
          preHandler: [
            fastify.authenticate,
            requireMachineReplenishmentRequestRoles(),
          ],
        },
        postCreateDeliveryTask,
      )
      router.get(
        '/',
        {
          preHandler: [
            fastify.authenticate,
            requireMachineReplenishmentReadRoles(),
          ],
        },
        getListDeliveryTasks,
      )
      router.get(
        '/:taskId',
        {
          preHandler: [
            fastify.authenticate,
            requireMachineReplenishmentReadRoles(),
          ],
        },
        getDeliveryTaskByIdHandler,
      )
      router.post(
        '/:taskId/mark-prepared',
        {
          preHandler: [
            fastify.authenticate,
            requireMachineReplenishmentRequestRoles(),
          ],
        },
        postMarkDeliveryTaskPrepared,
      )
    },
    { prefix: '/delivery-tasks' },
  )
}

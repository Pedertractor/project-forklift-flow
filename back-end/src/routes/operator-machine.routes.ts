import type { FastifyInstance } from 'fastify'
import {
  deleteToolingForOperator,
  deleteUnbindOperatorMachine,
  getListMachineTasksForOperator,
  getListMachinesForOperator,
  getListOperatorSupplyRequestsForOperator,
  getListToolingsForOperator,
  getOperatorCurrentMachineHandler,
  postBindOperatorMachine,
  postCancelPickupRequest,
  postCreateToolingForOperator,
  postRequestPickupOnly,
  postRequestPickupWithReplenishment,
  postRequestSupplyOnly,
} from '../controllers/operator-machine-controller.js'
import { requireOperatorMachineRole } from '../middleware/require-roles.js'

export async function registerOperatorMachineRoutes(fastify: FastifyInstance) {
  await fastify.register(
    async (router) => {
      router.get(
        '/machines',
        {
          preHandler: [fastify.authenticate, requireOperatorMachineRole()],
        },
        getListMachinesForOperator,
      )
      router.get(
        '/my-machine',
        {
          preHandler: [fastify.authenticate, requireOperatorMachineRole()],
        },
        getOperatorCurrentMachineHandler,
      )
      router.post(
        '/my-machine',
        {
          preHandler: [fastify.authenticate, requireOperatorMachineRole()],
        },
        postBindOperatorMachine,
      )
      router.delete(
        '/my-machine',
        {
          preHandler: [fastify.authenticate, requireOperatorMachineRole()],
        },
        deleteUnbindOperatorMachine,
      )
      router.get(
        '/machine-tasks',
        {
          preHandler: [fastify.authenticate, requireOperatorMachineRole()],
        },
        getListMachineTasksForOperator,
      )
      router.get(
        '/operator-supply-requests',
        {
          preHandler: [fastify.authenticate, requireOperatorMachineRole()],
        },
        getListOperatorSupplyRequestsForOperator,
      )
      router.post(
        '/pickup-only',
        {
          preHandler: [fastify.authenticate, requireOperatorMachineRole()],
        },
        postRequestPickupOnly,
      )
      router.post(
        '/pickup-with-replenishment',
        {
          preHandler: [fastify.authenticate, requireOperatorMachineRole()],
        },
        postRequestPickupWithReplenishment,
      )
      router.post(
        '/supply-only',
        {
          preHandler: [fastify.authenticate, requireOperatorMachineRole()],
        },
        postRequestSupplyOnly,
      )
      router.get(
        '/toolings',
        {
          preHandler: [fastify.authenticate, requireOperatorMachineRole()],
        },
        getListToolingsForOperator,
      )
      router.post(
        '/toolings',
        {
          preHandler: [fastify.authenticate, requireOperatorMachineRole()],
        },
        postCreateToolingForOperator,
      )
      router.delete(
        '/toolings/:toolingId',
        {
          preHandler: [fastify.authenticate, requireOperatorMachineRole()],
        },
        deleteToolingForOperator,
      )
      router.post(
        '/pickup-tasks/:pickupTaskId/cancel',
        {
          preHandler: [fastify.authenticate, requireOperatorMachineRole()],
        },
        postCancelPickupRequest,
      )
    },
    { prefix: '/operator-machine' },
  )
}

import type { FastifyInstance } from 'fastify'
import {
  deleteUnbindOperatorMachine,
  getListMachinesForOperator,
  getListOperatorSupplyRequestsForOperator,
  getListReplenishmentRequestsForOperator,
  getOperatorCurrentMachineHandler,
  getReplenishmentPickupProgress,
  postBindOperatorMachine,
  postFinalizeMachineCycle,
  postRequestPalletPickup,
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
      router.post(
        '/my-machine/finalize',
        {
          preHandler: [fastify.authenticate, requireOperatorMachineRole()],
        },
        postFinalizeMachineCycle,
      )
      router.get(
        '/replenishment-requests',
        {
          preHandler: [fastify.authenticate, requireOperatorMachineRole()],
        },
        getListReplenishmentRequestsForOperator,
      )
      router.get(
        '/operator-supply-requests',
        {
          preHandler: [fastify.authenticate, requireOperatorMachineRole()],
        },
        getListOperatorSupplyRequestsForOperator,
      )
      router.get(
        '/replenishment-requests/:requestId/pickup-progress',
        {
          preHandler: [fastify.authenticate, requireOperatorMachineRole()],
        },
        getReplenishmentPickupProgress,
      )
      router.post(
        '/replenishment-requests/:requestId/pickup',
        {
          preHandler: [fastify.authenticate, requireOperatorMachineRole()],
        },
        postRequestPalletPickup,
      )
    },
    { prefix: '/operator-machine' },
  )
}

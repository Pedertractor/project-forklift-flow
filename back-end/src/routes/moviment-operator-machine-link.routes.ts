import type { FastifyInstance } from 'fastify'
import { RoleUser } from '../generated/prisma/enums.js'
import {
  deleteMovimentOperatorMachineLinkByPairHandler,
  deleteMovimentOperatorMachineLinkHandler,
  getListMovimentOperatorMachineLinks,
  getMovimentOperatorPriorityBoard,
  postCreateMovimentOperatorMachineLink,
  putReplaceMovimentOperatorMachineLinks,
} from '../controllers/moviment-operator-machine-link-controller.js'
import { requireRoles } from '../middleware/require-roles.js'

const adminRoles = [RoleUser.ADMIN, RoleUser.LEADER] as const

export async function registerMovimentOperatorMachineLinkRoutes(
  fastify: FastifyInstance,
) {
  await fastify.register(
    async (router) => {
      router.get(
        '/board',
        {
          preHandler: [fastify.authenticate, requireRoles(...adminRoles)],
        },
        getMovimentOperatorPriorityBoard,
      )
      router.get(
        '/',
        {
          preHandler: [fastify.authenticate, requireRoles(...adminRoles)],
        },
        getListMovimentOperatorMachineLinks,
      )
      router.post(
        '/',
        {
          preHandler: [fastify.authenticate, requireRoles(...adminRoles)],
        },
        postCreateMovimentOperatorMachineLink,
      )
      router.put(
        '/operators/:operatorId',
        {
          preHandler: [fastify.authenticate, requireRoles(...adminRoles)],
        },
        putReplaceMovimentOperatorMachineLinks,
      )
      router.delete(
        '/by-pair',
        {
          preHandler: [fastify.authenticate, requireRoles(...adminRoles)],
        },
        deleteMovimentOperatorMachineLinkByPairHandler,
      )
      router.delete(
        '/:linkId',
        {
          preHandler: [fastify.authenticate, requireRoles(...adminRoles)],
        },
        deleteMovimentOperatorMachineLinkHandler,
      )
    },
    { prefix: '/moviment-operator-machine-links' },
  )
}

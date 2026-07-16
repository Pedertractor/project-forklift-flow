import type { FastifyInstance } from 'fastify'
import { RoleUser } from '../generated/prisma/enums.js'
import { postOrionModuleAccess } from '../controllers/orion-controller.js'
import { requireRoles } from '../middleware/require-roles.js'

const orionAccessRoles = [RoleUser.ADMIN, RoleUser.LEADER] as const

export async function registerOrionRoutes(fastify: FastifyInstance) {
  await fastify.register(
    async (router) => {
      router.post(
        '/module-access',
        {
          preHandler: [fastify.authenticate, requireRoles(...orionAccessRoles)],
        },
        postOrionModuleAccess,
      )
    },
    { prefix: '/orion' },
  )
}

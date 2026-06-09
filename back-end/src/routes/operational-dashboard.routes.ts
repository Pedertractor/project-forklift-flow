import type { FastifyInstance } from 'fastify'
import { RoleUser } from '../generated/prisma/enums.js'
import {
  getOperatorCurrentTrajectoryHandler,
  getOperationalDashboardByOperatorHandler,
  getOperationalDashboardSnapshotHandler,
} from '../controllers/operational-dashboard-controller.js'
import { requireRoles } from '../middleware/require-roles.js'

const dashboardRoles = [
  RoleUser.ADMIN,
  RoleUser.LEADER,
  RoleUser.SUPERVISOR,
  RoleUser.MANAGER,
] as const

export async function registerOperationalDashboardRoutes(fastify: FastifyInstance) {
  await fastify.register(
    async (router) => {
      router.get(
        '/snapshot',
        {
          preHandler: [fastify.authenticate, requireRoles(...dashboardRoles)],
        },
        getOperationalDashboardSnapshotHandler,
      )
      router.get(
        '/by-operator',
        {
          preHandler: [fastify.authenticate, requireRoles(...dashboardRoles)],
        },
        getOperationalDashboardByOperatorHandler,
      )
      router.get(
        '/operators/:operatorId/current-trajectory',
        {
          preHandler: [fastify.authenticate, requireRoles(...dashboardRoles)],
        },
        getOperatorCurrentTrajectoryHandler,
      )
    },
    { prefix: '/operational-dashboard' },
  )
}

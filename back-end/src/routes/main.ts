import type { FastifyInstance } from 'fastify'
import { registerAuthRoutes } from './auth.routes.js'
import { registerHealthRoutes } from './health.routes.js'
import { registerDeliveryTaskRoutes } from './delivery-task.routes.js'
import { registerMachineRoutes } from './machine.routes.js'
import { registerMachineStreetRoutes } from './machine-street.routes.js'
import { registerMovimentOperatorMachineLinkRoutes } from './moviment-operator-machine-link.routes.js'
import { registerOperatorMachineRoutes } from './operator-machine.routes.js'
import { registerOperationalDashboardRoutes } from './operational-dashboard.routes.js'
import { registerOperatorMovimentPalletRoutes } from './operator-moviment-pallet.routes.js'
import { registerSectorRoutes } from './sector.routes.js'
import { registerTypeMachineRoutes } from './type-machine.routes.js'
import { registerUserRoutes } from './user.routes.js'

export async function registerRoutes(fastify: FastifyInstance) {
  await registerHealthRoutes(fastify)
  await registerAuthRoutes(fastify)
  await registerUserRoutes(fastify)
  await registerSectorRoutes(fastify)
  await registerTypeMachineRoutes(fastify)
  await registerMachineStreetRoutes(fastify)
  await registerMachineRoutes(fastify)
  await registerDeliveryTaskRoutes(fastify)
  await registerOperatorMachineRoutes(fastify)
  await registerOperatorMovimentPalletRoutes(fastify)
  await registerMovimentOperatorMachineLinkRoutes(fastify)
  await registerOperationalDashboardRoutes(fastify)
}

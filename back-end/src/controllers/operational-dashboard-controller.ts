import type { RouteHandlerMethod } from 'fastify'
import { getOperationalDashboardSnapshot } from '../services/operational-dashboard.service.js'

export const getOperationalDashboardSnapshotHandler: RouteHandlerMethod = async (
  request,
  reply,
) => {
  const { date, machineId } = (request.query ?? {}) as {
    date?: string
    machineId?: string
  }

  const options: { date?: string; machineId?: string } = {}
  if (date !== undefined) options.date = date
  if (machineId !== undefined) options.machineId = machineId

  const snapshot = await getOperationalDashboardSnapshot(options)
  return reply.send(snapshot)
}

import type { RouteHandlerMethod } from 'fastify'
import {
  getOperationalDashboardByOperator,
  getOperationalDashboardSnapshot,
} from '../services/operational-dashboard.service.js'
import { resolveOperationalDashboardSectorId } from '../services/operational-dashboard-sector.js'
import type { AppJwtPayload } from '../types/auth.types.js'

export const getOperationalDashboardSnapshotHandler: RouteHandlerMethod = async (
  request,
  reply,
) => {
  const { date, startDate, endDate, machineId, sectorId } = (request.query ?? {}) as {
    date?: string
    startDate?: string
    endDate?: string
    machineId?: string
    sectorId?: string
  }

  const actor = request.user as AppJwtPayload
  const resolvedSectorId = await resolveOperationalDashboardSectorId(
    actor,
    sectorId,
  )

  const options: {
    date?: string
    startDate?: string
    endDate?: string
    machineId?: string
    sectorId?: string | null
  } = {}
  if (date !== undefined) options.date = date
  if (startDate !== undefined) options.startDate = startDate
  if (endDate !== undefined) options.endDate = endDate
  if (machineId !== undefined) options.machineId = machineId
  options.sectorId = resolvedSectorId

  const snapshot = await getOperationalDashboardSnapshot(options)
  return reply.send(snapshot)
}

export const getOperationalDashboardByOperatorHandler: RouteHandlerMethod =
  async (request, reply) => {
    const { date, startDate, endDate, machineId, typeMovimentPallet, sectorId } =
      (request.query ?? {}) as {
        date?: string
        startDate?: string
        endDate?: string
        machineId?: string
        typeMovimentPallet?: string
        sectorId?: string
      }

    const actor = request.user as AppJwtPayload
    const resolvedSectorId = await resolveOperationalDashboardSectorId(
      actor,
      sectorId,
    )

    const options: {
      date?: string
      startDate?: string
      endDate?: string
      machineId?: string
      typeMovimentPallet?: string
      sectorId?: string | null
    } = {}
    if (date !== undefined) options.date = date
    if (startDate !== undefined) options.startDate = startDate
    if (endDate !== undefined) options.endDate = endDate
    if (machineId !== undefined) options.machineId = machineId
    if (typeMovimentPallet !== undefined) {
      options.typeMovimentPallet = typeMovimentPallet
    }
    options.sectorId = resolvedSectorId

    const snapshot = await getOperationalDashboardByOperator(options)
    return reply.send(snapshot)
  }

import type { RouteHandlerMethod } from 'fastify'
import { RoleUser } from '../generated/prisma/enums.js'
import { AuthError, UserNotFoundError } from '../errors/domain-errors.js'
import {
  getOperatorCurrentTrajectoryForDashboard,
  getOperationalDashboardByOperator,
  getOperationalDashboardSnapshot,
  getOperationalTvMonitorSnapshot,
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

export const getOperatorCurrentTrajectoryHandler: RouteHandlerMethod = async (
  request,
  reply,
) => {
  const { operatorId } = request.params as { operatorId?: string }
  const actor = request.user as AppJwtPayload

  try {
    const payload = await getOperatorCurrentTrajectoryForDashboard(
      actor,
      operatorId ?? '',
    )
    return reply.send(payload)
  } catch (error) {
    if (error instanceof UserNotFoundError) {
      return reply.status(404).send({ error: error.message })
    }
    if (error instanceof AuthError) {
      return reply.status(403).send({ error: error.message })
    }
    throw error
  }
}

export const getOperationalTvMonitorHandler: RouteHandlerMethod = async (
  request,
  reply,
) => {
  const { sectorId } = (request.query ?? {}) as { sectorId?: string }
  const actor = request.user as AppJwtPayload
  const resolvedSectorId = await resolveOperationalDashboardSectorId(
    actor,
    sectorId,
  )

  if (actor.role === RoleUser.LEADER && !resolvedSectorId) {
    return reply
      .status(403)
      .send({ error: 'Lider sem setor vinculado.' })
  }

  const snapshot = await getOperationalTvMonitorSnapshot({
    sectorId: resolvedSectorId,
  })
  return reply.send(snapshot)
}

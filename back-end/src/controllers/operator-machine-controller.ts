import type { RouteHandlerMethod } from 'fastify'
import { RequestStatus } from '../generated/prisma/enums.js'
import {
  MachineNotFoundError,
  MachineNotInOperatorSectorError,
  MachineReplenishmentRequestNotFoundError,
  OperatorWithoutSectorError,
  PickupTaskAlreadyOpenError,
  ReplenishmentRequestNotForOperatorMachineError,
  ReplenishmentRequestNotOnMachineStatusError,
} from '../errors/domain-errors.js'
import {
  bindOperatorToMachine,
  getOperatorCurrentMachine,
  listMachinesForOperatorPicker,
  listReplenishmentRequestsForOperatorMachine,
  requestPalletPickupFromMachine,
  unbindOperatorFromMachines,
} from '../services/operator-machine.service.js'
import type { AppJwtPayload } from '../types/auth.types.js'

function parseOptionalRequestStatus(
  value: unknown,
): RequestStatus | undefined {
  if (value === undefined || value === '') {
    return undefined
  }
  if (typeof value !== 'string') {
    return undefined
  }
  if (!(Object.values(RequestStatus) as string[]).includes(value)) {
    return undefined
  }
  return value as RequestStatus
}

export const postBindOperatorMachine: RouteHandlerMethod = async (
  request,
  reply,
) => {
  const user = request.user as AppJwtPayload
  const body = (request.body ?? {}) as { machineId?: string }
  if (typeof body.machineId !== 'string' || body.machineId.trim() === '') {
    return reply.status(400).send({ error: 'Informe machineId.' })
  }
  try {
    const machine = await bindOperatorToMachine(user.sub, body.machineId.trim())
    return reply.send({ machine })
  } catch (error) {
    if (error instanceof OperatorWithoutSectorError) {
      return reply.status(400).send({ error: error.message })
    }
    if (error instanceof MachineNotInOperatorSectorError) {
      return reply.status(403).send({ error: error.message })
    }
    if (error instanceof MachineNotFoundError) {
      return reply.status(404).send({ error: error.message })
    }
    throw error
  }
}

export const deleteUnbindOperatorMachine: RouteHandlerMethod = async (
  request,
  reply,
) => {
  const user = request.user as AppJwtPayload
  await unbindOperatorFromMachines(user.sub)
  return reply.status(204).send()
}

export const getOperatorCurrentMachineHandler: RouteHandlerMethod = async (
  request,
  reply,
) => {
  const user = request.user as AppJwtPayload
  const machine = await getOperatorCurrentMachine(user.sub)
  return reply.send({ machine })
}

export const getListMachinesForOperator: RouteHandlerMethod = async (
  request,
  reply,
) => {
  const user = request.user as AppJwtPayload
  const machines = await listMachinesForOperatorPicker(user.sub)
  return reply.send({ machines })
}

export const getListReplenishmentRequestsForOperator: RouteHandlerMethod =
  async (request, reply) => {
    const user = request.user as AppJwtPayload
    const q = (request.query ?? {}) as { status?: string }
    const status = parseOptionalRequestStatus(q.status)
    if (q.status !== undefined && q.status !== '' && status === undefined) {
      return reply.status(400).send({ error: 'status invalido.' })
    }
    const requests = await listReplenishmentRequestsForOperatorMachine(
      user.sub,
      status !== undefined ? { status } : undefined,
    )
    return reply.send({ requests })
  }

export const postRequestPalletPickup: RouteHandlerMethod = async (
  request,
  reply,
) => {
  const user = request.user as AppJwtPayload
  const { requestId } = request.params as { requestId?: string }
  if (!requestId) {
    return reply.status(400).send({ error: 'requestId invalido.' })
  }
  try {
    const result = await requestPalletPickupFromMachine(user.sub, requestId)
    return reply.status(201).send(result)
  } catch (error) {
    if (error instanceof MachineReplenishmentRequestNotFoundError) {
      return reply.status(404).send({ error: error.message })
    }
    if (error instanceof ReplenishmentRequestNotForOperatorMachineError) {
      return reply.status(403).send({ error: error.message })
    }
    if (error instanceof ReplenishmentRequestNotOnMachineStatusError) {
      return reply.status(409).send({ error: error.message })
    }
    if (error instanceof PickupTaskAlreadyOpenError) {
      return reply.status(409).send({ error: error.message })
    }
    throw error
  }
}

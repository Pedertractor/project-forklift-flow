import type { RouteHandlerMethod } from 'fastify'
import {
  PriorityLevel,
  RequestStatus,
  TypeMovimentPallet,
} from '../generated/prisma/enums.js'
import {
  MachineNotFoundError,
  MachineNotInOperatorSectorError,
  MachineReplenishmentRequestNotFoundError,
  OperatorMachineNotBoundError,
  OperatorWithoutSectorError,
  PickupTaskAlreadyOpenError,
  ReplenishmentFinalizeMissingFieldsError,
  ReplenishmentRequestNotForOperatorMachineError,
  ReplenishmentRequestNotOnMachineStatusError,
} from '../errors/domain-errors.js'
import {
  bindOperatorToMachine,
  finalizeMachineProductionCycle,
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

function isTypeMovimentPallet(value: string): value is TypeMovimentPallet {
  return (Object.values(TypeMovimentPallet) as string[]).includes(value)
}

function isPriorityLevel(value: string): value is PriorityLevel {
  return (Object.values(PriorityLevel) as string[]).includes(value)
}

export const postFinalizeMachineCycle: RouteHandlerMethod = async (
  request,
  reply,
) => {
  const user = request.user as AppJwtPayload
  const body = (request.body ?? {}) as {
    movementCube?: string
    typeMovimentPallet?: string
    priorityLevel?: string
  }

  const input: {
    movementCube?: string
    typeMovimentPallet?: TypeMovimentPallet
    priorityLevel?: PriorityLevel
  } = {}

  if (typeof body.movementCube === 'string' && body.movementCube.trim() !== '') {
    input.movementCube = body.movementCube.trim()
  }
  if (body.typeMovimentPallet !== undefined) {
    if (typeof body.typeMovimentPallet !== 'string') {
      return reply.status(400).send({ error: 'typeMovimentPallet invalido.' })
    }
    const raw = body.typeMovimentPallet.trim()
    if (raw !== '' && !isTypeMovimentPallet(raw)) {
      return reply.status(400).send({
        error: 'typeMovimentPallet invalido. Use PALLET_TRUCK ou FORKLIFT.',
      })
    }
    if (raw !== '') {
      input.typeMovimentPallet = raw
    }
  }
  if (body.priorityLevel !== undefined) {
    if (!isPriorityLevel(body.priorityLevel)) {
      return reply.status(400).send({
        error: 'priorityLevel invalido. Use VERY_HIGH, HIGH ou NORMAL.',
      })
    }
    input.priorityLevel = body.priorityLevel
  }

  try {
    const result = await finalizeMachineProductionCycle(user.sub, input)
    return reply.status(200).send(result)
  } catch (error) {
    if (error instanceof OperatorMachineNotBoundError) {
      return reply.status(400).send({ error: error.message })
    }
    if (error instanceof ReplenishmentFinalizeMissingFieldsError) {
      return reply.status(400).send({ error: error.message })
    }
    throw error
  }
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

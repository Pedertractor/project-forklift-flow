import type { RouteHandlerMethod } from 'fastify'
import {
  OperatorMachineSupplyRequestStatus,
  TypeMovimentPallet,
} from '../generated/prisma/enums.js'
import {
  MachineHasNoMaterialForPickupError,
  OperatorRequestBlockedByPalletAtReceivingError,
  MachineNotFoundError,
  MachineNotInOperatorSectorError,
  OperatorMachineNotBoundError,
  OperatorWithoutSectorError,
  PickupTaskAlreadyOpenError,
  PickupTaskCannotBeCanceledError,
  PickupTaskNotFoundError,
  PickupTaskNotOnOperatorMachineError,
} from '../errors/domain-errors.js'
import {
  bindOperatorToMachine,
  cancelPickupRequestByOperator,
  getOperatorCurrentMachine,
  listMachineTasksForOperator,
  listMachinesForOperatorPicker,
  listOperatorSupplyRequestsForOperatorMachine,
  requestPickupOnly,
  requestPickupWithReplenishment,
  requestSupplyOnly,
  unbindOperatorFromMachines,
} from '../services/operator-machine.service.js'
import type { AppJwtPayload } from '../types/auth.types.js'

function parseOptionalOperatorSupplyRequestStatus(
  value: unknown,
): OperatorMachineSupplyRequestStatus | undefined {
  if (value === undefined || value === '') return undefined
  if (typeof value !== 'string') return undefined
  if (
    !(Object.values(OperatorMachineSupplyRequestStatus) as string[]).includes(
      value,
    )
  ) {
    return undefined
  }
  return value as OperatorMachineSupplyRequestStatus
}

function parseOptionalTypeMovimentPallet(
  value: unknown,
): TypeMovimentPallet | undefined {
  if (value === undefined || value === '') return undefined
  if (typeof value !== 'string') return undefined
  if (!(Object.values(TypeMovimentPallet) as string[]).includes(value)) {
    return undefined
  }
  return value as TypeMovimentPallet
}

function parsePickupRequestBody(body: {
  isCritical?: boolean
  typeMovimentPallet?: unknown
}):
  | { ok: true; options: { isCritical?: boolean; typeMovimentPallet?: TypeMovimentPallet } }
  | { ok: false; error: string } {
  const typeMovimentPallet = parseOptionalTypeMovimentPallet(
    body.typeMovimentPallet,
  )
  if (
    body.typeMovimentPallet !== undefined &&
    body.typeMovimentPallet !== '' &&
    typeMovimentPallet === undefined
  ) {
    return { ok: false, error: 'typeMovimentPallet invalido.' }
  }
  return {
    ok: true,
    options: {
      isCritical: body.isCritical === true,
      ...(typeMovimentPallet ? { typeMovimentPallet } : {}),
    },
  }
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

export const getListMachineTasksForOperator: RouteHandlerMethod = async (
  request,
  reply,
) => {
  const user = request.user as AppJwtPayload
  const payload = await listMachineTasksForOperator(user.sub)
  return reply.send(payload)
}

export const getListOperatorSupplyRequestsForOperator: RouteHandlerMethod =
  async (request, reply) => {
    const user = request.user as AppJwtPayload
    const q = (request.query ?? {}) as { status?: string }
    const status = parseOptionalOperatorSupplyRequestStatus(q.status)
    if (q.status !== undefined && q.status !== '' && status === undefined) {
      return reply.status(400).send({ error: 'status invalido.' })
    }
    const operatorSupplyRequests =
      await listOperatorSupplyRequestsForOperatorMachine(
        user.sub,
        status !== undefined ? { status } : undefined,
      )
    return reply.send({ operatorSupplyRequests })
  }

export const postRequestPickupOnly: RouteHandlerMethod = async (
  request,
  reply,
) => {
  const user = request.user as AppJwtPayload
  const body = (request.body ?? {}) as {
    isCritical?: boolean
    typeMovimentPallet?: unknown
  }
  const parsed = parsePickupRequestBody(body)
  if (!parsed.ok) {
    return reply.status(400).send({ error: parsed.error })
  }
  try {
    const result = await requestPickupOnly(user.sub, parsed.options)
    return reply.status(201).send(result)
  } catch (error) {
    if (error instanceof OperatorMachineNotBoundError) {
      return reply.status(400).send({ error: error.message })
    }
    if (error instanceof MachineHasNoMaterialForPickupError) {
      return reply.status(409).send({ error: error.message })
    }
    if (error instanceof PickupTaskAlreadyOpenError) {
      return reply.status(409).send({ error: error.message })
    }
    throw error
  }
}

export const postRequestSupplyOnly: RouteHandlerMethod = async (
  request,
  reply,
) => {
  const user = request.user as AppJwtPayload
  try {
    const result = await requestSupplyOnly(user.sub)
    return reply.status(result.created ? 201 : 200).send(result)
  } catch (error) {
    if (error instanceof OperatorMachineNotBoundError) {
      return reply.status(400).send({ error: error.message })
    }
    if (error instanceof OperatorRequestBlockedByPalletAtReceivingError) {
      return reply.status(409).send({ error: error.message })
    }
    throw error
  }
}

export const postRequestPickupWithReplenishment: RouteHandlerMethod = async (
  request,
  reply,
) => {
  const user = request.user as AppJwtPayload
  const body = (request.body ?? {}) as {
    isCritical?: boolean
    typeMovimentPallet?: unknown
  }
  const parsed = parsePickupRequestBody(body)
  if (!parsed.ok) {
    return reply.status(400).send({ error: parsed.error })
  }
  try {
    const result = await requestPickupWithReplenishment(user.sub, parsed.options)
    return reply.status(201).send(result)
  } catch (error) {
    if (error instanceof OperatorMachineNotBoundError) {
      return reply.status(400).send({ error: error.message })
    }
    if (error instanceof MachineHasNoMaterialForPickupError) {
      return reply.status(409).send({ error: error.message })
    }
    if (error instanceof PickupTaskAlreadyOpenError) {
      return reply.status(409).send({ error: error.message })
    }
    if (error instanceof OperatorRequestBlockedByPalletAtReceivingError) {
      return reply.status(409).send({ error: error.message })
    }
    throw error
  }
}

export const postCancelPickupRequest: RouteHandlerMethod = async (
  request,
  reply,
) => {
  const user = request.user as AppJwtPayload
  const { pickupTaskId } = request.params as { pickupTaskId?: string }
  if (typeof pickupTaskId !== 'string' || pickupTaskId.trim() === '') {
    return reply.status(400).send({ error: 'Informe pickupTaskId.' })
  }
  try {
    const result = await cancelPickupRequestByOperator(
      user.sub,
      pickupTaskId.trim(),
    )
    return reply.send(result)
  } catch (error) {
    if (error instanceof OperatorMachineNotBoundError) {
      return reply.status(400).send({ error: error.message })
    }
    if (error instanceof PickupTaskNotFoundError) {
      return reply.status(404).send({ error: error.message })
    }
    if (error instanceof PickupTaskNotOnOperatorMachineError) {
      return reply.status(403).send({ error: error.message })
    }
    if (error instanceof PickupTaskCannotBeCanceledError) {
      return reply.status(409).send({ error: error.message })
    }
    throw error
  }
}

import type { RouteHandlerMethod } from 'fastify'
import {
  OperatorMachineSupplyRequestStatus,
  TypeMovimentPallet,
} from '../generated/prisma/enums.js'
import {
  OperatorRequestBlockedByPalletAtReceivingError,
  MachineNotFoundError,
  MachineNotInOperatorSectorError,
  OperatorMachineNotBoundError,
  OperatorSupplyRequestAlreadyOpenError,
  OperatorWithoutSectorError,
  PickupTaskAlreadyOpenError,
  PickupTaskCannotBeCanceledError,
  PickupTaskNotFoundError,
  PickupTaskNotOnOperatorMachineError,
  ToolingMachineMismatchError,
  ToolingNotFoundError,
} from '../errors/domain-errors.js'
import {
  bindOperatorToMachine,
  cancelPickupRequestByOperator,
  createToolingForOperatorMachine,
  deleteToolingForOperatorMachine,
  getOperatorCurrentMachine,
  listMachineTasksForOperator,
  listMachinesForOperatorPicker,
  listOperatorSupplyRequestsForOperatorMachine,
  listToolingsForOperatorMachine,
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

function parseOptionalToolingId(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed === '' ? undefined : trimmed
}

function parsePickupRequestBody(body: {
  isCritical?: boolean
  typeMovimentPallet?: unknown
  toolingId?: unknown
}):
  | {
      ok: true
      options: {
        isCritical?: boolean
        typeMovimentPallet?: TypeMovimentPallet
        toolingId?: string
      }
    }
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
  if (
    body.toolingId !== undefined &&
    body.toolingId !== null &&
    body.toolingId !== '' &&
    typeof body.toolingId !== 'string'
  ) {
    return { ok: false, error: 'toolingId invalido.' }
  }
  const toolingId = parseOptionalToolingId(body.toolingId)
  return {
    ok: true,
    options: {
      isCritical: body.isCritical === true,
      ...(typeMovimentPallet ? { typeMovimentPallet } : {}),
      ...(toolingId ? { toolingId } : {}),
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
  const body = (request.body ?? {}) as { toolingId?: unknown }
  if (
    body.toolingId !== undefined &&
    body.toolingId !== null &&
    body.toolingId !== '' &&
    typeof body.toolingId !== 'string'
  ) {
    return reply.status(400).send({ error: 'toolingId invalido.' })
  }
  const toolingId = parseOptionalToolingId(body.toolingId)
  try {
    const result = await requestSupplyOnly(
      user.sub,
      toolingId ? { toolingId } : undefined,
    )
    return reply.status(result.created ? 201 : 200).send(result)
  } catch (error) {
    if (error instanceof OperatorMachineNotBoundError) {
      return reply.status(400).send({ error: error.message })
    }
    if (error instanceof ToolingNotFoundError) {
      return reply.status(400).send({ error: error.message })
    }
    if (error instanceof ToolingMachineMismatchError) {
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
    toolingId?: unknown
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
    if (error instanceof ToolingNotFoundError) {
      return reply.status(400).send({ error: error.message })
    }
    if (error instanceof ToolingMachineMismatchError) {
      return reply.status(400).send({ error: error.message })
    }
    if (error instanceof PickupTaskAlreadyOpenError) {
      return reply.status(409).send({ error: error.message })
    }
    if (error instanceof OperatorRequestBlockedByPalletAtReceivingError) {
      return reply.status(409).send({ error: error.message })
    }
    if (error instanceof OperatorSupplyRequestAlreadyOpenError) {
      return reply.status(409).send({ error: error.message })
    }
    throw error
  }
}

export const getListToolingsForOperator: RouteHandlerMethod = async (
  request,
  reply,
) => {
  const user = request.user as AppJwtPayload
  try {
    const toolings = await listToolingsForOperatorMachine(user.sub)
    return reply.send({ toolings })
  } catch (error) {
    if (error instanceof OperatorMachineNotBoundError) {
      return reply.status(400).send({ error: error.message })
    }
    throw error
  }
}

export const postCreateToolingForOperator: RouteHandlerMethod = async (
  request,
  reply,
) => {
  const user = request.user as AppJwtPayload
  const body = (request.body ?? {}) as { name?: unknown }
  if (typeof body.name !== 'string') {
    return reply.status(400).send({ error: 'Informe name.' })
  }
  try {
    const tooling = await createToolingForOperatorMachine(user.sub, body.name)
    return reply.status(201).send({ tooling })
  } catch (error) {
    if (error instanceof OperatorMachineNotBoundError) {
      return reply.status(400).send({ error: error.message })
    }
    if (error instanceof ToolingNotFoundError) {
      return reply.status(400).send({ error: error.message })
    }
    throw error
  }
}

export const deleteToolingForOperator: RouteHandlerMethod = async (
  request,
  reply,
) => {
  const user = request.user as AppJwtPayload
  const { toolingId } = request.params as { toolingId?: string }
  if (typeof toolingId !== 'string' || toolingId.trim() === '') {
    return reply.status(400).send({ error: 'Informe toolingId.' })
  }
  try {
    const tooling = await deleteToolingForOperatorMachine(
      user.sub,
      toolingId.trim(),
    )
    return reply.send({ tooling })
  } catch (error) {
    if (error instanceof OperatorMachineNotBoundError) {
      return reply.status(400).send({ error: error.message })
    }
    if (error instanceof ToolingNotFoundError) {
      return reply.status(404).send({ error: error.message })
    }
    if (error instanceof ToolingMachineMismatchError) {
      return reply.status(403).send({ error: error.message })
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

import type { RouteHandlerMethod } from 'fastify'
import {
  MachineNotFoundError,
  MachineSectorAccessDeniedError,
  ToolingMachineMismatchError,
  ToolingNotFoundError,
} from '../errors/domain-errors.js'
import {
  createToolingForMachine,
  deleteToolingForMachine,
  listToolingsForMachine,
  updateToolingForMachine,
} from '../services/machine-tooling.service.js'
import type { AppJwtPayload } from '../types/auth.types.js'

export const getListMachineToolings: RouteHandlerMethod = async (
  request,
  reply,
) => {
  const actor = request.user as AppJwtPayload
  const { machineId } = request.params as { machineId?: string }
  if (typeof machineId !== 'string' || machineId.trim() === '') {
    return reply.status(400).send({ error: 'machineId invalido.' })
  }
  try {
    const toolings = await listToolingsForMachine(machineId.trim(), actor)
    return reply.send({ toolings })
  } catch (error) {
    if (error instanceof MachineNotFoundError) {
      return reply.status(404).send({ error: error.message })
    }
    if (error instanceof MachineSectorAccessDeniedError) {
      return reply.status(403).send({ error: error.message })
    }
    throw error
  }
}

export const postCreateMachineTooling: RouteHandlerMethod = async (
  request,
  reply,
) => {
  const actor = request.user as AppJwtPayload
  const { machineId } = request.params as { machineId?: string }
  const body = (request.body ?? {}) as { name?: unknown }
  if (typeof machineId !== 'string' || machineId.trim() === '') {
    return reply.status(400).send({ error: 'machineId invalido.' })
  }
  if (typeof body.name !== 'string') {
    return reply.status(400).send({ error: 'Informe name.' })
  }
  try {
    const tooling = await createToolingForMachine(
      machineId.trim(),
      body.name,
      actor,
    )
    return reply.status(201).send({ tooling })
  } catch (error) {
    if (error instanceof MachineNotFoundError) {
      return reply.status(404).send({ error: error.message })
    }
    if (error instanceof MachineSectorAccessDeniedError) {
      return reply.status(403).send({ error: error.message })
    }
    if (error instanceof ToolingNotFoundError) {
      return reply.status(400).send({ error: error.message })
    }
    throw error
  }
}

export const patchUpdateMachineTooling: RouteHandlerMethod = async (
  request,
  reply,
) => {
  const actor = request.user as AppJwtPayload
  const { machineId, toolingId } = request.params as {
    machineId?: string
    toolingId?: string
  }
  const body = (request.body ?? {}) as { name?: unknown }
  if (typeof machineId !== 'string' || machineId.trim() === '') {
    return reply.status(400).send({ error: 'machineId invalido.' })
  }
  if (typeof toolingId !== 'string' || toolingId.trim() === '') {
    return reply.status(400).send({ error: 'toolingId invalido.' })
  }
  if (typeof body.name !== 'string') {
    return reply.status(400).send({ error: 'Informe name.' })
  }
  try {
    const tooling = await updateToolingForMachine(
      machineId.trim(),
      toolingId.trim(),
      body.name,
      actor,
    )
    return reply.send({ tooling })
  } catch (error) {
    if (error instanceof MachineNotFoundError) {
      return reply.status(404).send({ error: error.message })
    }
    if (error instanceof MachineSectorAccessDeniedError) {
      return reply.status(403).send({ error: error.message })
    }
    if (error instanceof ToolingNotFoundError) {
      return reply.status(error.message.includes('nao encontrado') ? 404 : 400).send({
        error: error.message,
      })
    }
    if (error instanceof ToolingMachineMismatchError) {
      return reply.status(403).send({ error: error.message })
    }
    throw error
  }
}

export const deleteMachineToolingHandler: RouteHandlerMethod = async (
  request,
  reply,
) => {
  const actor = request.user as AppJwtPayload
  const { machineId, toolingId } = request.params as {
    machineId?: string
    toolingId?: string
  }
  if (typeof machineId !== 'string' || machineId.trim() === '') {
    return reply.status(400).send({ error: 'machineId invalido.' })
  }
  if (typeof toolingId !== 'string' || toolingId.trim() === '') {
    return reply.status(400).send({ error: 'toolingId invalido.' })
  }
  try {
    const tooling = await deleteToolingForMachine(
      machineId.trim(),
      toolingId.trim(),
      actor,
    )
    return reply.send({ tooling })
  } catch (error) {
    if (error instanceof MachineNotFoundError) {
      return reply.status(404).send({ error: error.message })
    }
    if (error instanceof MachineSectorAccessDeniedError) {
      return reply.status(403).send({ error: error.message })
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

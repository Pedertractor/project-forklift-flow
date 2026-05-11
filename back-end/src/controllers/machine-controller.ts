import type { RouteHandlerMethod } from 'fastify'
import {
  AssignMachineUserError,
  MachineNotFoundError,
  SectorNotFoundError,
  TypeMachineNotFoundError,
} from '../errors/domain-errors.js'
import {
  createMachine,
  deleteMachine,
  getMachineById,
  listMachines,
  updateMachine,
} from '../services/machine.service.js'

export const postCreateMachine: RouteHandlerMethod = async (request, reply) => {
  const body = (request.body ?? {}) as {
    name?: string
    position?: string
    typeMachineId?: string
    sectorId?: string
    userId?: string | null
  }
  if (typeof body.name !== 'string' || body.name.trim() === '') {
    return reply.status(400).send({ error: 'Informe name (texto nao vazio).' })
  }
  if (typeof body.position !== 'string' || body.position.trim() === '') {
    return reply.status(400).send({ error: 'Informe position (texto nao vazio).' })
  }
  if (typeof body.typeMachineId !== 'string' || body.typeMachineId.trim() === '') {
    return reply.status(400).send({ error: 'Informe typeMachineId.' })
  }
  if (typeof body.sectorId !== 'string' || body.sectorId.trim() === '') {
    return reply.status(400).send({ error: 'Informe sectorId.' })
  }

  try {
    const row = await createMachine({
      name: body.name,
      position: body.position,
      typeMachineId: body.typeMachineId.trim(),
      sectorId: body.sectorId.trim(),
      userId: body.userId,
    })
    return reply.status(201).send(row)
  } catch (error) {
    if (error instanceof TypeMachineNotFoundError) {
      return reply.status(404).send({ error: error.message })
    }
    if (error instanceof SectorNotFoundError) {
      return reply.status(404).send({ error: error.message })
    }
    if (error instanceof AssignMachineUserError) {
      return reply.status(400).send({ error: error.message })
    }
    throw error
  }
}

export const getListMachines: RouteHandlerMethod = async (request, reply) => {
  const { sectorId } = (request.query ?? {}) as { sectorId?: string }
  const machines = await listMachines(
    typeof sectorId === 'string' && sectorId.trim() !== ''
      ? { sectorId: sectorId.trim() }
      : undefined,
  )
  return reply.send({ machines })
}

export const getMachineByIdHandler: RouteHandlerMethod = async (request, reply) => {
  const { machineId } = request.params as { machineId?: string }
  if (!machineId) {
    return reply.status(400).send({ error: 'machineId invalido.' })
  }
  try {
    const row = await getMachineById(machineId)
    return reply.send(row)
  } catch (error) {
    if (error instanceof MachineNotFoundError) {
      return reply.status(404).send({ error: error.message })
    }
    throw error
  }
}

export const patchUpdateMachine: RouteHandlerMethod = async (request, reply) => {
  const { machineId } = request.params as { machineId?: string }
  const body = (request.body ?? {}) as {
    name?: string
    position?: string
    typeMachineId?: string
    sectorId?: string
    userId?: string | null
  }
  if (!machineId) {
    return reply.status(400).send({ error: 'machineId invalido.' })
  }

  const patch: {
    name?: string
    position?: string
    typeMachineId?: string
    sectorId?: string
    userId?: string | null
  } = {}
  if (typeof body.name === 'string') {
    if (body.name.trim() === '') {
      return reply.status(400).send({ error: 'name nao pode ser vazio.' })
    }
    patch.name = body.name
  }
  if (typeof body.position === 'string') {
    if (body.position.trim() === '') {
      return reply.status(400).send({ error: 'position nao pode ser vazio.' })
    }
    patch.position = body.position
  }
  if (typeof body.typeMachineId === 'string') {
    if (body.typeMachineId.trim() === '') {
      return reply.status(400).send({ error: 'typeMachineId nao pode ser vazio.' })
    }
    patch.typeMachineId = body.typeMachineId.trim()
  }
  if (typeof body.sectorId === 'string') {
    if (body.sectorId.trim() === '') {
      return reply.status(400).send({ error: 'sectorId nao pode ser vazio.' })
    }
    patch.sectorId = body.sectorId.trim()
  }
  if (body.userId !== undefined) {
    patch.userId = body.userId
  }

  if (Object.keys(patch).length === 0) {
    return reply
      .status(400)
      .send({
        error:
          'Envie ao menos um campo: name, position, typeMachineId, sectorId ou userId.',
      })
  }

  try {
    const row = await updateMachine(machineId, patch)
    return reply.send(row)
  } catch (error) {
    if (error instanceof MachineNotFoundError) {
      return reply.status(404).send({ error: error.message })
    }
    if (error instanceof TypeMachineNotFoundError) {
      return reply.status(404).send({ error: error.message })
    }
    if (error instanceof SectorNotFoundError) {
      return reply.status(404).send({ error: error.message })
    }
    if (error instanceof AssignMachineUserError) {
      return reply.status(400).send({ error: error.message })
    }
    throw error
  }
}

export const deleteMachineHandler: RouteHandlerMethod = async (request, reply) => {
  const { machineId } = request.params as { machineId?: string }
  if (!machineId) {
    return reply.status(400).send({ error: 'machineId invalido.' })
  }
  try {
    await deleteMachine(machineId)
    return reply.status(204).send()
  } catch (error) {
    if (error instanceof MachineNotFoundError) {
      return reply.status(404).send({ error: error.message })
    }
    throw error
  }
}

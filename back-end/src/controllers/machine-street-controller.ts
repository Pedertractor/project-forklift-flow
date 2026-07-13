import type { RouteHandlerMethod } from 'fastify'
import {
  MachineStreetInUseError,
  MachineStreetNotFoundError,
  SectorNotFoundError,
} from '../errors/domain-errors.js'
import { userRepository } from '../repositories/user.repository.js'
import {
  createMachineStreet,
  deleteMachineStreet,
  getMachineStreetById,
  listMachineStreets,
  updateMachineStreet,
} from '../services/machine-street.service.js'
import type { AppJwtPayload } from '../types/auth.types.js'
import { isAdminOrSuperAdmin } from '../utils/role-user.js'

export const postCreateMachineStreet: RouteHandlerMethod = async (
  request,
  reply,
) => {
  const actor = request.user as AppJwtPayload
  const body = (request.body ?? {}) as {
    name?: string
    machineStreetColor?: string
    sectorId?: string
  }
  if (typeof body.name !== 'string' || body.name.trim() === '') {
    return reply.status(400).send({ error: 'Informe name (texto nao vazio).' })
  }
  if (
    typeof body.machineStreetColor !== 'string' ||
    body.machineStreetColor.trim() === ''
  ) {
    return reply
      .status(400)
      .send({ error: 'Informe machineStreetColor (texto nao vazio).' })
  }

  let sectorId: string | undefined
  if (isAdminOrSuperAdmin(actor.role)) {
    if (typeof body.sectorId !== 'string' || body.sectorId.trim() === '') {
      return reply.status(400).send({ error: 'Informe sectorId.' })
    }
    sectorId = body.sectorId.trim()
  } else {
    const user = await userRepository.findUniqueByIdWithSector(actor.sub)
    if (!user?.sectorId) {
      return reply
        .status(400)
        .send({ error: 'Usuario sem setor; nao e possivel criar rua.' })
    }
    sectorId = user.sectorId
  }

  try {
    const row = await createMachineStreet({
      name: body.name,
      machineStreetColor: body.machineStreetColor,
      sectorId,
    })
    return reply.status(201).send(row)
  } catch (error) {
    if (error instanceof SectorNotFoundError) {
      return reply.status(404).send({ error: error.message })
    }
    throw error
  }
}

export const getListMachineStreets: RouteHandlerMethod = async (
  request,
  reply,
) => {
  const actor = request.user as AppJwtPayload
  const q = (request.query ?? {}) as { sectorId?: string }
  let sectorId =
    typeof q.sectorId === 'string' && q.sectorId.trim() !== ''
      ? q.sectorId.trim()
      : undefined

  if (!isAdminOrSuperAdmin(actor.role)) {
    const user = await userRepository.findUniqueByIdWithSector(actor.sub)
    if (!user?.sectorId) {
      return reply.send({ machineStreets: [] })
    }
    sectorId = user.sectorId
  }

  const machineStreets = await listMachineStreets(
    sectorId ? { sectorId } : undefined,
  )
  return reply.send({ machineStreets })
}

export const getMachineStreetByIdHandler: RouteHandlerMethod = async (
  request,
  reply,
) => {
  const { machineStreetId } = request.params as { machineStreetId?: string }
  if (!machineStreetId) {
    return reply.status(400).send({ error: 'machineStreetId invalido.' })
  }
  try {
    const row = await getMachineStreetById(machineStreetId)
    return reply.send(row)
  } catch (error) {
    if (error instanceof MachineStreetNotFoundError) {
      return reply.status(404).send({ error: error.message })
    }
    throw error
  }
}

export const patchUpdateMachineStreet: RouteHandlerMethod = async (
  request,
  reply,
) => {
  const { machineStreetId } = request.params as { machineStreetId?: string }
  const body = (request.body ?? {}) as {
    name?: string
    machineStreetColor?: string
  }
  if (!machineStreetId) {
    return reply.status(400).send({ error: 'machineStreetId invalido.' })
  }

  const patch: { name?: string; machineStreetColor?: string } = {}
  if (typeof body.name === 'string') {
    if (body.name.trim() === '') {
      return reply.status(400).send({ error: 'name nao pode ser vazio.' })
    }
    patch.name = body.name
  }
  if (typeof body.machineStreetColor === 'string') {
    if (body.machineStreetColor.trim() === '') {
      return reply
        .status(400)
        .send({ error: 'machineStreetColor nao pode ser vazio.' })
    }
    patch.machineStreetColor = body.machineStreetColor
  }

  if (Object.keys(patch).length === 0) {
    return reply
      .status(400)
      .send({ error: 'Envie ao menos um campo: name ou machineStreetColor.' })
  }

  try {
    const row = await updateMachineStreet(machineStreetId, patch)
    return reply.send(row)
  } catch (error) {
    if (error instanceof MachineStreetNotFoundError) {
      return reply.status(404).send({ error: error.message })
    }
    throw error
  }
}

export const deleteMachineStreetHandler: RouteHandlerMethod = async (
  request,
  reply,
) => {
  const { machineStreetId } = request.params as { machineStreetId?: string }
  if (!machineStreetId) {
    return reply.status(400).send({ error: 'machineStreetId invalido.' })
  }
  try {
    await deleteMachineStreet(machineStreetId)
    return reply.status(204).send()
  } catch (error) {
    if (error instanceof MachineStreetNotFoundError) {
      return reply.status(404).send({ error: error.message })
    }
    if (error instanceof MachineStreetInUseError) {
      return reply.status(409).send({ error: error.message })
    }
    throw error
  }
}

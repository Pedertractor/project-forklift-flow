import type { RouteHandlerMethod } from 'fastify'
import {
  SectorInUseError,
  SectorNotFoundError,
} from '../errors/domain-errors.js'
import {
  createSector,
  deleteSector,
  getSectorById,
  listSectors,
  updateSector,
} from '../services/sector.service.js'

export const postCreateSector: RouteHandlerMethod = async (request, reply) => {
  const { typeSector: typeSectorRaw } = (request.body ?? {}) as {
    typeSector?: string
  }
  if (typeof typeSectorRaw !== 'string' || typeSectorRaw.trim() === '') {
    return reply
      .status(400)
      .send({ error: 'Informe typeSector (texto nao vazio).' })
  }
  const row = await createSector({ typeSector: typeSectorRaw })
  return reply.status(201).send({
    id: row.id,
    typeSector: row.typeSector,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  })
}

export const getListSectors: RouteHandlerMethod = async (_request, reply) => {
  const sectors = await listSectors()
  return reply.send({ sectors })
}

export const getSectorByIdHandler: RouteHandlerMethod = async (
  request,
  reply,
) => {
  const { sectorId } = request.params as { sectorId?: string }
  if (!sectorId) {
    return reply.status(400).send({ error: 'sectorId invalido.' })
  }
  try {
    const row = await getSectorById(sectorId)
    return reply.send({
      id: row.id,
      typeSector: row.typeSector,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    })
  } catch (error) {
    if (error instanceof SectorNotFoundError) {
      return reply.status(404).send({ error: error.message })
    }
    throw error
  }
}

export const patchUpdateSector: RouteHandlerMethod = async (request, reply) => {
  const { sectorId } = request.params as { sectorId?: string }
  if (!sectorId) {
    return reply.status(400).send({ error: 'sectorId invalido.' })
  }
  const { typeSector: typeSectorRaw } = (request.body ?? {}) as {
    typeSector?: string
  }
  if (typeof typeSectorRaw !== 'string' || typeSectorRaw.trim() === '') {
    return reply
      .status(400)
      .send({ error: 'Informe typeSector (texto nao vazio).' })
  }
  try {
    const row = await updateSector(sectorId, {
      typeSector: typeSectorRaw,
    })
    return reply.send({
      id: row.id,
      typeSector: row.typeSector,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    })
  } catch (error) {
    if (error instanceof SectorNotFoundError) {
      return reply.status(404).send({ error: error.message })
    }
    throw error
  }
}

export const deleteSectorHandler: RouteHandlerMethod = async (
  request,
  reply,
) => {
  const { sectorId } = request.params as { sectorId?: string }
  if (!sectorId) {
    return reply.status(400).send({ error: 'sectorId invalido.' })
  }
  try {
    await deleteSector(sectorId)
    return reply.status(204).send()
  } catch (error) {
    if (error instanceof SectorNotFoundError) {
      return reply.status(404).send({ error: error.message })
    }
    if (error instanceof SectorInUseError) {
      return reply.status(409).send({ error: error.message })
    }
    throw error
  }
}

import type { RouteHandlerMethod } from 'fastify'
import {
  PlantMapAreaNotFoundError,
  PlantMapAreaValidationError,
} from '../errors/domain-errors.js'
import {
  deletePlantMapArea,
  listPlantMapAreas,
  parsePlantMapAreaKind,
  parsePlantMapUnit,
  upsertPlantMapArea,
} from '../services/plant-map-area.service.js'

function serializeArea(row: {
  id: string
  plantUnit: string
  kind: string
  nx: number
  ny: number
  nw: number
  nh: number
  label: string | null
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: row.id,
    plantUnit: row.plantUnit,
    kind: row.kind,
    nx: row.nx,
    ny: row.ny,
    nw: row.nw,
    nh: row.nh,
    label: row.label,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export const getListPlantMapAreas: RouteHandlerMethod = async (request, reply) => {
  const { plantUnit: plantUnitRaw } = request.query as { plantUnit?: string }
  if (typeof plantUnitRaw !== 'string' || plantUnitRaw.trim() === '') {
    return reply.status(400).send({ error: 'Informe plantUnit (PEDERTRACTOR ou TRACTOR).' })
  }
  const plantUnit = parsePlantMapUnit(plantUnitRaw)
  if (!plantUnit) {
    return reply.status(400).send({ error: 'plantUnit invalido.' })
  }
  const areas = await listPlantMapAreas(plantUnit)
  return reply.send({ areas: areas.map(serializeArea) })
}

export const putUpsertPlantMapArea: RouteHandlerMethod = async (request, reply) => {
  const body = (request.body ?? {}) as {
    plantUnit?: string
    kind?: string
    nx?: number
    ny?: number
    nw?: number
    nh?: number
    label?: string | null
  }
  if (typeof body.plantUnit !== 'string') {
    return reply.status(400).send({ error: 'Informe plantUnit.' })
  }
  if (typeof body.kind !== 'string') {
    return reply.status(400).send({ error: 'Informe kind (EXPEDITION ou RECEIVING).' })
  }
  const plantUnit = parsePlantMapUnit(body.plantUnit)
  const kind = parsePlantMapAreaKind(body.kind)
  if (!plantUnit || !kind) {
    return reply.status(400).send({ error: 'plantUnit ou kind invalido.' })
  }
  if (
    typeof body.nx !== 'number' ||
    typeof body.ny !== 'number' ||
    typeof body.nw !== 'number' ||
    typeof body.nh !== 'number'
  ) {
    return reply.status(400).send({ error: 'Informe nx, ny, nw e nh (numeros).' })
  }
  try {
    const row = await upsertPlantMapArea({
      plantUnit,
      kind,
      nx: body.nx,
      ny: body.ny,
      nw: body.nw,
      nh: body.nh,
      label: body.label,
    })
    return reply.send({ area: serializeArea(row) })
  } catch (error) {
    if (error instanceof PlantMapAreaValidationError) {
      return reply.status(400).send({ error: error.message })
    }
    throw error
  }
}

export const deletePlantMapAreaHandler: RouteHandlerMethod = async (request, reply) => {
  const { areaId } = request.params as { areaId?: string }
  if (!areaId?.trim()) {
    return reply.status(400).send({ error: 'areaId invalido.' })
  }
  try {
    await deletePlantMapArea(areaId.trim())
    return reply.status(204).send()
  } catch (error) {
    if (error instanceof PlantMapAreaNotFoundError) {
      return reply.status(404).send({ error: error.message })
    }
    throw error
  }
}

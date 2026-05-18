import {
  PlantMapAreaKind,
  PlantMapUnit,
} from '../generated/prisma/enums.js'
import {
  PlantMapAreaNotFoundError,
  PlantMapAreaValidationError,
} from '../errors/domain-errors.js'
import { plantMapAreaRepository } from '../repositories/plant-map-area.repository.js'

const PLANT_UNITS = new Set<string>(Object.values(PlantMapUnit))
const AREA_KINDS = new Set<string>(Object.values(PlantMapAreaKind))

const MIN_SIDE = 0.02

export type PlantMapAreaGeometry = {
  nx: number
  ny: number
  nw: number
  nh: number
}

export function parsePlantMapUnit(value: string): PlantMapUnit | null {
  const v = value.trim().toUpperCase()
  return PLANT_UNITS.has(v) ? (v as PlantMapUnit) : null
}

export function parsePlantMapAreaKind(value: string): PlantMapAreaKind | null {
  const v = value.trim().toUpperCase()
  return AREA_KINDS.has(v) ? (v as PlantMapAreaKind) : null
}

export function validatePlantMapAreaGeometry(geom: PlantMapAreaGeometry): PlantMapAreaGeometry {
  const nx = Number(geom.nx)
  const ny = Number(geom.ny)
  const nw = Number(geom.nw)
  const nh = Number(geom.nh)
  if (![nx, ny, nw, nh].every(Number.isFinite)) {
    throw new PlantMapAreaValidationError('Coordenadas invalidas (nx, ny, nw, nh).')
  }
  if (nw < MIN_SIDE || nh < MIN_SIDE) {
    throw new PlantMapAreaValidationError(
      `A area deve ter largura e altura minimas de ${MIN_SIDE * 100}% do mapa.`,
    )
  }
  if (nx < 0 || ny < 0 || nx > 1 || ny > 1) {
    throw new PlantMapAreaValidationError('Origem (nx, ny) deve estar entre 0 e 1.')
  }
  if (nx + nw > 1 + 1e-6 || ny + nh > 1 + 1e-6) {
    throw new PlantMapAreaValidationError('A area ultrapassa os limites do mapa (0..1).')
  }
  return {
    nx: Math.min(1, Math.max(0, nx)),
    ny: Math.min(1, Math.max(0, ny)),
    nw: Math.min(1 - nx, Math.max(MIN_SIDE, nw)),
    nh: Math.min(1 - ny, Math.max(MIN_SIDE, nh)),
  }
}

export async function listPlantMapAreas(plantUnit: PlantMapUnit) {
  return plantMapAreaRepository.findManyByPlantUnit(plantUnit)
}

export async function upsertPlantMapArea(input: {
  plantUnit: PlantMapUnit
  kind: PlantMapAreaKind
  nx: number
  ny: number
  nw: number
  nh: number
  label?: string | null
}) {
  const geom = validatePlantMapAreaGeometry(input)
  const label =
    input.label === undefined || input.label === null
      ? null
      : input.label.trim() === ''
        ? null
        : input.label.trim()
  return plantMapAreaRepository.upsertByUnitAndKind(input.plantUnit, input.kind, {
    ...geom,
    label,
  })
}

export async function deletePlantMapArea(id: string) {
  const row = await plantMapAreaRepository.findUniqueById(id)
  if (!row) {
    throw new PlantMapAreaNotFoundError()
  }
  await plantMapAreaRepository.delete(id)
}

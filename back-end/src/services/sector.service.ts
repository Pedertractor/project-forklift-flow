import type { SectorModel } from '../generated/prisma/models/Sector.js'
import {
  SectorInUseError,
  SectorNotFoundError,
} from '../errors/domain-errors.js'
import { sectorRepository } from '../repositories/sector.repository.js'

export type CreateSectorInput = {
  typeSector: string
}

export type UpdateSectorInput = {
  typeSector?: string
}

async function requireSectorById(id: string): Promise<SectorModel> {
  const row = await sectorRepository.findUniqueById(id)
  if (!row) {
    throw new SectorNotFoundError()
  }
  return row
}

export async function createSector(input: CreateSectorInput) {
  const typeSector = input.typeSector.trim()
  return sectorRepository.create({ typeSector })
}

export async function listSectors() {
  return sectorRepository.findManyForList()
}

export async function getSectorById(id: string) {
  return requireSectorById(id)
}

export async function updateSector(id: string, input: UpdateSectorInput) {
  await requireSectorById(id)
  if (input.typeSector === undefined) {
    return requireSectorById(id)
  }
  return sectorRepository.update(id, {
    typeSector: input.typeSector.trim(),
  })
}

export async function deleteSector(id: string) {
  await requireSectorById(id)
  const linked = await sectorRepository.countReferences(id)
  if (linked > 0) {
    throw new SectorInUseError()
  }
  await sectorRepository.delete(id)
}

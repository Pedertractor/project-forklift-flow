import type { Prisma } from '../generated/prisma/client.js'
import {
  MachineStreetInUseError,
  MachineStreetNotFoundError,
  SectorNotFoundError,
} from '../errors/domain-errors.js'
import { machineStreetRepository } from '../repositories/machine-street.repository.js'
import { sectorRepository } from '../repositories/sector.repository.js'

export type CreateMachineStreetInput = {
  name: string
  machineStreetColor: string
  sectorId: string
}

export type UpdateMachineStreetInput = {
  name?: string
  machineStreetColor?: string
}

async function requireMachineStreetById(id: string) {
  const row = await machineStreetRepository.findUniqueById(id)
  if (!row) {
    throw new MachineStreetNotFoundError()
  }
  return row
}

async function requireSectorExists(sectorId: string) {
  const row = await sectorRepository.findUniqueById(sectorId)
  if (!row) {
    throw new SectorNotFoundError()
  }
}

export async function createMachineStreet(input: CreateMachineStreetInput) {
  await requireSectorExists(input.sectorId)
  return machineStreetRepository.create({
    name: input.name.trim(),
    machineStreetColor: input.machineStreetColor.trim(),
    sector: { connect: { id: input.sectorId } },
  })
}

export async function listMachineStreets(options?: { sectorId?: string }) {
  const rows = await machineStreetRepository.findManyForList(options)
  return rows.map(({ _count, ...rest }) => ({
    ...rest,
    references: _count.machines,
  }))
}

export async function getMachineStreetById(id: string) {
  return requireMachineStreetById(id)
}

export async function updateMachineStreet(
  id: string,
  input: UpdateMachineStreetInput,
) {
  await requireMachineStreetById(id)
  const data: Prisma.MachineStreetUpdateInput = {}
  if (input.name !== undefined) {
    data.name = input.name.trim()
  }
  if (input.machineStreetColor !== undefined) {
    data.machineStreetColor = input.machineStreetColor.trim()
  }
  if (Object.keys(data).length === 0) {
    return requireMachineStreetById(id)
  }
  return machineStreetRepository.update(id, data)
}

export async function deleteMachineStreet(id: string) {
  await requireMachineStreetById(id)
  const linked = await machineStreetRepository.countMachinesByStreetId(id)
  if (linked > 0) {
    throw new MachineStreetInUseError()
  }
  await machineStreetRepository.delete(id)
}

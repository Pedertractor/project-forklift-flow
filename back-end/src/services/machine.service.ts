import type { PlantMapUnit, Prisma } from '../generated/prisma/client.js'
import {
  AssignMachineUserError,
  MachineInUseError,
  MachineNotFoundError,
  SectorNotFoundError,
  TypeMachineNotFoundError,
} from '../errors/domain-errors.js'
import { machineRepository } from '../repositories/machine.repository.js'
import { operatorMovimentPalletWsBroadcastMachineOperatorUpdated } from '../ws/operator-moviment-pallet-ws.hub.js'
import { sectorRepository } from '../repositories/sector.repository.js'
import { typeMachineRepository } from '../repositories/type-machine.repository.js'
import { userRepository } from '../repositories/user.repository.js'

const PLANT_MAP_UNITS = new Set<PlantMapUnit>(['PEDERTRACTOR', 'TRACTOR'])

export function parsePlantMapUnit(value: string): PlantMapUnit | null {
  const normalized = value.trim().toUpperCase()
  return PLANT_MAP_UNITS.has(normalized as PlantMapUnit)
    ? (normalized as PlantMapUnit)
    : null
}

export type CreateMachineInput = {
  name: string
  plantUnit: PlantMapUnit
  typeMachineId: string
  sectorId: string
  userId?: string | null | undefined
}

export type UpdateMachineInput = {
  name?: string
  plantUnit?: PlantMapUnit
  typeMachineId?: string
  sectorId?: string
  userId?: string | null
}

async function requireMachineById(id: string) {
  const row = await machineRepository.findUniqueById(id)
  if (!row) {
    throw new MachineNotFoundError()
  }
  return row
}

async function requireTypeMachineExists(typeMachineId: string) {
  const row = await typeMachineRepository.findUniqueById(typeMachineId)
  if (!row) {
    throw new TypeMachineNotFoundError()
  }
}

async function requireSectorExists(sectorId: string) {
  const row = await sectorRepository.findUniqueById(sectorId)
  if (!row) {
    throw new SectorNotFoundError()
  }
}

async function requireUserExistsIfSet(userId: string) {
  const row = await userRepository.findUniqueById(userId)
  if (!row) {
    throw new AssignMachineUserError()
  }
}

function buildMachineUpdateData(
  input: UpdateMachineInput,
): Prisma.MachineUpdateInput {
  const data: Prisma.MachineUpdateInput = {}
  if (input.name !== undefined) {
    data.name = input.name.trim()
  }
  if (input.plantUnit !== undefined) {
    data.plantUnit = input.plantUnit
  }
  if (input.typeMachineId !== undefined) {
    data.typeMachine = { connect: { id: input.typeMachineId } }
  }
  if (input.sectorId !== undefined) {
    data.sector = { connect: { id: input.sectorId } }
  }
  if (input.userId !== undefined) {
    if (input.userId === null || input.userId === '') {
      data.user = { disconnect: true }
    } else {
      data.user = { connect: { id: input.userId } }
    }
  }
  return data
}

export async function createMachine(input: CreateMachineInput) {
  await requireTypeMachineExists(input.typeMachineId)
  await requireSectorExists(input.sectorId)
  if (input.userId !== undefined && input.userId !== null && input.userId !== '') {
    await requireUserExistsIfSet(input.userId)
  }

  const data: Prisma.MachineCreateInput = {
    name: input.name.trim(),
    plantUnit: input.plantUnit,
    typeMachine: { connect: { id: input.typeMachineId } },
    sector: { connect: { id: input.sectorId } },
  }
  if (input.userId !== undefined && input.userId !== null && input.userId !== '') {
    data.user = { connect: { id: input.userId } }
  }

  return machineRepository.create(data)
}

export async function listMachines(options?: {
  sectorId?: string
  plantUnit?: PlantMapUnit
}) {
  const rows = await machineRepository.findManyForList(options)
  return rows.map(({ _count, ...rest }) => ({
    ...rest,
    references:
      _count.deliveryTasks +
      _count.pickupTasks +
      _count.operatorMachineSupplyRequests +
      _count.movimentPalletTripSuggestions,
  }))
}

export async function getMachineById(id: string) {
  return requireMachineById(id)
}

export async function updateMachine(id: string, input: UpdateMachineInput) {
  const before = await requireMachineById(id)
  if (input.typeMachineId !== undefined) {
    await requireTypeMachineExists(input.typeMachineId)
  }
  if (input.sectorId !== undefined) {
    await requireSectorExists(input.sectorId)
  }
  if (
    input.userId !== undefined &&
    input.userId !== null &&
    input.userId !== ''
  ) {
    await requireUserExistsIfSet(input.userId)
  }

  const data = buildMachineUpdateData(input)
  if (Object.keys(data).length === 0) {
    return before
  }
  const updated = await machineRepository.update(id, data)
  if (input.userId !== undefined) {
    const nextOperatorId = updated.userId ?? null
    const prevOperatorId = before.userId ?? null
    if (nextOperatorId !== prevOperatorId) {
      operatorMovimentPalletWsBroadcastMachineOperatorUpdated({
        machineId: updated.id,
        sectorId: updated.sectorId,
        operatorUserId: nextOperatorId,
        affectedUserId: nextOperatorId ?? prevOperatorId,
      })
    }
  }
  return updated
}

export async function deleteMachine(id: string) {
  await requireMachineById(id)
  const linked = await machineRepository.countReferences(id)
  if (linked > 0) {
    throw new MachineInUseError()
  }
  await machineRepository.delete(id)
}

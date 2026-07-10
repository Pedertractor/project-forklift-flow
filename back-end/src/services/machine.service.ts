import type { PlantMapUnit, Prisma } from '../generated/prisma/client.js'
import { MachineProductionStatus } from '../generated/prisma/enums.js'
import {
  AssignMachineUserError,
  MachineInUseError,
  MachineNotFoundError,
  MachineStreetNotFoundError,
  MachineStreetSectorMismatchError,
  SectorNotFoundError,
  TypeMachineNotFoundError,
} from '../errors/domain-errors.js'
import { machineRepository } from '../repositories/machine.repository.js'
import { machineStreetRepository } from '../repositories/machine-street.repository.js'
import { operatorMovimentPalletWsBroadcastMachineOperatorUpdated, operatorMovimentPalletWsBroadcastMachineProductionStatusUpdated } from '../ws/operator-moviment-pallet-ws.hub.js'
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
  machineStreetId?: string | null | undefined
  assetNumber: string
  pillar: string
}

export type UpdateMachineInput = {
  name?: string
  plantUnit?: PlantMapUnit
  typeMachineId?: string
  sectorId?: string
  userId?: string | null
  machineStreetId?: string | null
  productionStatus?: MachineProductionStatus
  assetNumber?: string | null
  pillar?: string | null
}

const MACHINE_PRODUCTION_STATUSES = new Set<MachineProductionStatus>([
  MachineProductionStatus.TRABALHANDO,
  MachineProductionStatus.ABASTECER,
])

export function parseMachineProductionStatus(
  value: unknown,
): MachineProductionStatus | null {
  if (
    value === MachineProductionStatus.TRABALHANDO ||
    value === MachineProductionStatus.ABASTECER
  ) {
    return value
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toUpperCase()
    if (MACHINE_PRODUCTION_STATUSES.has(normalized as MachineProductionStatus)) {
      return normalized as MachineProductionStatus
    }
  }
  return null
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

async function requireMachineStreetForSector(
  machineStreetId: string,
  sectorId: string,
) {
  const row = await machineStreetRepository.findUniqueById(machineStreetId)
  if (!row) {
    throw new MachineStreetNotFoundError()
  }
  if (row.sectorId !== sectorId) {
    throw new MachineStreetSectorMismatchError()
  }
  return row
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
  if (input.machineStreetId !== undefined) {
    if (input.machineStreetId === null || input.machineStreetId === '') {
      data.machineStreet = { disconnect: true }
    } else {
      data.machineStreet = { connect: { id: input.machineStreetId } }
    }
  }
  if (input.productionStatus !== undefined) {
    data.productionStatus = input.productionStatus
  }
  if (input.assetNumber !== undefined) {
    data.assetNumber = input.assetNumber
  }
  if (input.pillar !== undefined) {
    data.pillar = input.pillar
  }
  return data
}

export async function createMachine(input: CreateMachineInput) {
  await requireTypeMachineExists(input.typeMachineId)
  await requireSectorExists(input.sectorId)
  if (input.userId !== undefined && input.userId !== null && input.userId !== '') {
    await requireUserExistsIfSet(input.userId)
  }
  if (
    input.machineStreetId !== undefined &&
    input.machineStreetId !== null &&
    input.machineStreetId !== ''
  ) {
    await requireMachineStreetForSector(input.machineStreetId, input.sectorId)
  }

  const data: Prisma.MachineCreateInput = {
    name: input.name.trim(),
    plantUnit: input.plantUnit,
    assetNumber: input.assetNumber.trim(),
    pillar: input.pillar.trim(),
    typeMachine: { connect: { id: input.typeMachineId } },
    sector: { connect: { id: input.sectorId } },
  }
  if (input.userId !== undefined && input.userId !== null && input.userId !== '') {
    data.user = { connect: { id: input.userId } }
  }
  if (
    input.machineStreetId !== undefined &&
    input.machineStreetId !== null &&
    input.machineStreetId !== ''
  ) {
    data.machineStreet = { connect: { id: input.machineStreetId } }
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

  const effectiveSectorId = input.sectorId ?? before.sectorId
  const nextStreetId =
    input.machineStreetId !== undefined
      ? input.machineStreetId === null || input.machineStreetId === ''
        ? null
        : input.machineStreetId
      : before.machineStreetId

  if (nextStreetId) {
    await requireMachineStreetForSector(nextStreetId, effectiveSectorId)
  }

  const data = buildMachineUpdateData(input)
  // Troca de setor com rua de outro setor: desvincula automaticamente.
  if (
    input.sectorId !== undefined &&
    input.machineStreetId === undefined &&
    before.machineStreetId
  ) {
    const street = await machineStreetRepository.findUniqueById(
      before.machineStreetId,
    )
    if (street && street.sectorId !== effectiveSectorId) {
      data.machineStreet = { disconnect: true }
    }
  }

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
  if (
    input.productionStatus !== undefined &&
    before.productionStatus !== updated.productionStatus
  ) {
    operatorMovimentPalletWsBroadcastMachineProductionStatusUpdated({
      machineId: updated.id,
      sectorId: updated.sectorId,
      productionStatus: updated.productionStatus,
      operatorUserId: updated.userId ?? before.userId ?? null,
    })
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

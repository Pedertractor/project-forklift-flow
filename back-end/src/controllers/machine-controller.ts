import type { RouteHandlerMethod } from 'fastify'
import {
  AssignMachineUserError,
  MachineInUseError,
  MachineNotFoundError,
  MachineStreetNotFoundError,
  MachineStreetSectorMismatchError,
  SectorNotFoundError,
  TypeMachineNotFoundError,
} from '../errors/domain-errors.js'
import {
  createMachine,
  deleteMachine,
  getMachineById,
  listMachines,
  parseMachineProductionStatus,
  parsePlantMapUnit,
  updateMachine,
} from '../services/machine.service.js'

function parseOptionalTrimmedString(
  value: unknown,
): string | null | undefined {
  if (value === undefined) {
    return undefined
  }
  if (value === null) {
    return null
  }
  if (typeof value !== 'string') {
    return undefined
  }
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

export const postCreateMachine: RouteHandlerMethod = async (request, reply) => {
  const body = (request.body ?? {}) as {
    name?: string
    plantUnit?: string
    typeMachineId?: string
    sectorId?: string
    userId?: string | null
    machineStreetId?: string | null
    assetNumber?: string
    pillar?: string
  }
  if (typeof body.name !== 'string' || body.name.trim() === '') {
    return reply.status(400).send({ error: 'Informe name (texto nao vazio).' })
  }
  if (typeof body.typeMachineId !== 'string' || body.typeMachineId.trim() === '') {
    return reply.status(400).send({ error: 'Informe typeMachineId.' })
  }
  if (typeof body.sectorId !== 'string' || body.sectorId.trim() === '') {
    return reply.status(400).send({ error: 'Informe sectorId.' })
  }
  if (typeof body.plantUnit !== 'string' || body.plantUnit.trim() === '') {
    return reply.status(400).send({ error: 'Informe plantUnit (PEDERTRACTOR | TRACTOR).' })
  }
  const plantUnit = parsePlantMapUnit(body.plantUnit)
  if (!plantUnit) {
    return reply.status(400).send({ error: 'plantUnit invalido. Use PEDERTRACTOR ou TRACTOR.' })
  }
  if (typeof body.assetNumber !== 'string' || body.assetNumber.trim() === '') {
    return reply.status(400).send({ error: 'Informe assetNumber (texto nao vazio).' })
  }
  if (typeof body.pillar !== 'string' || body.pillar.trim() === '') {
    return reply.status(400).send({ error: 'Informe pillar (texto nao vazio).' })
  }

  try {
    const row = await createMachine({
      name: body.name,
      plantUnit,
      typeMachineId: body.typeMachineId.trim(),
      sectorId: body.sectorId.trim(),
      userId: body.userId,
      machineStreetId: parseOptionalTrimmedString(body.machineStreetId),
      assetNumber: body.assetNumber,
      pillar: body.pillar,
    })
    return reply.status(201).send(row)
  } catch (error) {
    if (error instanceof TypeMachineNotFoundError) {
      return reply.status(404).send({ error: error.message })
    }
    if (error instanceof SectorNotFoundError) {
      return reply.status(404).send({ error: error.message })
    }
    if (error instanceof MachineStreetNotFoundError) {
      return reply.status(404).send({ error: error.message })
    }
    if (error instanceof MachineStreetSectorMismatchError) {
      return reply.status(400).send({ error: error.message })
    }
    if (error instanceof AssignMachineUserError) {
      return reply.status(400).send({ error: error.message })
    }
    throw error
  }
}

export const getListMachines: RouteHandlerMethod = async (request, reply) => {
  const { sectorId, plantUnit: plantUnitRaw } = (request.query ?? {}) as {
    sectorId?: string
    plantUnit?: string
  }
  const options: { sectorId?: string; plantUnit?: 'PEDERTRACTOR' | 'TRACTOR' } = {}
  if (typeof sectorId === 'string' && sectorId.trim() !== '') {
    options.sectorId = sectorId.trim()
  }
  if (typeof plantUnitRaw === 'string' && plantUnitRaw.trim() !== '') {
    const plantUnit = parsePlantMapUnit(plantUnitRaw)
    if (!plantUnit) {
      return reply.status(400).send({ error: 'plantUnit invalido. Use PEDERTRACTOR ou TRACTOR.' })
    }
    options.plantUnit = plantUnit
  }
  const machines = await listMachines(Object.keys(options).length > 0 ? options : undefined)
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
    plantUnit?: string
    typeMachineId?: string
    sectorId?: string
    userId?: string | null
    machineStreetId?: string | null
    productionStatus?: string
    assetNumber?: string | null
    pillar?: string | null
  }
  if (!machineId) {
    return reply.status(400).send({ error: 'machineId invalido.' })
  }

  const patch: {
    name?: string
    plantUnit?: 'PEDERTRACTOR' | 'TRACTOR'
    typeMachineId?: string
    sectorId?: string
    userId?: string | null
    machineStreetId?: string | null
    productionStatus?: 'TRABALHANDO' | 'ABASTECER'
    assetNumber?: string | null
    pillar?: string | null
  } = {}
  if (typeof body.name === 'string') {
    if (body.name.trim() === '') {
      return reply.status(400).send({ error: 'name nao pode ser vazio.' })
    }
    patch.name = body.name
  }
  if (body.plantUnit !== undefined) {
    if (typeof body.plantUnit !== 'string' || body.plantUnit.trim() === '') {
      return reply.status(400).send({ error: 'plantUnit nao pode ser vazio.' })
    }
    const plantUnit = parsePlantMapUnit(body.plantUnit)
    if (!plantUnit) {
      return reply.status(400).send({ error: 'plantUnit invalido. Use PEDERTRACTOR ou TRACTOR.' })
    }
    patch.plantUnit = plantUnit
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
  if (body.machineStreetId !== undefined) {
    const machineStreetId = parseOptionalTrimmedString(body.machineStreetId)
    if (machineStreetId === undefined && body.machineStreetId !== null) {
      return reply.status(400).send({ error: 'machineStreetId invalido.' })
    }
    patch.machineStreetId = machineStreetId ?? null
  }
  if (body.productionStatus !== undefined) {
    const productionStatus = parseMachineProductionStatus(body.productionStatus)
    if (!productionStatus) {
      return reply.status(400).send({
        error: 'productionStatus invalido. Use TRABALHANDO ou ABASTECER.',
      })
    }
    patch.productionStatus = productionStatus
  }
  if (body.assetNumber !== undefined) {
    const assetNumber = parseOptionalTrimmedString(body.assetNumber)
    if (assetNumber === undefined) {
      return reply.status(400).send({ error: 'assetNumber invalido.' })
    }
    patch.assetNumber = assetNumber
  }
  if (body.pillar !== undefined) {
    const pillar = parseOptionalTrimmedString(body.pillar)
    if (pillar === undefined) {
      return reply.status(400).send({ error: 'pillar invalido.' })
    }
    patch.pillar = pillar
  }

  if (Object.keys(patch).length === 0) {
    return reply
      .status(400)
      .send({
        error:
          'Envie ao menos um campo: name, plantUnit, typeMachineId, sectorId, userId, machineStreetId, productionStatus, assetNumber ou pillar.',
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
    if (error instanceof MachineStreetNotFoundError) {
      return reply.status(404).send({ error: error.message })
    }
    if (error instanceof MachineStreetSectorMismatchError) {
      return reply.status(400).send({ error: error.message })
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
    if (error instanceof MachineInUseError) {
      return reply.status(409).send({ error: error.message })
    }
    throw error
  }
}

import { RoleUser } from '../generated/prisma/enums.js'
import {
  MachineNotFoundError,
  MovimentOperatorMachineLinkInvalidError,
  MovimentOperatorMachineLinkNotFoundError,
  UserNotFoundError,
} from '../errors/domain-errors.js'
import { machineRepository } from '../repositories/machine.repository.js'
import { movimentOperatorMachineLinkRepository } from '../repositories/moviment-operator-machine-link.repository.js'
import { userRepository } from '../repositories/user.repository.js'

async function requirePalletTransporter(operatorId: string) {
  const user = await userRepository.findUniqueByIdWithSector(operatorId)
  if (!user) {
    throw new UserNotFoundError('Operador nao encontrado.')
  }
  if (user.role !== RoleUser.PALLET_TRANSPORTER) {
    throw new MovimentOperatorMachineLinkInvalidError(
      'So e possivel priorizar maquinas para operadores de movimentacao (PALLET_TRANSPORTER).',
    )
  }
  return user
}

async function requireMachine(machineId: string) {
  const machine = await machineRepository.findUniqueById(machineId)
  if (!machine) {
    throw new MachineNotFoundError()
  }
  return machine
}

function assertSameSector(
  operatorSectorId: string | null | undefined,
  machineSectorId: string,
) {
  if (!operatorSectorId) {
    throw new MovimentOperatorMachineLinkInvalidError(
      'Operador sem setor vinculado; vincule o setor antes de priorizar maquinas.',
    )
  }
  if (operatorSectorId !== machineSectorId) {
    throw new MovimentOperatorMachineLinkInvalidError(
      'Operador e maquina precisam pertencer ao mesmo setor.',
    )
  }
}

/** Líder só gerencia operadores/máquinas do próprio setor. */
function assertWithinActorSector(
  actorSectorId: string | undefined,
  targetSectorId: string | null | undefined,
) {
  if (!actorSectorId) return
  if (!targetSectorId || targetSectorId !== actorSectorId) {
    throw new MovimentOperatorMachineLinkInvalidError(
      'Sem permissao para vincular operadores ou maquinas de outro setor.',
    )
  }
}

export async function listMovimentOperatorMachineLinks(options?: {
  operatorId?: string
  sectorId?: string
}) {
  return movimentOperatorMachineLinkRepository.findMany(options)
}

export async function listPreferredMachineIdsForOperator(operatorId: string) {
  return movimentOperatorMachineLinkRepository.findMachineIdsByOperatorId(
    operatorId,
  )
}

export async function createMovimentOperatorMachineLink(input: {
  operatorId: string
  machineId: string
  actorSectorId?: string
}) {
  const operator = await requirePalletTransporter(input.operatorId)
  const machine = await requireMachine(input.machineId)
  assertSameSector(operator.sectorId, machine.sectorId)
  assertWithinActorSector(input.actorSectorId, operator.sectorId)

  const existing =
    await movimentOperatorMachineLinkRepository.findUniqueByOperatorAndMachine(
      input.operatorId,
      input.machineId,
    )
  if (existing) {
    return existing
  }

  return movimentOperatorMachineLinkRepository.create(
    input.operatorId,
    input.machineId,
  )
}

export async function deleteMovimentOperatorMachineLink(
  id: string,
  options?: { actorSectorId?: string },
) {
  const existing = await movimentOperatorMachineLinkRepository.findById(id)
  if (!existing) {
    throw new MovimentOperatorMachineLinkNotFoundError()
  }
  assertWithinActorSector(
    options?.actorSectorId,
    existing.operator.sectorId ?? existing.machine.sectorId,
  )
  try {
    return await movimentOperatorMachineLinkRepository.deleteById(id)
  } catch {
    throw new MovimentOperatorMachineLinkNotFoundError()
  }
}

export async function deleteMovimentOperatorMachineLinkByPair(
  operatorId: string,
  machineId: string,
  options?: { actorSectorId?: string },
) {
  const existing =
    await movimentOperatorMachineLinkRepository.findUniqueByOperatorAndMachine(
      operatorId,
      machineId,
    )
  if (!existing) {
    throw new MovimentOperatorMachineLinkNotFoundError()
  }
  assertWithinActorSector(
    options?.actorSectorId,
    existing.operator.sectorId ?? existing.machine.sectorId,
  )
  try {
    return await movimentOperatorMachineLinkRepository.deleteByOperatorAndMachine(
      operatorId,
      machineId,
    )
  } catch {
    throw new MovimentOperatorMachineLinkNotFoundError()
  }
}

export async function replaceMovimentOperatorMachineLinks(input: {
  operatorId: string
  machineIds: string[]
  actorSectorId?: string
}) {
  const operator = await requirePalletTransporter(input.operatorId)
  assertWithinActorSector(input.actorSectorId, operator.sectorId)

  const uniqueIds = [
    ...new Set(
      input.machineIds
        .map((id) => (typeof id === 'string' ? id.trim() : ''))
        .filter(Boolean),
    ),
  ]

  for (const machineId of uniqueIds) {
    const machine = await requireMachine(machineId)
    assertSameSector(operator.sectorId, machine.sectorId)
    assertWithinActorSector(input.actorSectorId, machine.sectorId)
  }

  return movimentOperatorMachineLinkRepository.replaceOperatorMachines(
    input.operatorId,
    uniqueIds,
  )
}

/** Painel: operadores de movimentação + vínculos, filtráveis por setor. */
export async function listMovimentOperatorPriorityBoard(options?: {
  sectorId?: string
}) {
  const sectorId = options?.sectorId?.trim() || undefined
  const [operators, machines, links] = await Promise.all([
    userRepository.findManyForList({
      role: RoleUser.PALLET_TRANSPORTER,
      ...(sectorId ? { sectorId } : {}),
    }),
    machineRepository.findManyForList(
      sectorId ? { sectorId } : undefined,
    ),
    movimentOperatorMachineLinkRepository.findMany(
      sectorId ? { sectorId } : undefined,
    ),
  ])

  const linksByOperator = new Map<string, typeof links>()
  for (const link of links) {
    const bucket = linksByOperator.get(link.operatorId) ?? []
    bucket.push(link)
    linksByOperator.set(link.operatorId, bucket)
  }

  return {
    operators: operators.map((op) => ({
      id: op.id,
      name: op.name,
      card: op.card,
      unit: op.unit,
      sectorId: op.sectorId,
      sector: op.sector
        ? { id: op.sector.id, typeSector: op.sector.typeSector }
        : null,
      linkedMachineIds: (linksByOperator.get(op.id) ?? []).map(
        (link) => link.machineId,
      ),
      links: linksByOperator.get(op.id) ?? [],
    })),
    machines: machines.map((m) => ({
      id: m.id,
      name: m.name,
      assetNumber: m.assetNumber,
      pillar: m.pillar,
      sectorId: m.sectorId,
      plantUnit: m.plantUnit,
      sector: m.sector,
      typeMachine: m.typeMachine,
      machineStreet: m.machineStreet,
    })),
    links,
  }
}

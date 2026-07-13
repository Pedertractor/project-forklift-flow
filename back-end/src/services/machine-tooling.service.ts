import {
  MachineNotFoundError,
  MachineSectorAccessDeniedError,
  ToolingMachineMismatchError,
  ToolingNotFoundError,
} from '../errors/domain-errors.js'
import { machineRepository } from '../repositories/machine.repository.js'
import { toolingRepository } from '../repositories/tooling.repository.js'
import { userRepository } from '../repositories/user.repository.js'
import type { RoleUser } from '../generated/prisma/enums.js'
import { isAdminOrSuperAdmin } from '../utils/role-user.js'
import {
  operatorMovimentPalletWsBroadcastMachineToolingUpdated,
  type MachineToolingWsAction,
} from '../ws/operator-moviment-pallet-ws.hub.js'

async function requireMachineAccessibleToActor(
  machineId: string,
  actor: { sub: string; role: RoleUser },
) {
  const machine = await machineRepository.findUniqueById(machineId)
  if (!machine) {
    throw new MachineNotFoundError()
  }
  if (!isAdminOrSuperAdmin(actor.role)) {
    const user = await userRepository.findUniqueByIdWithSector(actor.sub)
    if (!user?.sectorId || machine.sectorId !== user.sectorId) {
      throw new MachineSectorAccessDeniedError()
    }
  }
  return machine
}

function broadcastToolingChange(
  machine: { id: string; sectorId: string; userId?: string | null },
  action: MachineToolingWsAction,
  tooling: { id: string; name: string; machineId: string } | null,
  toolingId: string,
) {
  operatorMovimentPalletWsBroadcastMachineToolingUpdated({
    machineId: machine.id,
    sectorId: machine.sectorId,
    action,
    toolingId,
    tooling,
    operatorUserId: machine.userId ?? null,
  })
}

export async function listToolingsForMachine(
  machineId: string,
  actor: { sub: string; role: RoleUser },
) {
  await requireMachineAccessibleToActor(machineId, actor)
  return toolingRepository.findManyByMachineId(machineId)
}

export async function createToolingForMachine(
  machineId: string,
  name: string,
  actor: { sub: string; role: RoleUser },
) {
  const machine = await requireMachineAccessibleToActor(machineId, actor)
  const trimmed = name.trim()
  if (!trimmed) {
    throw new ToolingNotFoundError('Informe name (texto nao vazio).')
  }
  const tooling = await toolingRepository.create({
    name: trimmed,
    machine: { connect: { id: machineId } },
  })
  broadcastToolingChange(machine, 'created', tooling, tooling.id)
  return tooling
}

export async function updateToolingForMachine(
  machineId: string,
  toolingId: string,
  name: string,
  actor: { sub: string; role: RoleUser },
) {
  const machine = await requireMachineAccessibleToActor(machineId, actor)
  const existing = await toolingRepository.findUniqueById(toolingId)
  if (!existing) {
    throw new ToolingNotFoundError()
  }
  if (existing.machineId !== machineId) {
    throw new ToolingMachineMismatchError()
  }
  const trimmed = name.trim()
  if (!trimmed) {
    throw new ToolingNotFoundError('Informe name (texto nao vazio).')
  }
  const tooling = await toolingRepository.update(toolingId, { name: trimmed })
  broadcastToolingChange(machine, 'updated', tooling, tooling.id)
  return tooling
}

export async function deleteToolingForMachine(
  machineId: string,
  toolingId: string,
  actor: { sub: string; role: RoleUser },
) {
  const machine = await requireMachineAccessibleToActor(machineId, actor)
  const tooling = await toolingRepository.findUniqueById(toolingId)
  if (!tooling) {
    throw new ToolingNotFoundError()
  }
  if (tooling.machineId !== machineId) {
    throw new ToolingMachineMismatchError()
  }
  await toolingRepository.deleteById(tooling.id)
  broadcastToolingChange(machine, 'deleted', null, tooling.id)
  return tooling
}

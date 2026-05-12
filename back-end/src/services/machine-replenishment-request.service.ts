import type { Prisma } from '../generated/prisma/client.js'
import {
  PriorityLevel,
  RequestStatus,
} from '../generated/prisma/enums.js'
import {
  MachineNotFoundError,
  MachineReplenishmentRequestDeleteBlockedError,
  MachineReplenishmentRequestNotEditableError,
  MachineReplenishmentRequestNotFoundError,
} from '../errors/domain-errors.js'
import { machineReplenishmentRequestRepository } from '../repositories/machine-replenishment-request.repository.js'
import { machineRepository } from '../repositories/machine.repository.js'

const TERMINAL_STATUSES: RequestStatus[] = [
  RequestStatus.COMPLETED,
  RequestStatus.CANCELED,
]

export type CreateMachineReplenishmentRequestInput = {
  requestedById: string
  destinationId: string
  movementCube: string
  priorityLevel?: PriorityLevel
}

export type UpdateMachineReplenishmentRequestInput = {
  destinationId?: string
  movementCube?: string
  priorityLevel?: PriorityLevel
}

async function requireRequestById(id: string) {
  const row = await machineReplenishmentRequestRepository.findUniqueById(id)
  if (!row) {
    throw new MachineReplenishmentRequestNotFoundError()
  }
  return row
}

function assertEditable(status: RequestStatus) {
  if (TERMINAL_STATUSES.includes(status)) {
    throw new MachineReplenishmentRequestNotEditableError()
  }
}

async function requireMachineExists(machineId: string) {
  const m = await machineRepository.findUniqueById(machineId)
  if (!m) {
    throw new MachineNotFoundError()
  }
}

export async function createMachineReplenishmentRequest(
  input: CreateMachineReplenishmentRequestInput,
) {
  await requireMachineExists(input.destinationId)

  const data: Prisma.MachineReplenishmentRequestCreateInput = {
    movementCube: input.movementCube.trim(),
    priorityLevel: input.priorityLevel ?? PriorityLevel.NORMAL,
    requestedBy: { connect: { id: input.requestedById } },
    destination: { connect: { id: input.destinationId } },
  }

  return machineReplenishmentRequestRepository.create(data)
}

export async function listMachineReplenishmentRequests(filters?: {
  requestedById?: string
  status?: RequestStatus
  destinationId?: string
}) {
  return machineReplenishmentRequestRepository.findManyForList(filters)
}

export async function getMachineReplenishmentRequestById(id: string) {
  return requireRequestById(id)
}

export async function updateMachineReplenishmentRequest(
  id: string,
  input: UpdateMachineReplenishmentRequestInput,
) {
  const current = await requireRequestById(id)
  assertEditable(current.status)

  const data: Prisma.MachineReplenishmentRequestUpdateInput = {}
  if (input.destinationId !== undefined) {
    await requireMachineExists(input.destinationId)
    data.destination = { connect: { id: input.destinationId } }
  }
  if (input.movementCube !== undefined) {
    data.movementCube = input.movementCube.trim()
  }
  if (input.priorityLevel !== undefined) {
    data.priorityLevel = input.priorityLevel
  }

  if (Object.keys(data).length === 0) {
    return current
  }

  return machineReplenishmentRequestRepository.update(id, data)
}

export async function deleteMachineReplenishmentRequest(id: string) {
  const current = await requireRequestById(id)
  if (current.status !== RequestStatus.CREATED) {
    throw new MachineReplenishmentRequestDeleteBlockedError()
  }
  if (current._count.forkliftTasks > 0) {
    throw new MachineReplenishmentRequestDeleteBlockedError()
  }
  await machineReplenishmentRequestRepository.delete(id)
}

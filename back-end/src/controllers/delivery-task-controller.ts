import type { RouteHandlerMethod } from 'fastify'
import { TypeMovimentPallet } from '../generated/prisma/enums.js'
import {
  DeliveryTaskNotEditableError,
  DeliveryTaskNotFoundError,
  MachineNotFoundError,
  OperatorWithoutSectorError,
} from '../errors/domain-errors.js'
import {
  createDeliveryTask,
  getDeliveryTaskById,
  listDeliveryTasks,
  listPendingSupplyRequestsForUser,
  listSectorTransportOperators,
  markDeliveryTaskPrepared,
  updateDeliveryTask,
} from '../services/delivery-task.service.js'
import { userRepository } from '../repositories/user.repository.js'
import type { AppJwtPayload } from '../types/auth.types.js'
import { isAdminOrSuperAdmin } from '../utils/role-user.js'

function isTypeMovimentPallet(value: string): value is TypeMovimentPallet {
  return (Object.values(TypeMovimentPallet) as string[]).includes(value)
}

export const postCreateDeliveryTask: RouteHandlerMethod = async (
  request,
  reply,
) => {
  const user = request.user as AppJwtPayload
  const body = (request.body ?? {}) as {
    machineId?: string
    movementCube?: string
    typeMovimentPallet?: string
    isCritical?: boolean
    markReady?: boolean
    operatorSupplyRequestId?: string
  }

  if (typeof body.machineId !== 'string' || body.machineId.trim() === '') {
    return reply.status(400).send({ error: 'Informe machineId.' })
  }
  if (
    typeof body.movementCube !== 'string' ||
    body.movementCube.trim() === ''
  ) {
    return reply.status(400).send({ error: 'Informe movementCube (prisma).' })
  }
  if (
    typeof body.typeMovimentPallet !== 'string' ||
    !isTypeMovimentPallet(body.typeMovimentPallet)
  ) {
    return reply.status(400).send({ error: 'typeMovimentPallet invalido.' })
  }

  try {
    const task = await createDeliveryTask({
      requestedById: user.sub,
      machineId: body.machineId.trim(),
      movementCube: body.movementCube,
      typeMovimentPallet: body.typeMovimentPallet,
      isCritical: body.isCritical === true,
      markReady: body.markReady === true,
      operatorSupplyRequestId:
        typeof body.operatorSupplyRequestId === 'string'
          ? body.operatorSupplyRequestId
          : undefined,
    })
    return reply.status(201).send({ task })
  } catch (error) {
    if (error instanceof MachineNotFoundError) {
      return reply.status(404).send({ error: error.message })
    }
    throw error
  }
}

export const getListDeliveryTasks: RouteHandlerMethod = async (
  request,
  reply,
) => {
  const q = (request.query ?? {}) as { machineId?: string }
  const tasks = await listDeliveryTasks(
    q.machineId ? { machineId: q.machineId } : undefined,
  )
  return reply.send({ tasks, requests: tasks })
}

export const getDeliveryTaskByIdHandler: RouteHandlerMethod = async (
  request,
  reply,
) => {
  const { taskId } = request.params as { taskId?: string }
  if (!taskId) {
    return reply.status(400).send({ error: 'taskId invalido.' })
  }
  try {
    const task = await getDeliveryTaskById(taskId)
    return reply.send({ task })
  } catch (error) {
    if (error instanceof DeliveryTaskNotFoundError) {
      return reply.status(404).send({ error: error.message })
    }
    throw error
  }
}

export const getSectorTransportOperators: RouteHandlerMethod = async (
  request,
  reply,
) => {
  const actor = request.user as AppJwtPayload
  const q = (request.query ?? {}) as { sectorId?: string }
  let sectorId =
    typeof q.sectorId === 'string' && q.sectorId.trim() !== ''
      ? q.sectorId.trim()
      : undefined

  // Abastecedor / líder: só operadores do próprio setor.
  // ADMIN / SUPERADMIN: podem omitir sectorId (todos) ou filtrar.
  if (!isAdminOrSuperAdmin(actor.role)) {
    const user = await userRepository.findUniqueByIdWithSector(actor.sub)
    if (!user?.sectorId) {
      return reply.send({ movimentPallets: [] })
    }
    sectorId = user.sectorId
  }

  const movimentPallets = sectorId
    ? await listSectorTransportOperators({ sectorId })
    : await listSectorTransportOperators()
  return reply.send({ movimentPallets })
}

export const getPendingSupplyRequests: RouteHandlerMethod = async (
  request,
  reply,
) => {
  const user = request.user as AppJwtPayload
  try {
    const result = await listPendingSupplyRequestsForUser(user.sub)
    return reply.send(result)
  } catch (error) {
    if (error instanceof OperatorWithoutSectorError) {
      return reply.status(400).send({ error: error.message })
    }
    throw error
  }
}

export const patchDeliveryTask: RouteHandlerMethod = async (request, reply) => {
  const { taskId } = request.params as { taskId?: string }
  if (!taskId) {
    return reply.status(400).send({ error: 'taskId invalido.' })
  }

  const body = (request.body ?? {}) as {
    machineId?: string
    movementCube?: string
    typeMovimentPallet?: string
    isCritical?: boolean
  }

  if (
    body.typeMovimentPallet !== undefined &&
    (typeof body.typeMovimentPallet !== 'string' ||
      !isTypeMovimentPallet(body.typeMovimentPallet))
  ) {
    return reply.status(400).send({ error: 'typeMovimentPallet invalido.' })
  }

  try {
    const task = await updateDeliveryTask(taskId, {
      ...(body.machineId !== undefined ? { machineId: body.machineId } : {}),
      ...(body.movementCube !== undefined
        ? { movementCube: body.movementCube }
        : {}),
      ...(body.typeMovimentPallet !== undefined
        ? { typeMovimentPallet: body.typeMovimentPallet }
        : {}),
      ...(body.isCritical !== undefined ? { isCritical: body.isCritical } : {}),
    })
    return reply.send({ task })
  } catch (error) {
    if (error instanceof DeliveryTaskNotFoundError) {
      return reply.status(404).send({ error: error.message })
    }
    if (error instanceof DeliveryTaskNotEditableError) {
      return reply.status(409).send({ error: error.message })
    }
    if (error instanceof MachineNotFoundError) {
      return reply.status(404).send({ error: error.message })
    }
    if (error instanceof Error && error.message.includes('Informe')) {
      return reply.status(400).send({ error: error.message })
    }
    throw error
  }
}

export const postMarkDeliveryTaskPrepared: RouteHandlerMethod = async (
  request,
  reply,
) => {
  const { taskId } = request.params as { taskId?: string }
  if (!taskId) {
    return reply.status(400).send({ error: 'taskId invalido.' })
  }
  try {
    const task = await markDeliveryTaskPrepared(taskId)
    return reply.send({ task })
  } catch (error) {
    if (error instanceof DeliveryTaskNotFoundError) {
      return reply.status(404).send({ error: error.message })
    }
    throw error
  }
}

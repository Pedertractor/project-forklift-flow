import type { RouteHandlerMethod } from 'fastify'
import { RoleUser } from '../generated/prisma/enums.js'
import {
  MachineNotFoundError,
  MovimentOperatorMachineLinkInvalidError,
  MovimentOperatorMachineLinkNotFoundError,
  UserNotFoundError,
} from '../errors/domain-errors.js'
import { userRepository } from '../repositories/user.repository.js'
import {
  createMovimentOperatorMachineLink,
  deleteMovimentOperatorMachineLink,
  deleteMovimentOperatorMachineLinkByPair,
  listMovimentOperatorMachineLinks,
  listMovimentOperatorPriorityBoard,
  replaceMovimentOperatorMachineLinks,
} from '../services/moviment-operator-machine-link.service.js'
import type { AppJwtPayload } from '../types/auth.types.js'
import { isAdminOrSuperAdmin } from '../utils/role-user.js'

async function resolveBoardSectorId(
  actor: AppJwtPayload,
  requestedSectorId?: string,
): Promise<
  | { ok: true; sectorId?: string }
  | { ok: false; status: number; error: string }
> {
  if (isAdminOrSuperAdmin(actor.role)) {
    if (typeof requestedSectorId === 'string' && requestedSectorId.trim() !== '') {
      return { ok: true, sectorId: requestedSectorId.trim() }
    }
    return { ok: true }
  }

  if (actor.role === RoleUser.LEADER) {
    const leader = await userRepository.findUniqueByIdWithSector(actor.sub)
    if (!leader?.sectorId) {
      return {
        ok: false,
        status: 403,
        error: 'Lider sem setor vinculado.',
      }
    }
    return { ok: true, sectorId: leader.sectorId }
  }

  return {
    ok: false,
    status: 403,
    error: 'Sem permissao para este recurso.',
  }
}

async function resolveActorSectorGuard(
  actor: AppJwtPayload,
): Promise<
  | { ok: true; actorSectorId?: string }
  | { ok: false; status: number; error: string }
> {
  if (isAdminOrSuperAdmin(actor.role)) {
    return { ok: true }
  }
  if (actor.role === RoleUser.LEADER) {
    const leader = await userRepository.findUniqueByIdWithSector(actor.sub)
    if (!leader?.sectorId) {
      return {
        ok: false,
        status: 403,
        error: 'Lider sem setor vinculado.',
      }
    }
    return { ok: true, actorSectorId: leader.sectorId }
  }
  return {
    ok: false,
    status: 403,
    error: 'Sem permissao para este recurso.',
  }
}

export const getMovimentOperatorPriorityBoard: RouteHandlerMethod = async (
  request,
  reply,
) => {
  const actor = request.user as AppJwtPayload
  const { sectorId: sectorIdRaw } = (request.query ?? {}) as {
    sectorId?: string
  }
  const scope = await resolveBoardSectorId(actor, sectorIdRaw)
  if (!scope.ok) {
    return reply.status(scope.status).send({ error: scope.error })
  }

  const board = await listMovimentOperatorPriorityBoard(
    scope.sectorId ? { sectorId: scope.sectorId } : undefined,
  )
  return reply.send(board)
}

export const getListMovimentOperatorMachineLinks: RouteHandlerMethod = async (
  request,
  reply,
) => {
  const actor = request.user as AppJwtPayload
  const q = (request.query ?? {}) as {
    operatorId?: string
    sectorId?: string
  }
  const scope = await resolveBoardSectorId(actor, q.sectorId)
  if (!scope.ok) {
    return reply.status(scope.status).send({ error: scope.error })
  }

  const links = await listMovimentOperatorMachineLinks({
    ...(typeof q.operatorId === 'string' && q.operatorId.trim() !== ''
      ? { operatorId: q.operatorId.trim() }
      : {}),
    ...(scope.sectorId ? { sectorId: scope.sectorId } : {}),
  })
  return reply.send({ links })
}

export const postCreateMovimentOperatorMachineLink: RouteHandlerMethod = async (
  request,
  reply,
) => {
  const actor = request.user as AppJwtPayload
  const guard = await resolveActorSectorGuard(actor)
  if (!guard.ok) {
    return reply.status(guard.status).send({ error: guard.error })
  }

  const body = (request.body ?? {}) as {
    operatorId?: string
    machineId?: string
  }
  if (typeof body.operatorId !== 'string' || body.operatorId.trim() === '') {
    return reply.status(400).send({ error: 'Informe operatorId.' })
  }
  if (typeof body.machineId !== 'string' || body.machineId.trim() === '') {
    return reply.status(400).send({ error: 'Informe machineId.' })
  }

  try {
    const link = await createMovimentOperatorMachineLink({
      operatorId: body.operatorId.trim(),
      machineId: body.machineId.trim(),
      ...(guard.actorSectorId
        ? { actorSectorId: guard.actorSectorId }
        : {}),
    })
    return reply.status(201).send({ link })
  } catch (error) {
    if (error instanceof UserNotFoundError) {
      return reply.status(404).send({ error: error.message })
    }
    if (error instanceof MachineNotFoundError) {
      return reply.status(404).send({ error: error.message })
    }
    if (error instanceof MovimentOperatorMachineLinkInvalidError) {
      return reply.status(400).send({ error: error.message })
    }
    throw error
  }
}

export const putReplaceMovimentOperatorMachineLinks: RouteHandlerMethod =
  async (request, reply) => {
    const actor = request.user as AppJwtPayload
    const guard = await resolveActorSectorGuard(actor)
    if (!guard.ok) {
      return reply.status(guard.status).send({ error: guard.error })
    }

    const { operatorId } = request.params as { operatorId?: string }
    if (!operatorId?.trim()) {
      return reply.status(400).send({ error: 'operatorId invalido.' })
    }

    const body = (request.body ?? {}) as { machineIds?: unknown }
    if (!Array.isArray(body.machineIds)) {
      return reply
        .status(400)
        .send({ error: 'Informe machineIds (array de ids).' })
    }
    const machineIds = body.machineIds.filter(
      (id): id is string => typeof id === 'string',
    )

    try {
      const links = await replaceMovimentOperatorMachineLinks({
        operatorId: operatorId.trim(),
        machineIds,
        ...(guard.actorSectorId
          ? { actorSectorId: guard.actorSectorId }
          : {}),
      })
      return reply.send({ links })
    } catch (error) {
      if (error instanceof UserNotFoundError) {
        return reply.status(404).send({ error: error.message })
      }
      if (error instanceof MachineNotFoundError) {
        return reply.status(404).send({ error: error.message })
      }
      if (error instanceof MovimentOperatorMachineLinkInvalidError) {
        return reply.status(400).send({ error: error.message })
      }
      throw error
    }
  }

export const deleteMovimentOperatorMachineLinkHandler: RouteHandlerMethod =
  async (request, reply) => {
    const actor = request.user as AppJwtPayload
    const guard = await resolveActorSectorGuard(actor)
    if (!guard.ok) {
      return reply.status(guard.status).send({ error: guard.error })
    }

    const { linkId } = request.params as { linkId?: string }
    if (!linkId?.trim()) {
      return reply.status(400).send({ error: 'linkId invalido.' })
    }

    try {
      const link = await deleteMovimentOperatorMachineLink(linkId.trim(), {
        ...(guard.actorSectorId
          ? { actorSectorId: guard.actorSectorId }
          : {}),
      })
      return reply.send({ link })
    } catch (error) {
      if (error instanceof MovimentOperatorMachineLinkNotFoundError) {
        return reply.status(404).send({ error: error.message })
      }
      if (error instanceof MovimentOperatorMachineLinkInvalidError) {
        return reply.status(403).send({ error: error.message })
      }
      throw error
    }
  }

export const deleteMovimentOperatorMachineLinkByPairHandler: RouteHandlerMethod =
  async (request, reply) => {
    const actor = request.user as AppJwtPayload
    const guard = await resolveActorSectorGuard(actor)
    if (!guard.ok) {
      return reply.status(guard.status).send({ error: guard.error })
    }

    const q = (request.query ?? {}) as {
      operatorId?: string
      machineId?: string
    }
    if (typeof q.operatorId !== 'string' || q.operatorId.trim() === '') {
      return reply.status(400).send({ error: 'Informe operatorId.' })
    }
    if (typeof q.machineId !== 'string' || q.machineId.trim() === '') {
      return reply.status(400).send({ error: 'Informe machineId.' })
    }

    try {
      const link = await deleteMovimentOperatorMachineLinkByPair(
        q.operatorId.trim(),
        q.machineId.trim(),
        {
          ...(guard.actorSectorId
            ? { actorSectorId: guard.actorSectorId }
            : {}),
        },
      )
      return reply.send({ link })
    } catch (error) {
      if (error instanceof MovimentOperatorMachineLinkNotFoundError) {
        return reply.status(404).send({ error: error.message })
      }
      if (error instanceof MovimentOperatorMachineLinkInvalidError) {
        return reply.status(403).send({ error: error.message })
      }
      throw error
    }
  }

import type { RouteHandlerMethod } from 'fastify'
import {
  CreateUserError,
  UserNotFoundError,
  UserPasswordError,
} from '../errors/domain-errors.js'
import { infoByCardAndUnit } from '../external-api/employee-verify/index.js'
import {
  createUser,
  getDefaultFirstPassword as resolveDefaultFirstPassword,
  listRoleUserEnumValues,
  listUsers,
  resetUserPasswordToDefault,
  updateUserRole,
  updateUserSector,
} from '../services/user.service.js'
import type { AppJwtPayload } from '../types/auth.types.js'
import { isRole, isUnit } from '../utils/unit-role.js'

function parseSectorIdFromBody(body: unknown): string | null | undefined {
  if (body === null || typeof body !== 'object') {
    return undefined
  }
  const raw = (body as { sectorId?: unknown }).sectorId
  if (raw === undefined) {
    return undefined
  }
  if (raw === null) {
    return null
  }
  if (typeof raw !== 'string') {
    return undefined
  }
  const t = raw.trim()
  return t === '' ? undefined : t
}

export const postCreateUser: RouteHandlerMethod = async (request, reply) => {
  const jwtUser = request.user as AppJwtPayload
  const { card, unit: unitRaw, role: roleRaw } = (request.body ?? {}) as {
    card?: string
    unit?: string
    role?: string
  }
  if (typeof card !== 'string' || typeof unitRaw !== 'string') {
    return reply.status(400).send({
      error: 'Envie card e unit (PEDERTRACTOR | TRACTOR).',
    })
  }
  if (!isUnit(unitRaw)) {
    return reply.status(400).send({ error: 'Unidade invalida.' })
  }
  if (!isRole(roleRaw)) {
    return reply.status(400).send({ error: 'Informe um role valido para criacao.' })
  }

  const sectorId = parseSectorIdFromBody(request.body)

  try {
    const user = await createUser(
      {
        card,
        unit: unitRaw,
        role: roleRaw,
        isLogged: false,
        ...(sectorId !== undefined ? { sectorId } : {}),
      },
      { userId: jwtUser.sub, role: jwtUser.role },
    )
    return {
      id: user.id,
      name: user.name,
      role: user.role,
      card: user.card,
      unit: user.unit,
      employeeId: user.employeeId,
      sectorId: user.sectorId ?? null,
    }
  } catch (error) {
    if (error instanceof CreateUserError) {
      return reply.status(400).send({ error: error.message })
    }
    throw error
  }
}

export const getListUsers: RouteHandlerMethod = async (request, reply) => {
  const viewer = request.user as AppJwtPayload
  try {
    const users = await listUsers({ userId: viewer.sub, role: viewer.role })
    return reply.send({ users })
  } catch (error) {
    if (error instanceof CreateUserError) {
      return reply.status(400).send({ error: error.message })
    }
    throw error
  }
}

export const getEmployeeInfo: RouteHandlerMethod = async (request, reply) => {
  const { card, unit: unitRaw } = (request.query ?? {}) as {
    card?: string
    unit?: string
  }
  if (typeof card !== 'string' || card.trim() === '') {
    return reply.status(400).send({ error: 'Informe o parametro card.' })
  }
  if (typeof unitRaw !== 'string') {
    return reply.status(400).send({ error: 'Informe o parametro unit.' })
  }
  if (!isUnit(unitRaw)) {
    return reply.status(400).send({ error: 'Unidade invalida.' })
  }
  const employee = await infoByCardAndUnit(unitRaw, card.trim())
  if (!employee) {
    return reply
      .status(404)
      .send({ error: 'Colaborador nao encontrado.' })
  }
  return reply.send(employee)
}

export const getListRoles: RouteHandlerMethod = async (_request, reply) => {
  return reply.send({ roles: listRoleUserEnumValues() })
}

export const getDefaultFirstPassword: RouteHandlerMethod = async (
  _request,
  reply,
) => {
  try {
    return reply.send({ defaultPassword: resolveDefaultFirstPassword() })
  } catch (error) {
    if (error instanceof UserPasswordError) {
      return reply.status(503).send({ error: error.message })
    }
    throw error
  }
}

export const patchUserRole: RouteHandlerMethod = async (request, reply) => {
  const { userId } = request.params as { userId?: string }
  const { role: roleRaw } = (request.body ?? {}) as { role?: string }
  if (!userId) {
    return reply.status(400).send({ error: 'userId invalido.' })
  }
  if (!isRole(roleRaw)) {
    return reply.status(400).send({ error: 'Informe um role valido.' })
  }
  const jwtUser = request.user as AppJwtPayload
  try {
    const user = await updateUserRole(userId, roleRaw, {
      userId: jwtUser.sub,
      role: jwtUser.role,
    })
    return reply.send({
      id: user.id,
      name: user.name,
      role: user.role,
      card: user.card,
      unit: user.unit,
      employeeId: user.employeeId,
    })
  } catch (error) {
    if (error instanceof UserNotFoundError) {
      return reply.status(404).send({ error: error.message })
    }
    if (error instanceof CreateUserError) {
      return reply.status(400).send({ error: error.message })
    }
    throw error
  }
}

export const patchUserSector: RouteHandlerMethod = async (request, reply) => {
  const { userId } = request.params as { userId?: string }
  const body = request.body
  if (!userId) {
    return reply.status(400).send({ error: 'userId invalido.' })
  }
  if (body === null || typeof body !== 'object' || !('sectorId' in body)) {
    return reply.status(400).send({ error: 'Informe sectorId (UUID ou null).' })
  }

  const sectorId = parseSectorIdFromBody(body)
  if (sectorId === undefined) {
    return reply.status(400).send({ error: 'sectorId invalido.' })
  }

  const jwtUser = request.user as AppJwtPayload
  try {
    const user = await updateUserSector(userId, sectorId, {
      userId: jwtUser.sub,
      role: jwtUser.role,
    })
    return reply.send({
      id: user.id,
      name: user.name,
      role: user.role,
      card: user.card,
      unit: user.unit,
      employeeId: user.employeeId,
      sectorId: user.sectorId ?? null,
    })
  } catch (error) {
    if (error instanceof UserNotFoundError) {
      return reply.status(404).send({ error: error.message })
    }
    if (error instanceof CreateUserError) {
      return reply.status(400).send({ error: error.message })
    }
    throw error
  }
}

export const postResetUserPassword: RouteHandlerMethod = async (
  request,
  reply,
) => {
  const { userId } = request.params as { userId?: string }
  if (!userId) {
    return reply.status(400).send({ error: 'userId invalido.' })
  }
  const jwtUser = request.user as AppJwtPayload
  try {
    await resetUserPasswordToDefault(userId, {
      userId: jwtUser.sub,
      role: jwtUser.role,
    })
    return { ok: true }
  } catch (error) {
    if (error instanceof UserPasswordError) {
      return reply.status(400).send({ error: error.message })
    }
    throw error
  }
}

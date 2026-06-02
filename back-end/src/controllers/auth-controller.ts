import type { RouteHandlerMethod } from 'fastify'
import type { IsOperating, RoleUser, Unit } from '../generated/prisma/enums.js'
import { AuthError, UserPasswordError } from '../errors/domain-errors.js'
import {
  getUserProfileById,
  loginWithCardUnitPassword,
  updateOwnPassword,
} from '../services/auth.service.js'
import type { AppJwtPayload } from '../types/auth.types.js'
import { isUnit } from '../utils/unit-role.js'

function publicAuthUser(u: {
  id: string
  name: string
  role: RoleUser
  card: string
  unit: Unit
  employeeId: number
  sectorId?: string | null
  sector?: { id: string; typeSector: string } | null
  isOperating?: IsOperating | null
}) {
  return {
    id: u.id,
    name: u.name,
    role: u.role,
    card: u.card,
    unit: u.unit,
    employeeId: u.employeeId,
    sectorId: u.sectorId ?? null,
    sector: u.sector ?? null,
    isOperating: u.isOperating ?? null,
  }
}

export const getMe: RouteHandlerMethod = async (request, reply) => {
  const jwtUser = request.user as AppJwtPayload
  if (typeof jwtUser?.sub !== 'string' || jwtUser.sub.length === 0) {
    return reply.status(401).send({ error: 'Token invalido.' })
  }

  let user
  try {
    user = await getUserProfileById(jwtUser.sub)
  } catch (error) {
    request.log.error({ err: error }, 'getUserProfileById')
    return reply.status(503).send({
      error: 'Nao foi possivel consultar o usuario. Verifique o banco de dados.',
    })
  }

  if (!user) {
    return reply.status(404).send({ error: 'Usuario nao encontrado.' })
  }

  return {
    ...publicAuthUser(user),
    firstAccess: !user.isLogged,
  }
}

export const postLogin: RouteHandlerMethod = async (request, reply) => {
  const { card, unit: unitRaw, password } = (request.body ?? {}) as {
    card?: string
    unit?: string
    password?: string
  }
  if (
    typeof card !== 'string' ||
    typeof password !== 'string' ||
    typeof unitRaw !== 'string'
  ) {
    return reply.status(400).send({
      error: 'Envie card, unit (PEDERTRACTOR | TRACTOR) e password.',
    })
  }
  if (!isUnit(unitRaw)) {
    return reply.status(400).send({ error: 'Unidade invalida.' })
  }

  try {
    const user = await loginWithCardUnitPassword(card, unitRaw, password)
    const firstAccess = !user.isLogged
    const payload: AppJwtPayload = {
      sub: user.id,
      role: user.role,
      firstAccess,
    }
    const token = await reply.jwtSign(payload)
    return {
      token,
      firstAccess,
      user: publicAuthUser(user),
    }
  } catch (error) {
    if (error instanceof AuthError) {
      return reply.status(401).send({ error: error.message })
    }
    throw error
  }
}

export const postPassword: RouteHandlerMethod = async (request, reply) => {
  const { newPassword, currentPassword } = (request.body ?? {}) as {
    newPassword?: string
    currentPassword?: string
  }
  if (typeof newPassword !== 'string') {
    return reply.status(400).send({ error: 'Envie newPassword.' })
  }

  const jwtUser = request.user as AppJwtPayload
  try {
    await updateOwnPassword({
      userId: jwtUser.sub,
      newPassword,
      ...(typeof currentPassword === 'string' ? { currentPassword } : {}),
    })
    const token = await reply.jwtSign({
      sub: jwtUser.sub,
      role: jwtUser.role,
      firstAccess: false,
    })
    return { ok: true, token }
  } catch (error) {
    if (error instanceof UserPasswordError) {
      return reply.status(400).send({ error: error.message })
    }
    throw error
  }
}

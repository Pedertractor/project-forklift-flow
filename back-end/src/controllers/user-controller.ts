import type { RouteHandlerMethod } from 'fastify'
import { CreateUserError, UserPasswordError } from '../errors/domain-errors.js'
import { infoByCardAndUnit } from '../external-api/employee-verify/index.js'
import {
  createUser,
  listUsers,
  resetUserPasswordToDefault,
} from '../services/user.service.js'
import type { AppJwtPayload } from '../types/auth.types.js'
import { isRole, isUnit } from '../utils/unit-role.js'

export const postCreateUser: RouteHandlerMethod = async (request, reply) => {
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

  try {
    const user = await createUser({
      card,
      unit: unitRaw,
      role: roleRaw,
      isLogged: false,
    })
    return {
      id: user.id,
      name: user.name,
      role: user.role,
      card: user.card,
      unit: user.unit,
      employeeId: user.employeeId,
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
  const users = await listUsers(viewer.role)
  return reply.send({ users })
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
      .send({ error: 'Colaborador nao encontrado na API de verificacao.' })
  }
  return reply.send(employee)
}

export const postResetUserPassword: RouteHandlerMethod = async (
  request,
  reply,
) => {
  const { userId } = request.params as { userId?: string }
  if (!userId) {
    return reply.status(400).send({ error: 'userId invalido.' })
  }
  try {
    await resetUserPasswordToDefault(userId)
    return { ok: true }
  } catch (error) {
    if (error instanceof UserPasswordError) {
      return reply.status(400).send({ error: error.message })
    }
    throw error
  }
}

import type { RouteHandlerMethod } from 'fastify'
import { TypeMovimentPallet } from '../generated/prisma/enums.js'
import {
  MovimentPalletCodeConflictError,
  MovimentPalletDeleteBlockedError,
  MovimentPalletNotFoundError,
  SectorNotFoundError,
} from '../errors/domain-errors.js'
import {
  createMovimentPallet,
  deleteMovimentPallet,
  getMovimentPalletById,
  listMovimentPallets,
  updateMovimentPallet,
  type CreateMovimentPalletInput,
} from '../services/moviment-pallet.service.js'

function isTypeMovimentPallet(value: string): value is TypeMovimentPallet {
  return (Object.values(TypeMovimentPallet) as string[]).includes(value)
}

export const postCreateMovimentPallet: RouteHandlerMethod = async (
  request,
  reply,
) => {
  const body = (request.body ?? {}) as {
    code?: string
    type?: string
    sectorId?: string | null
  }
  if (typeof body.code !== 'string' || body.code.trim() === '') {
    return reply.status(400).send({ error: 'Informe code (texto nao vazio).' })
  }
  if (typeof body.type !== 'string' || body.type.trim() === '') {
    return reply
      .status(400)
      .send({ error: 'Informe type (PALLET_TRUCK ou FORKLIFT).' })
  }
  const typeRaw = body.type.trim()
  if (!isTypeMovimentPallet(typeRaw)) {
    return reply.status(400).send({
      error: 'type invalido. Use PALLET_TRUCK ou FORKLIFT.',
    })
  }
  try {
    const input: CreateMovimentPalletInput = {
      code: body.code,
      type: typeRaw,
    }
    if (body.sectorId === null) {
      input.sectorId = null
    } else if (typeof body.sectorId === 'string') {
      const s = body.sectorId.trim()
      input.sectorId = s === '' ? null : s
    }
    const row = await createMovimentPallet(input)
    return reply.status(201).send(row)
  } catch (error) {
    if (error instanceof SectorNotFoundError) {
      return reply.status(404).send({ error: error.message })
    }
    if (error instanceof MovimentPalletCodeConflictError) {
      return reply.status(409).send({ error: error.message })
    }
    throw error
  }
}

export const getListMovimentPallets: RouteHandlerMethod = async (
  request,
  reply,
) => {
  const q = (request.query ?? {}) as { sectorId?: string; type?: string }
  let type: TypeMovimentPallet | undefined
  if (q.type !== undefined && q.type !== '') {
    if (!isTypeMovimentPallet(q.type)) {
      return reply.status(400).send({ error: 'type invalido no filtro.' })
    }
    type = q.type
  }
  const filters: { sectorId?: string; type?: TypeMovimentPallet } = {}
  if (typeof q.sectorId === 'string' && q.sectorId.trim() !== '') {
    filters.sectorId = q.sectorId.trim()
  }
  if (type !== undefined) {
    filters.type = type
  }
  const movimentPallets = await listMovimentPallets(
    Object.keys(filters).length > 0 ? filters : undefined,
  )
  return reply.send({ movimentPallets })
}

export const getMovimentPalletByIdHandler: RouteHandlerMethod = async (
  request,
  reply,
) => {
  const { movimentPalletId } = request.params as { movimentPalletId?: string }
  if (!movimentPalletId) {
    return reply.status(400).send({ error: 'movimentPalletId invalido.' })
  }
  try {
    const row = await getMovimentPalletById(movimentPalletId)
    return reply.send(row)
  } catch (error) {
    if (error instanceof MovimentPalletNotFoundError) {
      return reply.status(404).send({ error: error.message })
    }
    throw error
  }
}

export const patchUpdateMovimentPallet: RouteHandlerMethod = async (
  request,
  reply,
) => {
  const { movimentPalletId } = request.params as { movimentPalletId?: string }
  if (!movimentPalletId) {
    return reply.status(400).send({ error: 'movimentPalletId invalido.' })
  }
  const body = (request.body ?? {}) as {
    code?: string
    type?: string
    sectorId?: string | null
  }
  const patch: {
    code?: string
    type?: TypeMovimentPallet
    sectorId?: string | null
  } = {}
  if (body.code !== undefined) {
    if (typeof body.code !== 'string' || body.code.trim() === '') {
      return reply.status(400).send({ error: 'code nao pode ser vazio.' })
    }
    patch.code = body.code.trim()
  }
  if (body.type !== undefined) {
    if (typeof body.type !== 'string' || body.type.trim() === '') {
      return reply.status(400).send({ error: 'type nao pode ser vazio.' })
    }
    const raw = body.type.trim()
    if (!isTypeMovimentPallet(raw)) {
      return reply.status(400).send({
        error: 'type invalido. Use PALLET_TRUCK ou FORKLIFT.',
      })
    }
    patch.type = raw
  }
  if (body.sectorId !== undefined) {
    patch.sectorId =
      body.sectorId === null
        ? null
        : typeof body.sectorId === 'string'
          ? body.sectorId.trim() || null
          : null
  }
  if (Object.keys(patch).length === 0) {
    return reply.status(400).send({
      error: 'Envie ao menos um campo: code, type ou sectorId.',
    })
  }
  try {
    const row = await updateMovimentPallet(movimentPalletId, patch)
    return reply.send(row)
  } catch (error) {
    if (error instanceof MovimentPalletNotFoundError) {
      return reply.status(404).send({ error: error.message })
    }
    if (error instanceof SectorNotFoundError) {
      return reply.status(404).send({ error: error.message })
    }
    if (error instanceof MovimentPalletCodeConflictError) {
      return reply.status(409).send({ error: error.message })
    }
    throw error
  }
}

export const deleteMovimentPalletHandler: RouteHandlerMethod = async (
  request,
  reply,
) => {
  const { movimentPalletId } = request.params as { movimentPalletId?: string }
  if (!movimentPalletId) {
    return reply.status(400).send({ error: 'movimentPalletId invalido.' })
  }
  try {
    await deleteMovimentPallet(movimentPalletId)
    return reply.status(204).send()
  } catch (error) {
    if (error instanceof MovimentPalletNotFoundError) {
      return reply.status(404).send({ error: error.message })
    }
    if (error instanceof MovimentPalletDeleteBlockedError) {
      return reply.status(409).send({ error: error.message })
    }
    throw error
  }
}

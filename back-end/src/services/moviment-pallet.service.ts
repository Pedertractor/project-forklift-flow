import type { Prisma } from '../generated/prisma/client.js'
import type { TypeMovimentPallet } from '../generated/prisma/enums.js'
import {
  MovimentPalletCodeConflictError,
  MovimentPalletDeleteBlockedError,
  MovimentPalletNotFoundError,
  SectorNotFoundError,
} from '../errors/domain-errors.js'
import { movimentPalletRepository } from '../repositories/moviment-pallet.repository.js'
import { sectorRepository } from '../repositories/sector.repository.js'

export type CreateMovimentPalletInput = {
  code: string
  type: TypeMovimentPallet
  sectorId?: string | null
}

export type UpdateMovimentPalletInput = {
  code?: string
  type?: TypeMovimentPallet
  sectorId?: string | null
}

async function requireMovimentPalletById(id: string) {
  const row = await movimentPalletRepository.findUniqueById(id)
  if (!row) {
    throw new MovimentPalletNotFoundError()
  }
  return row
}

async function requireSectorIfProvided(sectorId: string | null | undefined) {
  if (sectorId === undefined || sectorId === null || sectorId === '') {
    return
  }
  const sector = await sectorRepository.findUniqueById(sectorId)
  if (!sector) {
    throw new SectorNotFoundError()
  }
}

export async function createMovimentPallet(input: CreateMovimentPalletInput) {
  await requireSectorIfProvided(input.sectorId ?? null)

  const code = input.code.trim()
  const existing = await movimentPalletRepository.findUniqueByCode(code)
  if (existing) {
    throw new MovimentPalletCodeConflictError()
  }

  const data: Prisma.MovimentPalletCreateInput = {
    code,
    type: input.type,
    ...(input.sectorId
      ? { sector: { connect: { id: input.sectorId } } }
      : {}),
  }

  return movimentPalletRepository.create(data)
}

export async function listMovimentPallets(
  filters?: {
    sectorId?: string
    type?: TypeMovimentPallet
  },
  options?: { includeTaskAvailability?: boolean },
) {
  if (options?.includeTaskAvailability) {
    return movimentPalletRepository.findManyForListWithTaskAvailability(filters)
  }
  return movimentPalletRepository.findManyForList(filters)
}

export async function getMovimentPalletById(id: string) {
  return requireMovimentPalletById(id)
}

export async function updateMovimentPallet(
  id: string,
  input: UpdateMovimentPalletInput,
) {
  await requireMovimentPalletById(id)

  if (input.sectorId !== undefined) {
    await requireSectorIfProvided(input.sectorId)
  }

  const data: Prisma.MovimentPalletUpdateInput = {}
  if (input.code !== undefined) {
    const nextCode = input.code.trim()
    const other = await movimentPalletRepository.findUniqueByCode(nextCode)
    if (other && other.id !== id) {
      throw new MovimentPalletCodeConflictError()
    }
    data.code = nextCode
  }
  if (input.type !== undefined) {
    data.type = input.type
  }
  if (input.sectorId !== undefined) {
    data.sector =
      input.sectorId === null || input.sectorId === ''
        ? { disconnect: true }
        : { connect: { id: input.sectorId } }
  }

  if (Object.keys(data).length === 0) {
    return requireMovimentPalletById(id)
  }

  return movimentPalletRepository.update(id, data)
}

export async function deleteMovimentPallet(id: string) {
  const current = await requireMovimentPalletById(id)
  if (current._count.movimentPalletTasks > 0) {
    throw new MovimentPalletDeleteBlockedError(
      'Nao e possivel excluir: ha tarefas vinculadas a este equipamento.',
    )
  }
  if (current.operatorId) {
    throw new MovimentPalletDeleteBlockedError(
      'Equipamento com operador vinculado; desvincule antes de excluir.',
    )
  }
  await movimentPalletRepository.delete(id)
}

import type { RouteHandlerMethod } from 'fastify'
import {
  MachineReplenishmentRequestNotFoundError,
  MovimentPalletNotFoundError,
  MovimentPalletNotInOperatorSectorError,
  MovimentPalletTypeNotAllowedForRoleError,
  OperatorWithoutBoundMovimentPalletError,
  OperatorWithoutSectorError,
  ReplenishmentRequestAlreadyAssignedError,
  ReplenishmentRequestTypeMismatchError,
  TripRouteSuggestionAcceptForbiddenError,
  TripRouteSuggestionNotFoundError,
  TripRouteSuggestionNotOpenError,
} from '../errors/domain-errors.js'
import {
  acceptReplenishmentRequestAsMovimentOperator,
  acceptTripRouteSuggestion,
  bindOperatorToMovimentPallet,
  getOperatorCurrentMovimentPallet,
  listMovimentPalletsForOperatorPicker,
  listMyMovimentPalletTasks,
  listOpenReplenishmentRequestsForMyMovimentType,
  listTripRouteSuggestionsForOperator,
  unbindOperatorFromMovimentPallets,
} from '../services/operator-moviment-pallet.service.js'
import type { AppJwtPayload } from '../types/auth.types.js'

export const postBindOperatorMovimentPallet: RouteHandlerMethod = async (
  request,
  reply,
) => {
  const user = request.user as AppJwtPayload
  const body = (request.body ?? {}) as { movimentPalletId?: string }
  if (
    typeof body.movimentPalletId !== 'string' ||
    body.movimentPalletId.trim() === ''
  ) {
    return reply.status(400).send({ error: 'Informe movimentPalletId.' })
  }
  try {
    const movimentPallet = await bindOperatorToMovimentPallet(
      user.sub,
      user.role,
      body.movimentPalletId.trim(),
    )
    return reply.send({ movimentPallet })
  } catch (error) {
    if (error instanceof OperatorWithoutSectorError) {
      return reply.status(400).send({ error: error.message })
    }
    if (error instanceof MovimentPalletNotInOperatorSectorError) {
      return reply.status(403).send({ error: error.message })
    }
    if (error instanceof MovimentPalletNotFoundError) {
      return reply.status(404).send({ error: error.message })
    }
    if (error instanceof MovimentPalletTypeNotAllowedForRoleError) {
      return reply.status(403).send({ error: error.message })
    }
    throw error
  }
}

export const deleteUnbindOperatorMovimentPallet: RouteHandlerMethod = async (
  request,
  reply,
) => {
  const user = request.user as AppJwtPayload
  await unbindOperatorFromMovimentPallets(user.sub)
  return reply.status(204).send()
}

export const getOperatorCurrentMovimentPalletHandler: RouteHandlerMethod =
  async (request, reply) => {
    const user = request.user as AppJwtPayload
    const movimentPallet = await getOperatorCurrentMovimentPallet(user.sub)
    return reply.send({ movimentPallet })
  }

export const getListMovimentPalletsForOperator: RouteHandlerMethod = async (
  request,
  reply,
) => {
  const user = request.user as AppJwtPayload
  const movimentPallets = await listMovimentPalletsForOperatorPicker(
    user.sub,
    user.role,
  )
  return reply.send({ movimentPallets })
}

export const getListOpenReplenishmentRequestsForMovimentOperator: RouteHandlerMethod =
  async (request, reply) => {
    const user = request.user as AppJwtPayload
    const requests = await listOpenReplenishmentRequestsForMyMovimentType(
      user.sub,
    )
    return reply.send({ requests })
  }

export const getListMyMovimentPalletTasks: RouteHandlerMethod = async (
  request,
  reply,
) => {
  const user = request.user as AppJwtPayload
  const tasks = await listMyMovimentPalletTasks(user.sub)
  return reply.send({ tasks })
}

export const getListTripRouteSuggestions: RouteHandlerMethod = async (
  request,
  reply,
) => {
  const user = request.user as AppJwtPayload
  const result = await listTripRouteSuggestionsForOperator(
    user.sub,
    user.role,
  )
  return reply.send(result)
}

export const postAcceptTripRouteSuggestion: RouteHandlerMethod = async (
  request,
  reply,
) => {
  const user = request.user as AppJwtPayload
  const { tripSuggestionId } = request.params as { tripSuggestionId?: string }
  if (!tripSuggestionId) {
    return reply.status(400).send({ error: 'tripSuggestionId invalido.' })
  }
  try {
    const result = await acceptTripRouteSuggestion(
      user.sub,
      user.role,
      tripSuggestionId,
    )
    return reply.status(201).send(result)
  } catch (error) {
    if (error instanceof TripRouteSuggestionNotFoundError) {
      return reply.status(404).send({ error: error.message })
    }
    if (error instanceof TripRouteSuggestionNotOpenError) {
      return reply.status(409).send({ error: error.message })
    }
    if (error instanceof TripRouteSuggestionAcceptForbiddenError) {
      return reply.status(403).send({ error: error.message })
    }
    if (error instanceof OperatorWithoutBoundMovimentPalletError) {
      return reply.status(400).send({ error: error.message })
    }
    if (error instanceof OperatorWithoutSectorError) {
      return reply.status(400).send({ error: error.message })
    }
    if (error instanceof MovimentPalletTypeNotAllowedForRoleError) {
      return reply.status(403).send({ error: error.message })
    }
    throw error
  }
}

export const postAcceptReplenishmentRequestForMovimentOperator: RouteHandlerMethod =
  async (request, reply) => {
    const user = request.user as AppJwtPayload
    const { requestId } = request.params as { requestId?: string }
    if (!requestId) {
      return reply.status(400).send({ error: 'requestId invalido.' })
    }
    try {
      const result = await acceptReplenishmentRequestAsMovimentOperator(
        user.sub,
        user.role,
        requestId,
      )
      return reply.status(201).send(result)
    } catch (error) {
      if (error instanceof MachineReplenishmentRequestNotFoundError) {
        return reply.status(404).send({ error: error.message })
      }
      if (error instanceof OperatorWithoutBoundMovimentPalletError) {
        return reply.status(400).send({ error: error.message })
      }
      if (error instanceof ReplenishmentRequestTypeMismatchError) {
        return reply.status(403).send({ error: error.message })
      }
      if (error instanceof ReplenishmentRequestAlreadyAssignedError) {
        return reply.status(409).send({ error: error.message })
      }
      if (error instanceof MovimentPalletTypeNotAllowedForRoleError) {
        return reply.status(403).send({ error: error.message })
      }
      throw error
    }
  }

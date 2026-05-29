import type { RouteHandlerMethod } from 'fastify'
import {
  MachineReplenishmentRequestNotFoundError,
  MovimentPalletDeliverTaskCompletionError,
  MovimentPalletNotFoundError,
  MovimentPalletNotInOperatorSectorError,
  MovimentPalletOccupiedByOtherOperatorError,
  MovimentPalletDeliverTaskAcceptError,
  MovimentPalletPickupTaskAcceptError,
  MovimentPalletPickupTaskCompletionError,
  MovimentPalletTaskNotFoundError,
  MovimentPalletTypeNotAllowedForRoleError,
  MovimentOperatorHasIncompleteTasksError,
  OperatorWithoutBoundMovimentPalletError,
  OperatorWithoutSectorError,
  ReplenishmentRequestAlreadyAssignedError,
  ReplenishmentRequestTypeMismatchError,
  TripRouteSuggestionAcceptForbiddenError,
  TripRouteSuggestionNotFoundError,
  TripRouteSuggestionNotOpenError,
} from '../errors/domain-errors.js'
import {
  acceptOpenDeliverTaskForMovimentOperator,
  acceptOpenPickupTaskForMovimentOperator,
  acceptTripRouteSuggestion,
  bindOperatorToMovimentPallet,
  completeDeliverTaskToMachine,
  completePickupTaskToExpedition,
  getOperatorCurrentMovimentPallet,
  getOperatorMovimentPalletActiveFlow,
  listMyMovimentPalletTasks,
  listMovimentOperatorTransportNotifications,
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
  const body = (request.body ?? {}) as { isOperating?: string }
  if (
    typeof body.isOperating !== 'string' ||
    body.isOperating.trim() === ''
  ) {
    return reply.status(400).send({ error: 'Informe isOperating (FORKLIFT ou PALLET_TRUCK).' })
  }
  try {
    const movimentPallet = await bindOperatorToMovimentPallet(
      user.sub,
      user.role,
      body.isOperating.trim(),
    )
    return reply.send({
      movimentPallet,
      isOperating: movimentPallet?.type ?? null,
    })
  } catch (error) {
    if (error instanceof OperatorWithoutSectorError) {
      return reply.status(400).send({ error: error.message })
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

export const getMovimentOperatorNotifications: RouteHandlerMethod = async (
  request,
  reply,
) => {
  const user = request.user as AppJwtPayload
  const payload = await listMovimentOperatorTransportNotifications(user.sub)
  return reply.send(payload)
}

export const getListOpenReplenishmentRequestsForMovimentOperator: RouteHandlerMethod =
  async (request, reply) => {
    const user = request.user as AppJwtPayload
    const result = await listOpenReplenishmentRequestsForMyMovimentType(
      user.sub,
    )
    return reply.send(result)
  }

export const getListMyMovimentPalletTasks: RouteHandlerMethod = async (
  request,
  reply,
) => {
  const user = request.user as AppJwtPayload
  const tasks = await listMyMovimentPalletTasks(user.sub, user.role)
  return reply.send({ tasks })
}

export const getOperatorMovimentPalletActiveFlowHandler: RouteHandlerMethod =
  async (request, reply) => {
    const user = request.user as AppJwtPayload
    const payload = await getOperatorMovimentPalletActiveFlow(
      user.sub,
      user.role,
    )
    return reply.send(payload)
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
    if (error instanceof MovimentOperatorHasIncompleteTasksError) {
      return reply.status(409).send({ error: error.message })
    }
    throw error
  }
}

export const postAcceptOpenPickupTask: RouteHandlerMethod = async (
  request,
  reply,
) => {
  const user = request.user as AppJwtPayload
  const { taskId } = request.params as { taskId?: string }
  if (!taskId || taskId.trim() === '') {
    return reply.status(400).send({ error: 'taskId invalido.' })
  }
  try {
    const result = await acceptOpenPickupTaskForMovimentOperator(
      user.sub,
      user.role,
      taskId.trim(),
    )
    return reply.status(201).send(result)
  } catch (error) {
    if (error instanceof MovimentPalletTaskNotFoundError) {
      return reply.status(404).send({ error: error.message })
    }
    if (error instanceof MovimentPalletPickupTaskAcceptError) {
      return reply.status(409).send({ error: error.message })
    }
    if (error instanceof OperatorWithoutBoundMovimentPalletError) {
      return reply.status(400).send({ error: error.message })
    }
    if (error instanceof OperatorWithoutSectorError) {
      return reply.status(400).send({ error: error.message })
    }
    if (error instanceof ReplenishmentRequestTypeMismatchError) {
      return reply.status(403).send({ error: error.message })
    }
    if (error instanceof MovimentPalletTypeNotAllowedForRoleError) {
      return reply.status(403).send({ error: error.message })
    }
    if (error instanceof MovimentOperatorHasIncompleteTasksError) {
      return reply.status(409).send({ error: error.message })
    }
    throw error
  }
}

export const postAcceptOpenDeliverTask: RouteHandlerMethod = async (
  request,
  reply,
) => {
  const user = request.user as AppJwtPayload
  const { taskId } = request.params as { taskId?: string }
  if (!taskId || taskId.trim() === '') {
    return reply.status(400).send({ error: 'taskId invalido.' })
  }
  try {
    const result = await acceptOpenDeliverTaskForMovimentOperator(
      user.sub,
      user.role,
      taskId.trim(),
    )
    return reply.status(201).send(result)
  } catch (error) {
    if (error instanceof MovimentPalletTaskNotFoundError) {
      return reply.status(404).send({ error: error.message })
    }
    if (error instanceof MovimentPalletDeliverTaskAcceptError) {
      return reply.status(409).send({ error: error.message })
    }
    if (error instanceof ReplenishmentRequestAlreadyAssignedError) {
      return reply.status(409).send({ error: error.message })
    }
    if (error instanceof OperatorWithoutBoundMovimentPalletError) {
      return reply.status(400).send({ error: error.message })
    }
    if (error instanceof OperatorWithoutSectorError) {
      return reply.status(400).send({ error: error.message })
    }
    if (error instanceof ReplenishmentRequestTypeMismatchError) {
      return reply.status(403).send({ error: error.message })
    }
    if (error instanceof MovimentPalletTypeNotAllowedForRoleError) {
      return reply.status(403).send({ error: error.message })
    }
    if (error instanceof MovimentOperatorHasIncompleteTasksError) {
      return reply.status(409).send({ error: error.message })
    }
    throw error
  }
}

export const postCompleteDeliverTask: RouteHandlerMethod = async (
  request,
  reply,
) => {
  const user = request.user as AppJwtPayload
  const { taskId } = request.params as { taskId?: string }
  if (!taskId || taskId.trim() === '') {
    return reply.status(400).send({ error: 'taskId invalido.' })
  }
  try {
    const result = await completeDeliverTaskToMachine(
      user.sub,
      user.role,
      taskId.trim(),
    )
    return reply.send(result)
  } catch (error) {
    if (error instanceof MovimentPalletTaskNotFoundError) {
      return reply.status(404).send({ error: error.message })
    }
    if (error instanceof MovimentPalletDeliverTaskCompletionError) {
      return reply.status(409).send({ error: error.message })
    }
    if (error instanceof OperatorWithoutBoundMovimentPalletError) {
      return reply.status(400).send({ error: error.message })
    }
    if (error instanceof ReplenishmentRequestTypeMismatchError) {
      return reply.status(403).send({ error: error.message })
    }
    if (error instanceof MovimentPalletTypeNotAllowedForRoleError) {
      return reply.status(403).send({ error: error.message })
    }
    throw error
  }
}

export const postCompletePickupTask: RouteHandlerMethod = async (
  request,
  reply,
) => {
  const user = request.user as AppJwtPayload
  const { taskId } = request.params as { taskId?: string }
  if (!taskId || taskId.trim() === '') {
    return reply.status(400).send({ error: 'taskId invalido.' })
  }
  try {
    const result = await completePickupTaskToExpedition(
      user.sub,
      user.role,
      taskId.trim(),
    )
    return reply.send(result)
  } catch (error) {
    if (error instanceof MovimentPalletTaskNotFoundError) {
      return reply.status(404).send({ error: error.message })
    }
    if (error instanceof MovimentPalletPickupTaskCompletionError) {
      return reply.status(409).send({ error: error.message })
    }
    if (error instanceof OperatorWithoutBoundMovimentPalletError) {
      return reply.status(400).send({ error: error.message })
    }
    if (error instanceof ReplenishmentRequestTypeMismatchError) {
      return reply.status(403).send({ error: error.message })
    }
    if (error instanceof MovimentPalletTypeNotAllowedForRoleError) {
      return reply.status(403).send({ error: error.message })
    }
    throw error
  }
}

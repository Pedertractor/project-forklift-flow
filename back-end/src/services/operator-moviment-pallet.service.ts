import {
  ForkliftTaskStatus,
  ForkliftTaskType,
  RequestStatus,
  RoleUser,
  TypeMovimentPallet,
} from '../generated/prisma/enums.js'
import {
  MachineReplenishmentRequestNotFoundError,
  MovimentPalletNotFoundError,
  MovimentPalletNotInOperatorSectorError,
  MovimentPalletTypeNotAllowedForRoleError,
  OperatorWithoutBoundMovimentPalletError,
  OperatorWithoutSectorError,
  ReplenishmentRequestAlreadyAssignedError,
  ReplenishmentRequestTypeMismatchError,
} from '../errors/domain-errors.js'
import { prisma } from '../lib/prisma.js'
import { machineReplenishmentRequestRepository } from '../repositories/machine-replenishment-request.repository.js'
import { movimentPalletRepository } from '../repositories/moviment-pallet.repository.js'
import { movimentPalletTaskRepository } from '../repositories/moviment-pallet-task.repository.js'
import { userRepository } from '../repositories/user.repository.js'

function typesAllowedForRole(role: RoleUser): TypeMovimentPallet[] {
  switch (role) {
    case RoleUser.FORKLIFT_OPERATOR:
      return [TypeMovimentPallet.FORKLIFT]
    case RoleUser.FOLLOW_UP_OPERATOR:
      return [TypeMovimentPallet.PALLET_TRUCK]
    case RoleUser.ADMIN:
      return [TypeMovimentPallet.FORKLIFT, TypeMovimentPallet.PALLET_TRUCK]
    default:
      return []
  }
}

export async function listMovimentPalletsForOperatorPicker(
  operatorUserId: string,
  role: RoleUser,
) {
  const types = typesAllowedForRole(role)
  if (types.length === 0) {
    return []
  }
  const user = await userRepository.findUniqueByIdWithSector(operatorUserId)
  if (!user?.sectorId) {
    return []
  }
  return movimentPalletRepository.findManyForOperatorPicker({
    sectorId: user.sectorId,
    types,
    operatorUserId,
  })
}

export async function getOperatorCurrentMovimentPallet(operatorUserId: string) {
  return movimentPalletRepository.findFirstByOperatorUserId(operatorUserId)
}

export async function bindOperatorToMovimentPallet(
  operatorUserId: string,
  role: RoleUser,
  movimentPalletId: string,
) {
  const allowed = typesAllowedForRole(role)
  if (allowed.length === 0) {
    throw new MovimentPalletTypeNotAllowedForRoleError()
  }

  const user = await userRepository.findUniqueByIdWithSector(operatorUserId)
  if (!user?.sectorId) {
    throw new OperatorWithoutSectorError()
  }

  const pallet = await movimentPalletRepository.findUniqueById(movimentPalletId)
  if (!pallet) {
    throw new MovimentPalletNotFoundError()
  }
  if (!pallet.sectorId || pallet.sectorId !== user.sectorId) {
    throw new MovimentPalletNotInOperatorSectorError()
  }
  if (!allowed.includes(pallet.type)) {
    throw new MovimentPalletTypeNotAllowedForRoleError(
      'Este equipamento nao corresponde ao tipo permitido para o seu perfil.',
    )
  }

  return movimentPalletRepository.assignOperatorExclusive(
    movimentPalletId,
    operatorUserId,
  )
}

export async function unbindOperatorFromMovimentPallets(operatorUserId: string) {
  await movimentPalletRepository.disconnectOperatorFromAllMovimentPallets(
    operatorUserId,
  )
}

export async function listOpenReplenishmentRequestsForMyMovimentType(
  operatorUserId: string,
) {
  const pallet = await movimentPalletRepository.findFirstByOperatorUserId(
    operatorUserId,
  )
  if (!pallet) {
    return []
  }
  return machineReplenishmentRequestRepository.findManyOpenPoolForMovimentType(
    pallet.type,
  )
}

export async function listMyMovimentPalletTasks(operatorUserId: string) {
  const pallet = await movimentPalletRepository.findFirstByOperatorUserId(
    operatorUserId,
  )
  if (!pallet) {
    return []
  }
  return movimentPalletTaskRepository.findManyForAssignedPallet(pallet.id)
}

export async function acceptReplenishmentRequestAsMovimentOperator(
  operatorUserId: string,
  role: RoleUser,
  requestId: string,
) {
  const allowed = typesAllowedForRole(role)
  if (allowed.length === 0) {
    throw new MovimentPalletTypeNotAllowedForRoleError()
  }

  const pallet = await movimentPalletRepository.findFirstByOperatorUserId(
    operatorUserId,
  )
  if (!pallet) {
    throw new OperatorWithoutBoundMovimentPalletError()
  }
  if (!allowed.includes(pallet.type)) {
    throw new MovimentPalletTypeNotAllowedForRoleError()
  }

  const request = await machineReplenishmentRequestRepository.findUniqueById(
    requestId,
  )
  if (!request) {
    throw new MachineReplenishmentRequestNotFoundError()
  }
  if (request.typeMovimentPallet !== pallet.type) {
    throw new ReplenishmentRequestTypeMismatchError()
  }

  const created = await prisma.$transaction(async (tx) => {
    const claimed = await tx.machineReplenishmentRequest.updateMany({
      where: {
        id: requestId,
        status: RequestStatus.CREATED,
        typeMovimentPallet: pallet.type,
      },
      data: { status: RequestStatus.IN_PROGRESS },
    })
    if (claimed.count !== 1) {
      throw new ReplenishmentRequestAlreadyAssignedError()
    }

    return tx.movimentPalletTask.create({
      data: {
        type: ForkliftTaskType.DELIVER_TO_MACHINE,
        status: ForkliftTaskStatus.ASSIGNED,
        request: { connect: { id: requestId } },
        requestedBy: { connect: { id: request.requestedById } },
        assignedMovimentPallet: { connect: { id: pallet.id } },
      },
    })
  })

  const task = await movimentPalletTaskRepository.findByIdWithRequest(created.id)
  if (!task) {
    throw new Error('Inconsistencia ao carregar tarefa apos aceite.')
  }
  const updatedRequest =
    await machineReplenishmentRequestRepository.findUniqueById(requestId)

  return { task, request: updatedRequest }
}

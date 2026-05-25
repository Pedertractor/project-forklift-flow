import { RoleUser, type Unit } from '../generated/prisma/enums.js'
import type { UserModel } from '../generated/prisma/models/User.js'
import { env } from '../env/index.js'
import {
  CreateUserError,
  UserNotFoundError,
  UserPasswordError,
} from '../errors/domain-errors.js'
import { infoByCardAndUnit } from '../external-api/employee-verify/index.js'
import { sectorRepository } from '../repositories/sector.repository.js'
import { userRepository } from '../repositories/user.repository.js'
import { hashPassword } from '../shared/password.js'

export type CreateUserActor = {
  userId: string
  role: RoleUser
}

export type CreateUserInput = {
  card: string
  unit: Unit
  password?: string
  role: RoleUser
  isLogged?: boolean
  /** Omitido: ADMIN sem setor; LEADER usa o setor do proprio lider. */
  sectorId?: string | null
}

function defaultFirstPasswordForCreate(): string {
  const fromEnv = env.FIRST_PASSWORD
  if (fromEnv === undefined || fromEnv === '') {
    throw new CreateUserError('FIRST_PASSWORD nao esta definido no ambiente.')
  }
  return fromEnv
}

function defaultFirstPasswordForReset(): string {
  const value = env.FIRST_PASSWORD
  if (value === undefined || value === '') {
    throw new UserPasswordError('FIRST_PASSWORD nao esta definido no ambiente.')
  }
  return value
}

async function resolveSectorIdForNewUser(
  input: CreateUserInput,
  actor: CreateUserActor,
): Promise<string | null> {
  if (actor.role === RoleUser.ADMIN) {
    if (
      input.sectorId === undefined ||
      input.sectorId === null ||
      String(input.sectorId).trim() === ''
    ) {
      return null
    }
    const sector = await sectorRepository.findUniqueById(
      String(input.sectorId).trim(),
    )
    if (!sector) {
      throw new CreateUserError('Setor informado nao existe.')
    }
    return sector.id
  }

  if (actor.role === RoleUser.LEADER) {
    const leader = await userRepository.findUniqueByIdWithSector(actor.userId)
    if (!leader) {
      throw new CreateUserError('Usuario autenticado nao encontrado.')
    }
    if (!leader.sectorId || !leader.sector) {
      throw new CreateUserError(
        'Lider sem setor vinculado nao pode criar usuarios.',
      )
    }
    const requestedRaw = input.sectorId
    const requestedId =
      requestedRaw === undefined ||
      requestedRaw === null ||
      String(requestedRaw).trim() === ''
        ? leader.sectorId
        : String(requestedRaw).trim()
    const target = await sectorRepository.findUniqueById(requestedId)
    if (!target) {
      throw new CreateUserError('Setor informado nao existe.')
    }
    if (target.typeSector !== leader.sector.typeSector) {
      throw new CreateUserError(
        'Lider so pode vincular usuarios a setores do mesmo tipo que o seu.',
      )
    }
    return target.id
  }

  throw new CreateUserError('Sem permissao para criar usuario.')
}

const LEADER_CREATABLE_ROLES: RoleUser[] = [
  RoleUser.OPERATOR_MACHINE,
  RoleUser.FORKLIFT_OPERATOR,
  RoleUser.FOLLOW_UP_OPERATOR,
  RoleUser.SUPPLY_OPERATOR,
]

export async function createUser(
  input: CreateUserInput,
  actor: CreateUserActor,
): Promise<UserModel> {
  if (actor.role === RoleUser.LEADER && !LEADER_CREATABLE_ROLES.includes(input.role)) {
    throw new CreateUserError(
      'Lider so pode criar usuarios com perfil OPERATOR_MACHINE, FORKLIFT_OPERATOR, FOLLOW_UP_OPERATOR ou SUPPLY_OPERATOR.',
    )
  }

  const card = input.card.trim()
  const employee = await infoByCardAndUnit(input.unit, card)
  if (!employee) {
    throw new CreateUserError(
      'Nao foi possivel obter o colaborador na API de verificacao.',
    )
  }

  if (employee.cardNumber.trim() !== card) {
    throw new CreateUserError(
      'O cartao retornado pela API nao confere com o cartao informado.',
    )
  }

  const duplicate = await userRepository.findFirstByCardAndUnit(card, input.unit)
  if (duplicate) {
    throw new CreateUserError(
      'Ja existe usuario cadastrado para este cartao e unidade.',
    )
  }

  const plainPassword = input.password ?? defaultFirstPasswordForCreate()
  const sectorId = await resolveSectorIdForNewUser(input, actor)

  return userRepository.create({
    name: employee.name,
    role: input.role,
    password: hashPassword(plainPassword),
    isLogged: input.isLogged ?? false,
    card,
    unit: input.unit,
    employeeId: employee.id,
    ...(sectorId !== null
      ? { sector: { connect: { id: sectorId } } }
      : {}),
  })
}

export type ListUsersActor = {
  userId: string
  role: RoleUser
}

export async function listUsers(actor: ListUsersActor) {
  if (actor.role === RoleUser.ADMIN) {
    return userRepository.findManyForList()
  }

  if (actor.role === RoleUser.LEADER) {
    const leader = await userRepository.findUniqueByIdWithSector(actor.userId)
    if (!leader) {
      throw new CreateUserError('Usuario autenticado nao encontrado.')
    }
    if (!leader.sectorId) {
      throw new CreateUserError(
        'Lider sem setor vinculado nao pode listar usuarios.',
      )
    }
    return userRepository.findManyForList({ sectorId: leader.sectorId })
  }

  throw new CreateUserError('Sem permissao para listar usuarios.')
}

export function listRoleUserEnumValues(): RoleUser[] {
  return Object.values(RoleUser)
}

async function assertLeaderCanManageTargetUser(
  actor: ListUsersActor,
  target: UserModel,
  actionLabel: string,
): Promise<void> {
  const leader = await userRepository.findUniqueByIdWithSector(actor.userId)
  if (!leader) {
    throw new CreateUserError('Usuario autenticado nao encontrado.')
  }
  if (!leader.sectorId) {
    throw new CreateUserError(
      `Lider sem setor vinculado nao pode ${actionLabel}.`,
    )
  }
  if (target.sectorId !== leader.sectorId) {
    throw new CreateUserError(
      `Lider so pode ${actionLabel} usuarios do seu setor.`,
    )
  }
  if (target.role === RoleUser.ADMIN || target.role === RoleUser.LEADER) {
    throw new CreateUserError(
      'Lider nao pode gerenciar administradores ou outros lideres.',
    )
  }
}

export async function updateUserRole(
  targetUserId: string,
  role: RoleUser,
  actor: ListUsersActor,
): Promise<UserModel> {
  const user = await userRepository.findUniqueById(targetUserId)
  if (!user) {
    throw new UserNotFoundError()
  }

  if (actor.role === RoleUser.LEADER) {
    await assertLeaderCanManageTargetUser(actor, user, 'alterar o perfil de')
    if (!LEADER_CREATABLE_ROLES.includes(role)) {
      throw new CreateUserError(
        'Lider so pode atribuir perfil OPERATOR_MACHINE, FORKLIFT_OPERATOR, FOLLOW_UP_OPERATOR ou SUPPLY_OPERATOR.',
      )
    }
  } else if (actor.role !== RoleUser.ADMIN) {
    throw new CreateUserError('Sem permissao para alterar perfil.')
  }

  return userRepository.update(targetUserId, { role })
}

export async function resetUserPasswordToDefault(
  targetUserId: string,
  actor: ListUsersActor,
) {
  const plain = defaultFirstPasswordForReset()
  const user = await userRepository.findUniqueById(targetUserId)
  if (!user) {
    throw new UserPasswordError('Usuario nao encontrado.')
  }

  if (actor.role === RoleUser.LEADER) {
    try {
      await assertLeaderCanManageTargetUser(actor, user, 'redefinir senha de')
    } catch (error) {
      if (error instanceof CreateUserError) {
        throw new UserPasswordError(error.message)
      }
      throw error
    }
  } else if (actor.role !== RoleUser.ADMIN) {
    throw new UserPasswordError('Sem permissao para redefinir senha.')
  }

  await userRepository.update(targetUserId, {
    password: hashPassword(plain),
    isLogged: false,
  })
}

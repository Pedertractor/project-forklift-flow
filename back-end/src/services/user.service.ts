import { RoleUser, type Unit } from '../generated/prisma/enums.js'
import type { UserModel } from '../generated/prisma/models/User.js'
import { env } from '../env/index.js'
import { CreateUserError, UserPasswordError } from '../errors/domain-errors.js'
import { infoByCardAndUnit } from '../external-api/employee-verify/index.js'
import { userRepository } from '../repositories/user.repository.js'
import { hashPassword } from '../shared/password.js'

export type CreateUserInput = {
  card: string
  unit: Unit
  password?: string
  role: RoleUser
  isLogged?: boolean
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

export async function createUser(input: CreateUserInput): Promise<UserModel> {
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

  return userRepository.create({
    name: employee.name,
    role: input.role,
    password: hashPassword(plainPassword),
    isLogged: input.isLogged ?? false,
    card,
    unit: input.unit,
    employeeId: employee.id,
  })
}

export async function listUsers(_viewerRole: RoleUser) {
  return userRepository.findManyForList()
}

export async function resetUserPasswordToDefault(targetUserId: string) {
  const plain = defaultFirstPasswordForReset()
  const user = await userRepository.findUniqueById(targetUserId)
  if (!user) {
    throw new UserPasswordError('Usuario nao encontrado.')
  }

  await userRepository.update(targetUserId, {
    password: hashPassword(plain),
    isLogged: false,
  })
}

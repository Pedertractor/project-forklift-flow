export class AuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthError'
  }
}

export class UserPasswordError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UserPasswordError'
  }
}

export class CreateUserError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CreateUserError'
  }
}

export class TypeMachineNotFoundError extends Error {
  constructor(message = 'Tipo de maquina nao encontrado.') {
    super(message)
    this.name = 'TypeMachineNotFoundError'
  }
}

export class TypeMachineInUseError extends Error {
  constructor(message = 'Existem maquinas vinculadas a este tipo; nao e possivel excluir.') {
    super(message)
    this.name = 'TypeMachineInUseError'
  }
}

export class InvalidTypeMachineImageError extends Error {
  constructor(message = 'Imagem invalida. Use JPEG, PNG, GIF ou WebP.') {
    super(message)
    this.name = 'InvalidTypeMachineImageError'
  }
}

export class MachineNotFoundError extends Error {
  constructor(message = 'Maquina nao encontrada.') {
    super(message)
    this.name = 'MachineNotFoundError'
  }
}

export class SectorNotFoundError extends Error {
  constructor(message = 'Setor nao encontrado.') {
    super(message)
    this.name = 'SectorNotFoundError'
  }
}

export class AssignMachineUserError extends Error {
  constructor(message = 'Usuario informado nao existe.') {
    super(message)
    this.name = 'AssignMachineUserError'
  }
}

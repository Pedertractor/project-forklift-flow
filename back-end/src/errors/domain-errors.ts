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

export class UserNotFoundError extends Error {
  constructor(message = 'Usuario nao encontrado.') {
    super(message)
    this.name = 'UserNotFoundError'
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

export class SectorInUseError extends Error {
  constructor(
    message = 'Existem registros vinculados a este setor; nao e possivel excluir.',
  ) {
    super(message)
    this.name = 'SectorInUseError'
  }
}

export class AssignMachineUserError extends Error {
  constructor(message = 'Usuario informado nao existe.') {
    super(message)
    this.name = 'AssignMachineUserError'
  }
}

export class MachineReplenishmentRequestNotFoundError extends Error {
  constructor(message = 'Solicitacao de reposicao nao encontrada.') {
    super(message)
    this.name = 'MachineReplenishmentRequestNotFoundError'
  }
}

export class MachineReplenishmentRequestNotEditableError extends Error {
  constructor(
    message = 'Solicitacao concluida ou cancelada; nao e possivel alterar.',
  ) {
    super(message)
    this.name = 'MachineReplenishmentRequestNotEditableError'
  }
}

export class MachineReplenishmentRequestDeleteBlockedError extends Error {
  constructor(
    message = 'So e possivel excluir solicitacoes em CREATED sem tarefas vinculadas.',
  ) {
    super(message)
    this.name = 'MachineReplenishmentRequestDeleteBlockedError'
  }
}

export class ReplenishmentRequestNotOnMachineStatusError extends Error {
  constructor(
    message = 'Retirada so pode ser solicitada com a requisicao em status ON_MACHINE.',
  ) {
    super(message)
    this.name = 'ReplenishmentRequestNotOnMachineStatusError'
  }
}

export class ReplenishmentRequestNotForOperatorMachineError extends Error {
  constructor(
    message = 'Esta requisicao nao e da sua maquina de operacao vinculada.',
  ) {
    super(message)
    this.name = 'ReplenishmentRequestNotForOperatorMachineError'
  }
}

export class PickupTaskAlreadyOpenError extends Error {
  constructor(
    message = 'Ja existe uma solicitacao de retirada (PICKUP) em aberto para esta requisicao.',
  ) {
    super(message)
    this.name = 'PickupTaskAlreadyOpenError'
  }
}

export class OperatorWithoutSectorError extends Error {
  constructor(
    message = 'Usuario sem setor vinculado; e necessario um setor para escolher maquina de operacao.',
  ) {
    super(message)
    this.name = 'OperatorWithoutSectorError'
  }
}

export class MachineNotInOperatorSectorError extends Error {
  constructor(
    message = 'So e possivel vincular maquinas do mesmo setor do usuario.',
  ) {
    super(message)
    this.name = 'MachineNotInOperatorSectorError'
  }
}

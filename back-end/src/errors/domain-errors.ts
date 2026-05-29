export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

export class UserPasswordError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserPasswordError";
  }
}

export class CreateUserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CreateUserError";
  }
}

export class UserNotFoundError extends Error {
  constructor(message = "Usuario nao encontrado.") {
    super(message);
    this.name = "UserNotFoundError";
  }
}

export class TypeMachineNotFoundError extends Error {
  constructor(message = "Tipo de maquina nao encontrado.") {
    super(message);
    this.name = "TypeMachineNotFoundError";
  }
}

export class TypeMachineInUseError extends Error {
  constructor(
    message = "Existem maquinas vinculadas a este tipo; nao e possivel excluir.",
  ) {
    super(message);
    this.name = "TypeMachineInUseError";
  }
}

export class InvalidTypeMachineImageError extends Error {
  constructor(message = "Imagem invalida. Use JPEG, PNG, GIF ou WebP.") {
    super(message);
    this.name = "InvalidTypeMachineImageError";
  }
}

export class MachineNotFoundError extends Error {
  constructor(message = "Maquina nao encontrada.") {
    super(message);
    this.name = "MachineNotFoundError";
  }
}

export class SectorNotFoundError extends Error {
  constructor(message = "Setor nao encontrado.") {
    super(message);
    this.name = "SectorNotFoundError";
  }
}

export class PlantMapAreaNotFoundError extends Error {
  constructor(message = 'Area do mapa nao encontrada.') {
    super(message)
    this.name = 'PlantMapAreaNotFoundError'
  }
}

export class PlantMapAreaValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PlantMapAreaValidationError'
  }
}

export class SectorInUseError extends Error {
  constructor(
    message = "Existem registros vinculados a este setor; nao e possivel excluir.",
  ) {
    super(message);
    this.name = "SectorInUseError";
  }
}

export class AssignMachineUserError extends Error {
  constructor(message = "Usuario informado nao existe.") {
    super(message);
    this.name = "AssignMachineUserError";
  }
}

export class MachineReplenishmentRequestNotFoundError extends Error {
  constructor(message = "Solicitacao de reposicao nao encontrada.") {
    super(message);
    this.name = "MachineReplenishmentRequestNotFoundError";
  }
}

export class DeliveryTaskNotFoundError extends Error {
  constructor(message = 'Tarefa de entrega nao encontrada.') {
    super(message)
    this.name = 'DeliveryTaskNotFoundError'
  }
}

export class PickupTaskNotFoundError extends Error {
  constructor(message = 'Tarefa de retirada nao encontrada.') {
    super(message)
    this.name = 'PickupTaskNotFoundError'
  }
}

export class PickupTaskCannotBeCanceledError extends Error {
  constructor(
    message = 'Nao e possivel cancelar: o transporte ja aceitou ou a retirada foi concluida.',
  ) {
    super(message)
    this.name = 'PickupTaskCannotBeCanceledError'
  }
}

export class PickupTaskNotOnOperatorMachineError extends Error {
  constructor(message = 'Esta retirada nao pertence a maquina em operacao.') {
    super(message)
    this.name = 'PickupTaskNotOnOperatorMachineError'
  }
}

export class MachineHasNoMaterialForPickupError extends Error {
  constructor(
    message = 'Nao ha prisma na maquina para solicitar retirada.',
  ) {
    super(message)
    this.name = 'MachineHasNoMaterialForPickupError'
  }
}

export class MachineReplenishmentRequestNotEditableError extends Error {
  constructor(
    message = "Solicitacao concluida ou cancelada; nao e possivel alterar.",
  ) {
    super(message);
    this.name = "MachineReplenishmentRequestNotEditableError";
  }
}

export class MachineReplenishmentRequestDeleteBlockedError extends Error {
  constructor(
    message = "So e possivel excluir solicitacoes aguardando preparo ou pallet pronto, sem tarefas vinculadas.",
  ) {
    super(message);
    this.name = "MachineReplenishmentRequestDeleteBlockedError";
  }
}

export class ReplenishmentRequestNotOnMachineStatusError extends Error {
  constructor(
    message = "Retirada so pode ser solicitada com a requisicao em status ON_MACHINE.",
  ) {
    super(message);
    this.name = "ReplenishmentRequestNotOnMachineStatusError";
  }
}

export class ReplenishmentRequestNotForOperatorMachineError extends Error {
  constructor(
    message = "Esta requisicao nao e da sua maquina de operacao vinculada.",
  ) {
    super(message);
    this.name = "ReplenishmentRequestNotForOperatorMachineError";
  }
}

export class OperatorMachineNotBoundError extends Error {
  constructor(
    message = "Nenhuma maquina vinculada; selecione a maquina de operacao antes.",
  ) {
    super(message);
    this.name = "OperatorMachineNotBoundError";
  }
}

export class ReplenishmentFinalizeMissingFieldsError extends Error {
  constructor(
    message = "Informe movementCube e typeMovimentPallet para abrir preparo de novo pallet.",
  ) {
    super(message);
    this.name = "ReplenishmentFinalizeMissingFieldsError";
  }
}

export class ReplenishmentFinalizeBlockedByInboundError extends Error {
  constructor(
    message = "Ja existe pallet a caminho, no recebimento ou na maquina para este posto. Aguarde conclusao da entrega ou retirada antes de nova solicitacao.",
  ) {
    super(message);
    this.name = "ReplenishmentFinalizeBlockedByInboundError";
  }
}

export class ReplenishmentPalletReadyCubePendingError extends Error {
  constructor(
    message = "Defina o codigo do prisma/pallet (abastecimento) antes de marcar pallet pronto.",
  ) {
    super(message);
    this.name = "ReplenishmentPalletReadyCubePendingError";
  }
}

export class ReplenishmentNotAwaitingPreparationError extends Error {
  constructor(
    message = "So e possivel marcar pallet pronto em solicitacoes aguardando preparo.",
  ) {
    super(message);
    this.name = "ReplenishmentNotAwaitingPreparationError";
  }
}

export class PickupTaskAlreadyOpenError extends Error {
  constructor(
    message = "Ja existe uma solicitacao de retirada (PICKUP) em aberto para esta requisicao.",
  ) {
    super(message);
    this.name = "PickupTaskAlreadyOpenError";
  }
}

export class OperatorWithoutSectorError extends Error {
  constructor(
    message = "Usuario sem setor vinculado; e necessario um setor para escolher maquina de operacao.",
  ) {
    super(message);
    this.name = "OperatorWithoutSectorError";
  }
}

export class MachineNotInOperatorSectorError extends Error {
  constructor(
    message = "So e possivel vincular maquinas do mesmo setor do usuario.",
  ) {
    super(message);
    this.name = "MachineNotInOperatorSectorError";
  }
}

export class MovimentPalletNotFoundError extends Error {
  constructor(message = "Equipamento de movimentacao nao encontrado.") {
    super(message);
    this.name = "MovimentPalletNotFoundError";
  }
}

export class MovimentPalletCodeConflictError extends Error {
  constructor(message = "Ja existe um equipamento com este codigo.") {
    super(message);
    this.name = "MovimentPalletCodeConflictError";
  }
}

export class MovimentPalletDeleteBlockedError extends Error {
  constructor(
    message = "Nao e possivel excluir: ha tarefas vinculadas ou operador atribuido.",
  ) {
    super(message);
    this.name = "MovimentPalletDeleteBlockedError";
  }
}

export class MovimentPalletNotInOperatorSectorError extends Error {
  constructor(
    message = "So e possivel vincular equipamentos do mesmo setor do usuario.",
  ) {
    super(message);
    this.name = "MovimentPalletNotInOperatorSectorError";
  }
}

export class MovimentPalletOccupiedByOtherOperatorError extends Error {
  constructor(
    message = "Este equipamento ja esta em uso por outro operador.",
  ) {
    super(message);
    this.name = "MovimentPalletOccupiedByOtherOperatorError";
  }
}

export class MovimentPalletTypeNotAllowedForRoleError extends Error {
  constructor(
    message = "Este perfil so pode operar empilhadeira (FORKLIFT) ou transpaleteira (PALLET_TRUCK) conforme a funcao.",
  ) {
    super(message);
    this.name = "MovimentPalletTypeNotAllowedForRoleError";
  }
}

export class OperatorWithoutBoundMovimentPalletError extends Error {
  constructor(
    message = "Selecione se esta operando empilhadeira ou transpaleteira antes de continuar.",
  ) {
    super(message);
    this.name = "OperatorWithoutBoundMovimentPalletError";
  }
}

/** @deprecated Alias — use OperatorWithoutBoundMovimentPalletError */
export const OperatorWithoutOperatingModeError =
  OperatorWithoutBoundMovimentPalletError;

export class InvalidOperatingModeError extends Error {
  constructor(message = "Modo de operacao invalido.") {
    super(message);
    this.name = "InvalidOperatingModeError";
  }
}

/** Equipamento ja tem tarefa em aberto; nao aceitar outra ate concluir ou cancelar. */
export class MovimentOperatorHasIncompleteTasksError extends Error {
  constructor(
    message = "Este equipamento ja possui atividade em aberto. Conclua ou cancele antes de aceitar outra.",
  ) {
    super(message);
    this.name = "MovimentOperatorHasIncompleteTasksError";
  }
}

export class ReplenishmentRequestTypeMismatchError extends Error {
  constructor(
    message = "Esta solicitacao nao e do tipo do equipamento que voce esta operando.",
  ) {
    super(message);
    this.name = "ReplenishmentRequestTypeMismatchError";
  }
}

export class ReplenishmentRequestAlreadyAssignedError extends Error {
  constructor(
    message = "Esta solicitacao ja foi aceita por outro operador ou nao esta disponivel.",
  ) {
    super(message);
    this.name = "ReplenishmentRequestAlreadyAssignedError";
  }
}

export class TripRouteSuggestionNotFoundError extends Error {
  constructor(message = "Sugestao de viagem nao encontrada.") {
    super(message);
    this.name = "TripRouteSuggestionNotFoundError";
  }
}

export class TripRouteSuggestionNotOpenError extends Error {
  constructor(
    message = "Sugestao nao esta aberta ou ja foi aceita por outro operador.",
  ) {
    super(message);
    this.name = "TripRouteSuggestionNotOpenError";
  }
}

export class TripRouteSuggestionAcceptForbiddenError extends Error {
  constructor(
    message = "Voce nao pode aceitar esta sugestao: tarefas ja vinculadas a outro equipamento ou situacao invalida.",
  ) {
    super(message);
    this.name = "TripRouteSuggestionAcceptForbiddenError";
  }
}

export class MovimentPalletTaskNotFoundError extends Error {
  constructor(message = "Tarefa nao encontrada.") {
    super(message);
    this.name = "MovimentPalletTaskNotFoundError";
  }
}

export class MovimentPalletDeliverTaskAcceptError extends Error {
  constructor(
    message = "Nao e possivel aceitar esta entrega: verifique tipo da tarefa, setor, equipamento vinculado e status da solicitacao.",
  ) {
    super(message);
    this.name = "MovimentPalletDeliverTaskAcceptError";
  }
}

export class MovimentPalletDeliverTaskCompletionError extends Error {
  constructor(
    message = "Nao e possivel concluir esta entrega: verifique tipo da tarefa, equipamento vinculado e status da solicitacao.",
  ) {
    super(message);
    this.name = "MovimentPalletDeliverTaskCompletionError";
  }
}

export class MovimentPalletPickupTaskCompletionError extends Error {
  constructor(
    message = "Nao e possivel concluir esta retirada: verifique tipo da tarefa, equipamento vinculado e status da solicitacao.",
  ) {
    super(message);
    this.name = "MovimentPalletPickupTaskCompletionError";
  }
}

export class MovimentPalletPickupTaskAcceptError extends Error {
  constructor(
    message = "Nao e possivel aceitar esta retirada: verifique tipo da tarefa, setor, equipamento vinculado e status da solicitacao.",
  ) {
    super(message);
    this.name = "MovimentPalletPickupTaskAcceptError";
  }
}

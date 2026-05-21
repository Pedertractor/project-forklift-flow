import type { FastifyReply, FastifyRequest } from "fastify";
import { RoleUser } from "../generated/prisma/enums.js";
import type { AppJwtPayload } from "../types/auth.types.js";

export function requireRoles(...allowed: RoleUser[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as AppJwtPayload;
    if (!allowed.includes(user.role)) {
      return reply
        .status(403)
        .send({ error: "Sem permissao para este recurso." });
    }
  };
}

/** Tipos de maquina e maquinas: apenas LEADER, SUPPLY_OPERATOR ou ADMIN. */
export function requireMachineDomainRoles() {
  return requireRoles(
    RoleUser.LEADER,
    RoleUser.SUPPLY_OPERATOR,
    RoleUser.ADMIN,
  );
}

/** Cadastro de equipamentos de movimentação: apenas LEADER ou ADMIN. */
export function requireMovimentPalletManageRoles() {
  return requireRoles(RoleUser.LEADER, RoleUser.ADMIN);
}

/** Leitura de equipamentos (ex.: painel do abastecedor): LEADER, SUPPLY_OPERATOR ou ADMIN. */
export function requireMovimentPalletReadRoles() {
  return requireRoles(
    RoleUser.LEADER,
    RoleUser.SUPPLY_OPERATOR,
    RoleUser.ADMIN,
  );
}

/**
 * Leitura de catalogo de maquinas (lista e detalhe) para supervisao no mapa.
 * Mutacoes (POST/PATCH/DELETE) continuam em `requireMachineDomainRoles`.
 */
export function requireMachineCatalogReadRoles() {
  return requireRoles(
    RoleUser.LEADER,
    RoleUser.SUPPLY_OPERATOR,
    RoleUser.ADMIN,
    RoleUser.SUPERVISOR,
    RoleUser.MANAGER,
  );
}

/** Solicitacoes de reposicao para o empilhadeirista: SUPPLY_OPERATOR, LEADER ou ADMIN. */
export function requireMachineReplenishmentRequestRoles() {
  return requireRoles(
    RoleUser.SUPPLY_OPERATOR,
    RoleUser.LEADER,
    RoleUser.ADMIN,
  );
}

/**
 * Leitura de pedidos de reposicao (lista, detalhe, preparo pendente) para mapa / supervisao.
 * Escritas (POST/PATCH/DELETE/mark-pallet-ready) continuam em `requireMachineReplenishmentRequestRoles`.
 */
export function requireMachineReplenishmentReadRoles() {
  return requireRoles(
    RoleUser.SUPPLY_OPERATOR,
    RoleUser.LEADER,
    RoleUser.ADMIN,
    RoleUser.SUPERVISOR,
    RoleUser.MANAGER,
  );
}

/** Operador de empilhadeira ou transpaleteira: vinculo ao equipamento e fila de reposicao. */
export function requireForkliftOrFollowUpOperatorRole() {
  return requireRoles(
    RoleUser.FORKLIFT_OPERATOR,
    RoleUser.FOLLOW_UP_OPERATOR,
    RoleUser.ADMIN,
  )
}

/** Operador de maquina: vinculo a maquina, requisicoes da maquina e pedido de retirada. */
export function requireOperatorMachineRole() {
  return requireRoles(RoleUser.OPERATOR_MACHINE, RoleUser.ADMIN);
}

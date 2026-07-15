import type { FastifyReply, FastifyRequest } from "fastify";
import { RoleUser } from "../generated/prisma/enums.js";
import type { AppJwtPayload } from "../types/auth.types.js";

export function requireRoles(...allowed: RoleUser[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as AppJwtPayload;
    if (user.role === RoleUser.SUPERADMIN) {
      return;
    }
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


/**
 * Leitura de catalogo de maquinas (lista e detalhe).
 * Mutacoes (POST/PATCH/DELETE) continuam em `requireMachineDomainRoles`.
 */
export function requireMachineCatalogReadRoles() {
  return requireMachineDomainRoles();
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
 * Leitura de pedidos de reposicao (lista, detalhe, preparo pendente).
 * Escritas (POST/PATCH/DELETE/mark-pallet-ready) continuam em `requireMachineReplenishmentRequestRoles`.
 */
export function requireMachineReplenishmentReadRoles() {
  return requireMachineReplenishmentRequestRoles();
}

/** Transportador de pallet: modo de operacao (empilhadeira ou transpaleteira) e fila. Sem ADMIN/LEADER. */
export function requirePalletTransporterRole() {
  return requireRoles(RoleUser.PALLET_TRANSPORTER)
}

/** @deprecated Use requirePalletTransporterRole */
export const requireForkliftOrFollowUpOperatorRole = requirePalletTransporterRole

/** Operador de maquina: vinculo a maquina, requisicoes da maquina e pedido de retirada. */
export function requireOperatorMachineRole() {
  return requireRoles(RoleUser.OPERATOR_MACHINE, RoleUser.ADMIN);
}

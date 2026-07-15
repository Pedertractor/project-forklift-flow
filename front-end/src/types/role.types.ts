/**
 * Papéis alinhados ao Prisma `RoleUser` e a `back-end/docs/ROTAS_POR_ROLE.md`.
 */
export const APP_ROLES = [
  'OPERATOR_MACHINE',
  'PALLET_TRANSPORTER',
  'SUPPLY_OPERATOR',
  'LEADER',
  'ADMIN',
  'SUPERADMIN',
] as const;

export type AppRole = (typeof APP_ROLES)[number];

export function isAppRole(value: string): value is AppRole {
  return (APP_ROLES as readonly string[]).includes(value);
}

export function isSuperAdmin(role: string | undefined): role is 'SUPERADMIN' {
  return role === 'SUPERADMIN';
}

/** ADMIN ou SUPERADMIN — gestão de usuários, setores e cadastros administrativos. */
export function hasAdminPrivileges(role: string | undefined): boolean {
  return role === 'ADMIN' || role === 'SUPERADMIN';
}

/** Acesso total ao sistema (todas as telas e APIs) — ADMIN e SUPERADMIN. */
export function hasFullSystemAccess(role: string | undefined): boolean {
  return hasAdminPrivileges(role);
}

/** Papéis que o ator pode atribuir ao criar/editar usuários. */
export function assignableRolesForActor(
  actorRole: string | undefined,
  allRoles: readonly string[],
): string[] {
  if (isSuperAdmin(actorRole)) {
    return [...allRoles];
  }
  if (actorRole === 'ADMIN') {
    return allRoles.filter((role) => role !== 'SUPERADMIN');
  }
  return [];
}

/** Papéis com acesso às telas de abastecimento (solicitações e preparo). */
export const MACHINE_DOMAIN_ROLES: readonly AppRole[] = [
  'ADMIN',
  'SUPERADMIN',
  'LEADER',
  'SUPPLY_OPERATOR',
];

/** Papéis que um líder pode criar (`POST /api/users` + mesmo setor do líder). */
export const LEADER_CREATABLE_ROLES: readonly AppRole[] = [
  'OPERATOR_MACHINE',
  'PALLET_TRANSPORTER',
  'SUPPLY_OPERATOR',
];

export const ADMIN_OR_LEADER_ROLES: readonly AppRole[] = [
  'ADMIN',
  'SUPERADMIN',
  'LEADER',
];

export const OPERATOR_MACHINE_ROLES: readonly AppRole[] = [
  'OPERATOR_MACHINE',
  'ADMIN',
  'SUPERADMIN',
];

/**
 * Transportador de pallet (empilhadeira ou transpaleteira via `isOperating`).
 * Somente este papel opera a tela «Operação — movimentação» (sem ADMIN/LEADER).
 */
export const MOVIMENT_OPERATOR_ROLES: readonly AppRole[] = [
  'PALLET_TRANSPORTER',
];

/** Papéis de gestão com leitura ampliada de filas e cadastros. */
export const SUPERVISION_ROLES: readonly AppRole[] = [
  'LEADER',
  'ADMIN',
  'SUPERADMIN',
];

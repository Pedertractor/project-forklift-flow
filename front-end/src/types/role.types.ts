/**
 * Papéis alinhados ao Prisma `RoleUser` e a `back-end/docs/ROTAS_POR_ROLE.md`.
 */
export const APP_ROLES = [
  'OPERATOR_MACHINE',
  'PALLET_TRANSPORTER',
  'SUPPLY_OPERATOR',
  'LEADER',
  'SUPERVISOR',
  'MANAGER',
  'ADMIN',
] as const;

export type AppRole = (typeof APP_ROLES)[number];

export function isAppRole(value: string): value is AppRole {
  return (APP_ROLES as readonly string[]).includes(value);
}

/** Papéis com CRUD de tipo de máquina e máquinas de produção na API. */
export const MACHINE_DOMAIN_ROLES: readonly AppRole[] = [
  'ADMIN',
  'LEADER',
  'SUPPLY_OPERATOR',
];

/** Papéis que um líder pode criar (`POST /api/users` + mesmo setor do líder). */
export const LEADER_CREATABLE_ROLES: readonly AppRole[] = [
  'OPERATOR_MACHINE',
  'PALLET_TRANSPORTER',
  'SUPPLY_OPERATOR',
];

export const ADMIN_OR_LEADER_ROLES: readonly AppRole[] = ['ADMIN', 'LEADER'];

export const OPERATOR_MACHINE_ROLES: readonly AppRole[] = [
  'OPERATOR_MACHINE',
  'ADMIN',
];

/**
 * Transportador de pallet (empilhadeira ou transpaleteira via `isOperating`).
 * ADMIN incluído para testes e suporte.
 */
export const MOVIMENT_OPERATOR_ROLES: readonly AppRole[] = [
  'PALLET_TRANSPORTER',
  'ADMIN',
];

/** Papéis de supervisão/gestão (leitura ampliada de filas e cadastros). */
export const SUPERVISION_ROLES: readonly AppRole[] = [
  'LEADER',
  'SUPERVISOR',
  'MANAGER',
  'ADMIN',
];

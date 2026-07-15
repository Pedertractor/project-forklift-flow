import type { AppRole } from '@/types/role.types';
import {
  ADMIN_OR_LEADER_ROLES,
  MACHINE_DOMAIN_ROLES,
  MOVIMENT_OPERATOR_ROLES,
  OPERATOR_MACHINE_ROLES,
  hasFullSystemAccess,
} from '@/types/role.types';
import { defaultHomePathForRole } from '@/lib/default-home-path';

/** Rotas do app (pathnames) alinhadas a `App.tsx` + `RequireRoles`. */
const PATH_RULES: {
  path: string;
  roles: readonly AppRole[];
  /** Se true, ADMIN/SUPERADMIN não bypassam (só os roles listados). */
  strict?: boolean;
}[] = [
  { path: '/dashboard', roles: ADMIN_OR_LEADER_ROLES },
  { path: '/cadastro/tipos-maquina', roles: ADMIN_OR_LEADER_ROLES },
  { path: '/cadastro/maquinas', roles: ADMIN_OR_LEADER_ROLES },
  { path: '/abastecimento/equipamentos', roles: ADMIN_OR_LEADER_ROLES },
  { path: '/abastecimento/solicitacoes', roles: MACHINE_DOMAIN_ROLES },
  { path: '/abastecimento/preparo-pendente', roles: MACHINE_DOMAIN_ROLES },
  { path: '/abastecimento/maquinas-dobra', roles: MACHINE_DOMAIN_ROLES },
  { path: '/administracao/setores', roles: ['ADMIN', 'SUPERADMIN'] },
  {
    path: '/administracao/prioridade-operador',
    roles: ADMIN_OR_LEADER_ROLES,
  },
  { path: '/administracao/usuarios', roles: ADMIN_OR_LEADER_ROLES },
  { path: '/operacao/equipamento', roles: MOVIMENT_OPERATOR_ROLES, strict: true },
  {
    path: '/operacao/aceitar-tarefas',
    roles: MOVIMENT_OPERATOR_ROLES,
    strict: true,
  },
  { path: '/operacao/tarefas', roles: MOVIMENT_OPERATOR_ROLES, strict: true },
  {
    path: '/operacao/filas-manuais',
    roles: MOVIMENT_OPERATOR_ROLES,
    strict: true,
  },
  {
    path: '/operacao/minhas-tarefas',
    roles: MOVIMENT_OPERATOR_ROLES,
    strict: true,
  },
  { path: '/dobra', roles: OPERATOR_MACHINE_ROLES },
  { path: '/dobra/operacao', roles: OPERATOR_MACHINE_ROLES },
];

export function normalizeAppPathname(path: string): string {
  const noQuery = path.split('?')[0]?.split('#')[0] ?? '/';
  const p = noQuery.trim() || '/';
  if (p.length > 1 && p.endsWith('/')) {
    return p.slice(0, -1);
  }
  return p;
}

export function isPathAllowedForAppRole(
  pathname: string,
  role: string | undefined,
): boolean {
  const normalized = normalizeAppPathname(pathname);
  if (
    normalized.startsWith('/dobra/retirada/') &&
    normalized.length > '/dobra/retirada/'.length
  ) {
    return Boolean(role && OPERATOR_MACHINE_ROLES.includes(role as AppRole));
  }
  const rule = PATH_RULES.find((r) => {
    if (r.path === '/dashboard') {
      return normalized === '/dashboard' || normalized.startsWith('/dashboard/');
    }
    return r.path === normalized;
  });
  if (!rule) {
    return false;
  }
  if (!role) {
    return false;
  }
  if (rule.strict) {
    return rule.roles.includes(role as AppRole);
  }
  if (hasFullSystemAccess(role)) {
    return true;
  }
  return rule.roles.includes(role as AppRole);
}

/**
 * Destino após autenticação: usa deep-link só se o papel permite; senão, home do papel.
 */
export function resolvePostLoginPath(
  fromPath: string | undefined | null,
  role: string | undefined,
): string {
  const normalized = normalizeAppPathname(fromPath ?? '/');
  if (
    normalized === '/login' ||
    normalized === '/definir-senha' ||
    normalized === '/nao-autorizado'
  ) {
    return defaultHomePathForRole(role);
  }
  if (isPathAllowedForAppRole(normalized, role)) {
    return normalized;
  }
  return defaultHomePathForRole(role);
}

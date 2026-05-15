import type { AppRole } from '@/types/role.types';
import {
  ADMIN_OR_LEADER_ROLES,
  MACHINE_DOMAIN_ROLES,
  MOVIMENT_OPERATOR_ROLES,
} from '@/types/role.types';
import {
  OPERATOR_MOVIMENT_EQUIPMENT_PATH,
  OPERATOR_MOVIMENT_MY_TASKS_PATH,
  OPERATOR_MOVIMENT_TASKS_QUEUE_PATH,
} from '@/constants/operator-moviment-routes';

export interface SidebarNavItem {
  to: string;
  label: string;
  /** `null` = qualquer usuário autenticado (ex.: Início, Painel). */
  allowedRoles: readonly AppRole[] | null;
}

/**
 * Itens do menu lateral alinhados a `ROTAS_POR_ROLE.md` (recurso → papéis).
 * Rotas não listadas aqui não aparecem no menu; o guard `RequireRoles` bloqueia acesso direto.
 */
export const SIDEBAR_NAV_ITEMS: readonly SidebarNavItem[] = [
  { to: '/', label: 'Início', allowedRoles: null },
  { to: '/dashboard', label: 'Painel', allowedRoles: null },
  {
    to: '/cadastro/tipos-maquina',
    label: 'Tipos de máquina',
    allowedRoles: MACHINE_DOMAIN_ROLES,
  },
  {
    to: '/cadastro/maquinas',
    label: 'Máquinas',
    allowedRoles: MACHINE_DOMAIN_ROLES,
  },
  {
    to: '/administracao/setores',
    label: 'Setores',
    allowedRoles: ['ADMIN'],
  },
  {
    to: '/administracao/usuarios',
    label: 'Usuários',
    allowedRoles: ADMIN_OR_LEADER_ROLES,
  },
  {
    to: OPERATOR_MOVIMENT_EQUIPMENT_PATH,
    label: 'Meu equipamento',
    allowedRoles: MOVIMENT_OPERATOR_ROLES,
  },
  {
    to: OPERATOR_MOVIMENT_TASKS_QUEUE_PATH,
    label: 'Tarefas disponíveis',
    allowedRoles: MOVIMENT_OPERATOR_ROLES,
  },
  {
    to: OPERATOR_MOVIMENT_MY_TASKS_PATH,
    label: 'Minhas tarefas',
    allowedRoles: MOVIMENT_OPERATOR_ROLES,
  },
];

export function sidebarItemsForRole(role: string | undefined): SidebarNavItem[] {
  if (!role) {
    return SIDEBAR_NAV_ITEMS.filter((item) => item.allowedRoles === null);
  }
  return SIDEBAR_NAV_ITEMS.filter((item) => {
    if (item.allowedRoles === null) {
      return true;
    }
    return item.allowedRoles.includes(role as AppRole);
  });
}

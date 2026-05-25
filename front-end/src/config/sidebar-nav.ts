import { PLANT_MAP_PAGE_PATH } from '@/constants/plant-map-routes';
import type { AppRole } from '@/types/role.types';
import {
  ADMIN_OR_LEADER_ROLES,
  MACHINE_DOMAIN_ROLES,
  MOVIMENT_OPERATOR_ROLES,
  OPERATOR_MACHINE_ROLES,
  PLANT_MAP_SUPERVISION_ROLES,
} from '@/types/role.types';
import {
  OPERATOR_MOVIMENT_EQUIPMENT_PATH,
  OPERATOR_MOVIMENT_MY_TASKS_PATH,
  OPERATOR_MOVIMENT_TASKS_QUEUE_PATH,
} from '@/constants/operator-moviment-routes';

export interface SidebarNavItem {
  to: string;
  label: string;
  /** `null` = qualquer usuário autenticado. */
  allowedRoles: readonly AppRole[] | null;
}

export interface SidebarNavSection {
  id: string;
  /** Título da seção no menu (pt-BR). */
  title: string;
  /**
   * Quem enxerga esta seção (pt-BR), alinhado a `ROTAS_POR_ROLE.md`.
   * Reflete os papéis dos itens agrupados; itens sem permissão somem, a seção some se ficar vazia.
   */
  rolesDescription: string;
  items: readonly SidebarNavItem[];
}

function itemVisibleForRole(
  item: SidebarNavItem,
  role: string | undefined,
): boolean {
  if (item.allowedRoles === null) {
    return true;
  }
  if (!role) {
    return false;
  }
  return item.allowedRoles.includes(role as AppRole);
}

/**
 * Seções do menu lateral: agrupamento visual + texto de quais papéis usam cada bloco.
 * Rotas não listadas não aparecem; `RequireRoles` continua bloqueando URL direta.
 */
export const SIDEBAR_NAV_SECTIONS: readonly SidebarNavSection[] = [
  {
    id: 'geral',
    title: 'Geral',
    rolesDescription:
      'Administrador (ADMIN) e líder (LEADER) — Início e Painel.',
    items: [
      { to: '/', label: 'Início', allowedRoles: ADMIN_OR_LEADER_ROLES },
      {
        to: '/dashboard',
        label: 'Painel',
        allowedRoles: ADMIN_OR_LEADER_ROLES,
      },
    ],
  },
  {
    id: 'supervisao',
    title: 'Supervisão',
    rolesDescription:
      'Líder (LEADER), supervisor (SUPERVISOR), gestor (MANAGER) e administrador (ADMIN).',
    items: [
      {
        to: PLANT_MAP_PAGE_PATH,
        label: 'Mapa da planta',
        allowedRoles: PLANT_MAP_SUPERVISION_ROLES,
      },
    ],
  },
  {
    id: 'dobra',
    title: 'Operação — máquina de dobra',
    rolesDescription:
      'Papel «operador de máquina» (OPERATOR_MACHINE) e administrador (ADMIN) para testes.',
    items: [
      {
        to: '/dobra/operacao',
        label: 'Operação na dobra',
        allowedRoles: OPERATOR_MACHINE_ROLES,
      },
    ],
  },
  {
    id: 'supply-cadastros',
    title: 'Abastecimento e cadastros de chão',
    rolesDescription:
      'Abastecimento (SUPPLY_OPERATOR), líder (LEADER) e administrador (ADMIN) — máquinas e solicitações. Cadastro de equipamentos de movimentação: líder e administrador.',
    items: [
      {
        to: '/cadastro/maquinas',
        label: 'Máquinas de produção',
        allowedRoles: MACHINE_DOMAIN_ROLES,
      },
      {
        to: '/abastecimento/equipamentos',
        label: 'Equipamentos de movimentação',
        allowedRoles: ADMIN_OR_LEADER_ROLES,
      },
      {
        to: '/abastecimento/solicitacoes',
        label: 'Solicitações de reposição',
        allowedRoles: MACHINE_DOMAIN_ROLES,
      },
    ],
  },
  {
    id: 'admin-setores',
    title: 'Administração — setores',
    rolesDescription: 'Somente administrador (ADMIN).',
    items: [
      {
        to: '/administracao/setores',
        label: 'Setores',
        allowedRoles: ['ADMIN'],
      },
    ],
  },
  {
    id: 'admin-usuarios',
    title: 'Administração — usuários',
    rolesDescription:
      'Líder (LEADER), para criar usuário no setor, e administrador (ADMIN).',
    items: [
      {
        to: '/administracao/usuarios',
        label: 'Usuários',
        allowedRoles: ADMIN_OR_LEADER_ROLES,
      },
    ],
  },
  {
    id: 'operacao-movimentacao',
    title: 'Operação — movimentação',
    rolesDescription:
      'Empilhadeirista (FORKLIFT_OPERATOR), transpaleteira / follow-up (FOLLOW_UP_OPERATOR) e administrador (ADMIN) para testes.',
    items: [
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
    ],
  },
];

/** Itens achatados (ex.: testes ou breadcrumbs). Preferir `sidebarSectionsForRole` no menu. */
export const SIDEBAR_NAV_ITEMS: readonly SidebarNavItem[] =
  SIDEBAR_NAV_SECTIONS.flatMap((s) => s.items);

export function sidebarSectionsForRole(
  role: string | undefined,
): { section: SidebarNavSection; items: SidebarNavItem[] }[] {
  const result: { section: SidebarNavSection; items: SidebarNavItem[] }[] = [];
  for (const section of SIDEBAR_NAV_SECTIONS) {
    const items = section.items.filter((item) =>
      itemVisibleForRole(item, role),
    );
    if (items.length > 0) {
      result.push({ section, items });
    }
  }
  return result;
}

/** Lista achatada de todos os itens (útil para testes). */
export function sidebarItemsForRole(
  role: string | undefined,
): SidebarNavItem[] {
  return sidebarSectionsForRole(role).flatMap((b) => b.items);
}

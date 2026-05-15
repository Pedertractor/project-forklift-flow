import { NavLink } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { sidebarSectionsForRole } from '@/config/sidebar-nav';
import { cn } from '@/lib/utils';
import type { AppUnit } from '@/types/user.types';

function userInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  const letters = parts.map((p) => p[0]?.toUpperCase() ?? '').join('');
  return letters || '—';
}

function unitLabel(unit: AppUnit): string {
  return unit === 'pedertractor' ? 'PEDERTRACTOR' : 'TRACTOR';
}

/** Rótulo amigável do papel JWT (pt-BR) para o rodapé do menu. */
function roleMenuLabel(role: string | undefined): string {
  if (!role) {
    return '—';
  }
  const map: Record<string, string> = {
    OPERATOR_MACHINE: 'Operador de máquina',
    FORKLIFT_OPERATOR: 'Operador de empilhadeira',
    FOLLOW_UP_OPERATOR: 'Operador de transpaleteira',
    SUPPLY_OPERATOR: 'Abastecimento',
    LEADER: 'Líder',
    SUPERVISOR: 'Supervisor',
    MANAGER: 'Gerente',
    ADMIN: 'Administrador',
  };
  return map[role] ?? role;
}

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#005fb8]/35',
    isActive
      ? 'bg-[#005fb8]/12 font-semibold text-[#005fb8]'
      : 'text-zinc-700 hover:bg-zinc-200/70 hover:text-zinc-900',
  );

interface AppSidebarProps {
  sidebarOpen: boolean;
  onCloseSidebar: () => void;
  onRequestLogout: () => void;
}

export function AppSidebar({
  sidebarOpen,
  onCloseSidebar,
  onRequestLogout,
}: AppSidebarProps) {
  const user = useAuthStore((s) => s.user);
  const navSections = sidebarSectionsForRole(user?.role);

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-zinc-200 bg-zinc-50 shadow-lg transition-transform duration-200 ease-out lg:static lg:z-0 lg:shadow-none',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
      )}
      aria-label="Menu da aplicação"
    >
      <div className="flex h-14 shrink-0 items-center border-b border-zinc-200 px-3">
        <p className="m-0 text-sm font-bold uppercase tracking-wider text-[#005fb8]">
          ForkLift Flow
        </p>
      </div>

      <nav className="flex flex-1 flex-col gap-0 overflow-y-auto p-2" aria-label="Navegação por módulo">
        {navSections.map(({ section, items }, sectionIndex) => (
          <div
            key={section.id}
            className={cn(
              sectionIndex > 0 && 'mt-3 border-t border-zinc-200 pt-3',
            )}
          >
            <div className="mb-2 px-1.5">
              <p className="m-0 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                {section.title}
              </p>
              <p className="mt-1.5 mb-0 text-[10px] leading-snug text-zinc-400">
                {section.rolesDescription}
              </p>
            </div>
            <div className="flex flex-col gap-0.5">
              {items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={navLinkClass}
                  onClick={onCloseSidebar}
                >
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-zinc-200 bg-zinc-50/90 p-2">
        <button
          type="button"
          onClick={onRequestLogout}
          className="w-full rounded-xl border border-zinc-200/90 bg-white px-3 py-2.5 text-left transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#005fb8]/30"
          title="Encerrar sessão"
        >
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#005fb8]/12 text-xs font-bold tracking-wide text-[#005fb8]">
              {user ? userInitials(user.name) : '—'}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-zinc-900" title={user?.name}>
                {user?.name ?? '—'}
              </p>
              <p className="truncate text-xs text-zinc-500">
                {user ? (
                  <>
                    Cartão <span className="font-mono text-zinc-700">{user.cardNumber}</span>
                    {' · '}
                    {unitLabel(user.unit)}
                  </>
                ) : (
                  '—'
                )}
              </p>
              {user?.role ? (
                <p className="mt-1 truncate text-[10px] text-zinc-400" title={user.role}>
                  Papel: <span className="font-medium text-zinc-600">{roleMenuLabel(user.role)}</span>
                  <span className="font-mono text-zinc-400"> ({user.role})</span>
                </p>
              ) : null}
            </div>
          </div>
        </button>
      </div>
    </aside>
  );
}

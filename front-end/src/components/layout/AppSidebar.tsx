import { NavLink } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { sidebarItemsForRole } from '@/config/sidebar-nav';
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
  const navItems = sidebarItemsForRole(user?.role);

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

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
        {navItems.map((item) => (
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
            </div>
          </div>
        </button>
      </div>
    </aside>
  );
}

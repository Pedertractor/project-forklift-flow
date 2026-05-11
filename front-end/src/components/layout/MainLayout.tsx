import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/card';
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

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      <line x1="4" x2="20" y1="6" y2="6" />
      <line x1="4" x2="20" y1="12" y2="12" />
      <line x1="4" x2="20" y1="18" y2="18" />
    </svg>
  );
}

function LogOutIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" x2="9" y1="12" y2="12" />
    </svg>
  );
}

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#005fb8]/35',
    isActive
      ? 'bg-[#005fb8]/12 font-semibold text-[#005fb8]'
      : 'text-zinc-700 hover:bg-zinc-200/70 hover:text-zinc-900',
  );

export function MainLayout() {
  const user = useAuthStore((s) => s.user);
  const logoutStore = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  function closeSidebar() {
    setSidebarOpen(false);
  }

  // Fecha o drawer ao mudar de rota (ex.: link no conteúdo).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fechar menu ao trocar pathname
    setSidebarOpen(false);
  }, [location.pathname]);

  function confirmLogout() {
    setLogoutOpen(false);
    logoutStore();
    navigate('/login', { replace: true });
  }

  return (
    <div className="relative flex min-h-svh bg-zinc-100 text-zinc-900">
      {sidebarOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-zinc-900/35 lg:hidden"
          aria-label="Fechar menu"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-zinc-200 bg-zinc-50 shadow-lg transition-transform duration-200 ease-out lg:static lg:z-0 lg:shadow-none',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
        aria-label="Menu da aplicação"
      >
        <div className="flex h-14 shrink-0 items-center border-b border-zinc-200 px-3">
          <p className="m-0 text-sm font-bold uppercase tracking-wider text-[#005fb8]">ForkLift Flow</p>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
          <NavLink to="/" end className={navLinkClass} onClick={closeSidebar}>
            <span>Início</span>
          </NavLink>
          <NavLink to="/dashboard" className={navLinkClass} onClick={closeSidebar}>
            <span>Painel</span>
          </NavLink>
        </nav>

        <div className="border-t border-zinc-200 bg-zinc-50/90 p-2">
          <button
            type="button"
            onClick={() => setLogoutOpen(true)}
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

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-zinc-200 bg-white px-2 sm:px-3">
          <button
            type="button"
            className="inline-flex size-10 items-center justify-center rounded-xl text-zinc-600 hover:bg-zinc-100 lg:hidden"
            aria-label="Abrir menu"
            onClick={() => setSidebarOpen((v) => !v)}
          >
            <MenuIcon />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          <Outlet />
        </div>
      </div>

      {logoutOpen ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-zinc-900/40 backdrop-blur-[1px]"
            aria-label="Fechar"
            onClick={() => setLogoutOpen(false)}
          />
          <Card className="relative z-10 w-full max-w-md overflow-hidden border border-zinc-200 p-0 shadow-xl">
            <div className="border-b border-zinc-100 bg-gradient-to-b from-zinc-50 to-white px-6 pb-6 pt-8">
              <h2 className="m-0 text-lg font-semibold tracking-tight text-zinc-900">Encerrar sessão</h2>
              <p className="mt-3 text-[0.9375rem] leading-relaxed text-zinc-600">
                Você precisará entrar de novo com cartão, unidade e senha para voltar ao ForkLift Flow.
              </p>
              {user?.name ? (
                <p className="mt-5 truncate rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-3 py-2.5 text-xs text-zinc-600">
                  <span className="font-normal text-zinc-500">Conectado como </span>
                  <span className="font-medium text-zinc-900">{user.name}</span>
                </p>
              ) : null}
            </div>
            <div className="flex flex-col-reverse gap-2 border-t border-zinc-100 bg-zinc-50/80 px-5 py-4 sm:flex-row sm:justify-end sm:gap-3">
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto sm:min-w-[6.5rem]"
                onClick={() => setLogoutOpen(false)}
              >
                Voltar
              </Button>
              <Button
                type="button"
                variant="default"
                className="w-full gap-2 border-transparent bg-red-600 text-white hover:bg-red-700 sm:w-auto sm:min-w-[6.5rem]"
                onClick={confirmLogout}
              >
                <LogOutIcon className="size-4 opacity-95" />
                Sair
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

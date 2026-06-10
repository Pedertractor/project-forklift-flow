import { useEffect, useLayoutEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { performLogout } from '@/lib/auth-session';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { APP_MAIN_PANE_ID } from '@/components/layout/main-content-portal';
import { OperatorMovimentWorkProvider } from '@/components/layout/OperatorMovimentWorkProvider';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/brand-button';
import { Card } from '@/components/ui/card';

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

export function MainLayout() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useLayoutEffect(() => {
    if (window.matchMedia('(max-width: 1023px)').matches) {
      setSidebarOpen(false);
    }
  }, []);
  const [logoutOpen, setLogoutOpen] = useState(false);

  function closeSidebarOnNavigate() {
    if (window.matchMedia('(max-width: 1023px)').matches) {
      setSidebarOpen(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fechar gaveta no mobile ao trocar de rota
    if (window.matchMedia('(max-width: 1023px)').matches) {
      setSidebarOpen(false);
    }
  }, [location.pathname]);

  function confirmLogout() {
    setLogoutOpen(false);
    performLogout();
    navigate('/login', { replace: true });
  }

  return (
    <OperatorMovimentWorkProvider>
      <div className="relative flex h-svh min-h-0 overflow-hidden bg-zinc-100 text-zinc-900">
        {sidebarOpen ? (
          <button
            type="button"
            className="fixed inset-0 z-40 bg-zinc-900/35 lg:hidden"
            aria-label="Fechar menu"
            onClick={() => setSidebarOpen(false)}
          />
        ) : null}

        <AppSidebar
          sidebarOpen={sidebarOpen}
          onCloseSidebar={closeSidebarOnNavigate}
          onRequestLogout={() => setLogoutOpen(true)}
        />

        <div
          id={APP_MAIN_PANE_ID}
          className="relative flex min-h-0 min-w-0 flex-1 flex-col"
        >
          <header className="flex h-14 shrink-0 items-center gap-2 border-b border-zinc-200 bg-white px-2 sm:px-3">
            <button
              type="button"
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl text-zinc-600 hover:bg-zinc-100"
              aria-label={sidebarOpen ? 'Recolher menu' : 'Abrir menu'}
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
                <h2 className="m-0 text-lg font-semibold tracking-tight text-zinc-900">
                  Encerrar sessão
                </h2>
                <p className="mt-3 text-[0.9375rem] leading-relaxed text-zinc-600">
                  Você precisará entrar de novo com cartão, unidade e senha para
                  voltar ao Fork.
                </p>
                {user?.name ? (
                  <p className="mt-5 truncate rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-3 py-2.5 text-xs text-zinc-600">
                    <span className="font-normal text-zinc-500">
                      Conectado como{' '}
                    </span>
                    <span className="font-medium text-zinc-900">
                      {user.name}
                    </span>
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
    </OperatorMovimentWorkProvider>
  );
}

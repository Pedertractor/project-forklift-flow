import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { UnauthorizedPageViewModel } from './useUnauthorizedPage';

const linkBtnBase =
  'inline-flex h-[var(--control-height,2.5rem)] shrink-0 items-center justify-center rounded-xl px-4 text-sm font-semibold whitespace-nowrap transition-colors outline-none focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#005fb8]/40';

const linkOutline =
  'border-2 border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50 w-full sm:w-auto';
const linkPrimary =
  'border-2 border-transparent bg-[#005fb8] text-white shadow-sm hover:bg-[#004a94] w-full sm:w-auto';

export function UnauthorizedPageView(vm: UnauthorizedPageViewModel) {
  const {
    userName,
    role,
    attemptedPath,
    canUseHomeAndDashboard,
    workspacePath,
    hasWorkspaceLink,
  } = vm;

  return (
    <div className="flex min-h-svh items-center justify-center bg-zinc-100 px-4 py-12">
      <Card className="w-full max-w-lg border border-zinc-200 p-8 shadow-lg">
        <p className="m-0 text-xs font-semibold uppercase tracking-wider text-amber-700">
          403
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900">
          Acesso não autorizado
        </h1>
        <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-end">
          {canUseHomeAndDashboard ? (
            <>
              <Link to="/dashboard" className={cn(linkBtnBase, linkOutline)}>
                Ir ao painel
              </Link>
              <Link to="/" className={cn(linkBtnBase, linkPrimary)}>
                Ir ao início
              </Link>
            </>
          ) : hasWorkspaceLink ? (
            <Link to={workspacePath} className={cn(linkBtnBase, linkPrimary)}>
              Ir à minha área de trabalho
            </Link>
          ) : (
            <p className="m-0 text-sm text-zinc-600">
              Se o seu papel deveria ter acesso a alguma tela do sistema, entre
              em contato com o administrador.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}

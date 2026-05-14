import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { UnauthorizedPageViewModel } from './useUnauthorizedPage';

const linkBtnBase =
  'inline-flex h-[var(--control-height,2.5rem)] shrink-0 items-center justify-center rounded-xl px-4 text-sm font-semibold whitespace-nowrap transition-colors outline-none focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#005fb8]/40';

const linkOutline = 'border-2 border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50 w-full sm:w-auto';
const linkPrimary =
  'border-2 border-transparent bg-[#005fb8] text-white shadow-sm hover:bg-[#004a94] w-full sm:w-auto';

export function UnauthorizedPageView(vm: UnauthorizedPageViewModel) {
  const { userName, role, attemptedPath } = vm;

  return (
    <div className="flex min-h-svh items-center justify-center bg-zinc-100 px-4 py-12">
      <Card className="w-full max-w-lg border border-zinc-200 p-8 shadow-lg">
        <p className="m-0 text-xs font-semibold uppercase tracking-wider text-amber-700">403</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900">Acesso não autorizado</h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-600">
          Seu perfil na aplicação não tem permissão para o recurso ou rota solicitada. As regras seguem o mapeamento da API descrito em{' '}
          <code className="rounded bg-zinc-100 px-1 font-mono text-[0.8125rem]">ROTAS_POR_ROLE.md</code>
          {' '}(prefixos como <code className="font-mono text-xs">/api/sectors</code> são exclusivos de{' '}
          <strong className="font-semibold">ADMIN</strong>, por exemplo).
        </p>
        {attemptedPath ? (
          <p className="mt-4 rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-3 py-2 font-mono text-xs text-zinc-700">
            Rota: {attemptedPath}
          </p>
        ) : null}
        {userName || role ? (
          <p className="mt-4 text-sm text-zinc-600">
            {userName ? (
              <>
                Conectado como <span className="font-medium text-zinc-900">{userName}</span>
                {role ? (
                  <>
                    {' '}
                    (<span className="font-mono text-zinc-800">{role}</span>)
                  </>
                ) : null}
                .
              </>
            ) : role ? (
              <>
                Papel atual: <span className="font-mono font-medium text-zinc-900">{role}</span>.
              </>
            ) : null}
          </p>
        ) : null}
        <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Link to="/dashboard" className={cn(linkBtnBase, linkOutline)}>
            Ir ao painel
          </Link>
          <Link to="/" className={cn(linkBtnBase, linkPrimary)}>
            Ir ao início
          </Link>
        </div>
      </Card>
    </div>
  );
}

import { Link, useLocation } from 'react-router-dom';
import { Home, LineChart, UsersRound } from 'lucide-react';

import { cn } from '@/lib/utils';

function normalizePath(path: string) {
  const trimmed = path.replace(/\/$/, '');
  return trimmed.length > 0 ? trimmed : '/';
}

export function DashboardSegmentNav() {
  const { pathname } = useLocation();
  const base = '/dashboard';
  const path = normalizePath(pathname);

  const activeHub = path === base;
  const activeGeral = path === `${base}/geral`;
  const activePorEmpilhadeirista = path === `${base}/por-empilhadeirista`;

  const pill = (active: boolean) =>
    cn(
      'inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-colors md:min-h-11 md:flex-1 md:gap-2 md:px-4',
      active
        ? 'bg-brand text-white shadow-sm'
        : 'border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900',
    );

  return (
    <nav
      className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
      aria-label="Visões do dashboard"
    >
      <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase sm:hidden">
        Visão
      </p>
      <div className="-mx-1 flex max-w-full gap-1 overflow-x-auto rounded-full border border-zinc-200 bg-zinc-100/60 p-1 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] md:mx-0 md:max-w-3xl md:flex-wrap md:overflow-visible md:pb-1 [&::-webkit-scrollbar]:hidden">
        <Link to={base} className={pill(activeHub)} replace={false}>
          <Home className="size-4 shrink-0 opacity-90" aria-hidden />
          <span>Início</span>
        </Link>
        <Link to={`${base}/geral`} className={pill(activeGeral)}>
          <LineChart className="size-4 shrink-0 opacity-90" aria-hidden />
          <span>Geral</span>
        </Link>
        <Link
          to={`${base}/por-empilhadeirista`}
          className={pill(activePorEmpilhadeirista)}
          title="Retiradas e entregas por empilhadeirista"
        >
          <UsersRound className="size-4 shrink-0 opacity-90" aria-hidden />
          <span className="truncate">Por operador</span>
        </Link>
      </div>
    </nav>
  );
}

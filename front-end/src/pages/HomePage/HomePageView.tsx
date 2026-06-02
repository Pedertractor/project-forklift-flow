import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { MACHINE_DOMAIN_ROLES } from '@/types/role.types';
import type { HomePageViewModel } from './useHomePage';

function isMachineDomainRole(role: string | undefined): boolean {
  return Boolean(
    role && (MACHINE_DOMAIN_ROLES as readonly string[]).includes(role),
  );
}

export function HomePageView({
  user,
  unitLabel,
  envApiUrl,
}: HomePageViewModel) {
  const showSupplyModule = isMachineDomainRole(user?.role);
  return (
    <main className="px-4 py-8 max-[800px]:px-3">
      <div className="mx-auto w-full max-w-5xl">
        <header className="mb-6 flex flex-col gap-2 border-b border-zinc-200 pb-6 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-4">
          <div>
            <h1 className="m-0 text-2xl font-bold tracking-tight text-zinc-900">
              Início
            </h1>
            <p className="mt-1.5 text-sm text-zinc-600">
              Visão geral do ambiente. Use o menu à esquerda para navegar; os
              módulos de armazém e empilhadeira serão adicionados aqui conforme
              o roadmap.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:self-end">
            <Link
              to="/dashboard"
              className="inline-flex h-[var(--control-height,2.5rem)] shrink-0 items-center justify-center rounded-xl border-2 border-transparent bg-brand px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-hover focus-visible:border-brand focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand/40"
            >
              Abrir painel
            </Link>
            <Link
              to="/cadastro/tipos-maquina"
              className="inline-flex h-[var(--control-height,2.5rem)] shrink-0 items-center justify-center rounded-xl border-2 border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-900 shadow-sm transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand/25"
            >
              Tipos de máquina
            </Link>
            <Link
              to="/cadastro/maquinas"
              className="inline-flex h-[var(--control-height,2.5rem)] shrink-0 items-center justify-center rounded-xl border-2 border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-900 shadow-sm transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand/25"
            >
              Máquinas de produção
            </Link>
          </div>
        </header>

        <div className=" gap-4">
          <Card className="border border-zinc-200 p-5 shadow-sm">
            <h2 className="m-0 text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Sua sessão
            </h2>
            {user ? (
              <dl className="mt-4 space-y-3 text-sm">
                <div>
                  <dt className="text-xs font-medium text-zinc-500">Nome</dt>
                  <dd className="mt-0.5 font-medium text-zinc-900">
                    {user.name}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-zinc-500">Cartão</dt>
                  <dd className="mt-0.5 font-mono text-zinc-900">
                    {user.cardNumber}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-zinc-500">Unidade</dt>
                  <dd className="mt-0.5 font-medium text-zinc-900">
                    {unitLabel(user.unit)}
                  </dd>
                </div>
                {user.role ? (
                  <div>
                    <dt className="text-xs font-medium text-zinc-500">Papel</dt>
                    <dd className="mt-0.5 font-medium text-zinc-900">
                      {user.role}
                    </dd>
                  </div>
                ) : null}
              </dl>
            ) : (
              <p className="mt-4 text-sm text-zinc-600">
                Nenhum usuário carregado.
              </p>
            )}
          </Card>
        </div>

        {showSupplyModule ? (
          <Card className="mt-4 border border-zinc-200 p-5 shadow-sm">
            <h2 className="m-0 text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Abastecimento e cadastro de chão
            </h2>
            <p className="mt-2 mb-0 text-sm text-zinc-600">
              Atalhos do operador de abastecimento (solicitações e preparo).
              Cadastro de equipamentos de movimentação: líder e administrador.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                to="/abastecimento/preparo-pendente"
                className="inline-flex h-[var(--control-height,2.5rem)] shrink-0 items-center justify-center rounded-xl border-2 border-transparent bg-brand px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand/40"
              >
                Preparo pendente
              </Link>
              <Link
                to="/abastecimento/solicitacoes"
                className="inline-flex h-[var(--control-height,2.5rem)] shrink-0 items-center justify-center rounded-xl border-2 border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-900 shadow-sm transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand/25"
              >
                Solicitações
              </Link>
            </div>
          </Card>
        ) : null}
      </div>
    </main>
  );
}

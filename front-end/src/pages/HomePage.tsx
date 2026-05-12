import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { useAuthStore } from '@/store/auth.store';
import type { AppUnit } from '@/types/user.types';

function unitLabel(unit: AppUnit): string {
  return unit === 'pedertractor' ? 'PEDERTRACTOR' : 'TRACTOR';
}

export function HomePage() {
  const user = useAuthStore((s) => s.user);

  return (
    <main className="px-4 py-8 max-[800px]:px-3">
      <div className="mx-auto w-full max-w-5xl">
        <header className="mb-6 flex flex-col gap-2 border-b border-zinc-200 pb-6 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-4">
          <div>
            <h1 className="m-0 text-2xl font-bold tracking-tight text-zinc-900">Início</h1>
            <p className="mt-1.5 text-sm text-zinc-600">
              Visão geral do ambiente. Use o menu à esquerda para navegar; os módulos de armazém e
              empilhadeira serão adicionados aqui conforme o roadmap.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:self-end">
            <Link
              to="/dashboard"
              className="inline-flex h-[var(--control-height,2.5rem)] shrink-0 items-center justify-center rounded-xl border-2 border-transparent bg-[#005fb8] px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#004a94] focus-visible:border-[#005fb8] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#005fb8]/40"
            >
              Abrir painel
            </Link>
            <Link
              to="/cadastro/tipos-maquina"
              className="inline-flex h-[var(--control-height,2.5rem)] shrink-0 items-center justify-center rounded-xl border-2 border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-900 shadow-sm transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#005fb8]/25"
            >
              Tipos de máquina
            </Link>
            <Link
              to="/cadastro/maquinas"
              className="inline-flex h-[var(--control-height,2.5rem)] shrink-0 items-center justify-center rounded-xl border-2 border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-900 shadow-sm transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#005fb8]/25"
            >
              Máquinas
            </Link>
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="border border-zinc-200 p-5 shadow-sm">
            <h2 className="m-0 text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Sua sessão
            </h2>
            {user ? (
              <dl className="mt-4 space-y-3 text-sm">
                <div>
                  <dt className="text-xs font-medium text-zinc-500">Nome</dt>
                  <dd className="mt-0.5 font-medium text-zinc-900">{user.name}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-zinc-500">Cartão</dt>
                  <dd className="mt-0.5 font-mono text-zinc-900">{user.cardNumber}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-zinc-500">Unidade</dt>
                  <dd className="mt-0.5 font-medium text-zinc-900">{unitLabel(user.unit)}</dd>
                </div>
              </dl>
            ) : (
              <p className="mt-4 text-sm text-zinc-600">Nenhum usuário carregado.</p>
            )}
          </Card>

          <Card className="border border-zinc-200 p-5 shadow-sm">
            <h2 className="m-0 text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Ambiente
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-zinc-600">
              Configure <code className="rounded-md bg-zinc-100 px-1.5 py-0.5 font-mono text-xs text-zinc-800">VITE_API_URL</code>{' '}
              no <code className="font-mono text-xs">.env</code> para autenticação real. Sem essa variável, o login
              continua em modo demonstração (usuário local).
            </p>
          </Card>
        </div>
      </div>
    </main>
  );
}

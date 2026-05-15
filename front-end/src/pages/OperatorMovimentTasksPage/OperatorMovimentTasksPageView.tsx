import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { ENV } from '@/constants/env';
import { movimentTypeLabel } from '@/utils/operator-moviment-display';
import { OPERATOR_MOVIMENT_TASKS_QUEUE_PATH } from '@/constants/operator-moviment-routes';
import { OpenTasksFlowSection } from './OpenTasksFlowSection';
import type { OperatorMovimentTasksPageViewModel } from './useOperatorMovimentTasksPage';

const linkOutlineClass =
  'inline-flex h-[var(--control-height,2.5rem)] shrink-0 items-center justify-center rounded-xl border-2 border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-900 shadow-sm transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#005fb8]/25';

export function OperatorMovimentTasksPageView(vm: OperatorMovimentTasksPageViewModel) {
  const {
    token,
    currentPallet,
    myPalletQuery,
    myTasksQuery,
    openTasks,
    completeDeliverMut,
    completePickupMut,
    busy,
  } = vm;

  const bound = currentPallet !== null;

  return (
    <main className="px-4 py-8 max-[800px]:px-3">
      <div className="mx-auto w-full max-w-6xl">
        <header className="mb-6 flex flex-col gap-4 border-b border-zinc-200 pb-6 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <div>
            <h1 className="m-0 text-2xl font-bold tracking-tight text-zinc-900">Minhas tarefas</h1>
            <p className="mt-1.5 text-sm text-zinc-600">
              Tarefas atribuídas ao seu equipamento. Conclua cada etapa antes de aceitar novas na fila.
            </p>
          </div>
          <Link to={OPERATOR_MOVIMENT_TASKS_QUEUE_PATH} className={linkOutlineClass}>
            Ir para tarefas disponíveis
          </Link>
        </header>

        {!ENV.API_URL ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Defina <code className="font-mono">VITE_API_URL</code> e faça login.
          </p>
        ) : !token ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Faça login para ver suas tarefas.
          </p>
        ) : null}

        <Card className="mt-6 border border-zinc-200 p-5 shadow-sm">
          <h2 className="m-0 text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Equipamento
          </h2>
          {myPalletQuery.isLoading ? (
            <p className="mt-3 text-sm text-zinc-600">Carregando…</p>
          ) : !bound ? (
            <p className="mt-3 text-sm text-zinc-600">
              Nenhum equipamento vinculado.{' '}
              <Link
                to={OPERATOR_MOVIMENT_TASKS_QUEUE_PATH}
                className="font-semibold text-[#005fb8] underline underline-offset-2"
              >
                Escolha um equipamento
              </Link>{' '}
              para receber tarefas.
            </p>
          ) : (
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium text-zinc-500">Código</dt>
                <dd className="mt-0.5 font-mono font-medium text-zinc-900">{currentPallet.code}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-zinc-500">Tipo</dt>
                <dd className="mt-0.5 font-medium text-zinc-900">
                  {movimentTypeLabel(currentPallet.type)}
                </dd>
              </div>
            </dl>
          )}
        </Card>

        {myTasksQuery.isError ? (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {myTasksQuery.error instanceof Error
              ? myTasksQuery.error.message
              : 'Erro ao carregar tarefas.'}
          </p>
        ) : null}

        <OpenTasksFlowSection
          openTasks={openTasks}
          isLoading={myTasksQuery.isLoading}
          bound={bound}
          busy={busy}
          completeDeliverMut={completeDeliverMut}
          completePickupMut={completePickupMut}
          emptyAction={
            <Link to={OPERATOR_MOVIMENT_TASKS_QUEUE_PATH} className={linkOutlineClass}>
              Aceitar nova tarefa
            </Link>
          }
        />
      </div>
    </main>
  );
}

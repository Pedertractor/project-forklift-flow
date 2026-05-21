import { Link } from 'react-router-dom';
import { ENV } from '@/constants/env';
import { OPERATOR_MOVIMENT_TASKS_QUEUE_PATH } from '@/constants/operator-moviment-routes';
import { OpenTasksFlowSection } from './OpenTasksFlowSection';
import type { OperatorMovimentTasksPageViewModel } from './useOperatorMovimentTasksPage';

const linkOutlineClass =
  'inline-flex h-[var(--control-height,2.5rem)] shrink-0 items-center justify-center rounded-xl border-2 border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-900 shadow-sm transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#005fb8]/25';

export function OperatorMovimentTasksPageView(
  vm: OperatorMovimentTasksPageViewModel,
) {
  const {
    token,
    currentPallet,
    myTasksQuery,
    tasks,
    completeDeliverMut,
    completePickupMut,
    busy,
  } = vm;

  const bound = currentPallet !== null;
  return (
    <main className="px-4 py-8 max-[800px]:px-3">
      <div className="mx-auto w-full max-w-6xl">
        {token ? (
          <header className="mb-6 border-b border-zinc-200 pb-4">
            <h1 className="m-0 text-2xl font-bold tracking-tight text-zinc-900">
              Minhas tarefas
            </h1>
            <p className="mt-1.5 text-sm text-zinc-600">
              Tarefas em andamento no equipamento vinculado a você. Novas
              atividades ficam na fila de tarefas.
            </p>
          </header>
        ) : null}
        {!ENV.API_URL ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Defina <code className="font-mono">VITE_API_URL</code> e faça login.
          </p>
        ) : !token ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Faça login para ver suas tarefas.
          </p>
        ) : null}

        {myTasksQuery.isError ? (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {myTasksQuery.error instanceof Error
              ? myTasksQuery.error.message
              : 'Erro ao carregar tarefas.'}
          </p>
        ) : null}

        <OpenTasksFlowSection
          tasks={tasks}
          myPalletId={currentPallet?.id ?? null}
          isLoading={myTasksQuery.isLoading}
          bound={bound}
          busy={busy}
          completeDeliverMut={completeDeliverMut}
          completePickupMut={completePickupMut}
          emptyAction={
            <Link
              to={OPERATOR_MOVIMENT_TASKS_QUEUE_PATH}
              className={linkOutlineClass}
            >
              Aceitar nova tarefa
            </Link>
          }
        />
      </div>
    </main>
  );
}

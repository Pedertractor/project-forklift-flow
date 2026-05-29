import { Link } from 'react-router-dom';
import { OperatorMovimentTaskEntryOverlay } from '@/components/operator-moviment/OperatorMovimentTaskEntryOverlay';
import { ENV } from '@/constants/env';
import { OPERATOR_MOVIMENT_TASKS_QUEUE_PATH } from '@/constants/operator-moviment-routes';
import { OpenTasksFlowSection } from './OpenTasksFlowSection';
import type { OperatorMovimentTasksPageViewModel } from './useOperatorMovimentTasksPage';

const linkOutlineClass =
  'inline-flex h-[var(--control-height,2.5rem)] shrink-0 items-center justify-center rounded-xl border-2 border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-900 shadow-sm transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand/25';

export function OperatorMovimentTasksPageView(
  vm: OperatorMovimentTasksPageViewModel,
) {
  const {
    token,
    userId,
    currentPallet,
    myTasksQuery,
    tasks,
    tasksLoading,
    showEntryOverlay,
    completeDeliverMut,
    completePickupMut,
    busy,
  } = vm;

  const bound = currentPallet !== null;
  return (
    <main className="relative px-4 py-8 max-[800px]:px-3">
      {showEntryOverlay ? (
        <OperatorMovimentTaskEntryOverlay message="Abrindo fluxo da tarefa…" />
      ) : null}
      <div className="mx-auto w-full max-w-6xl">
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
          myOperatorUserId={userId}
          isLoading={tasksLoading}
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

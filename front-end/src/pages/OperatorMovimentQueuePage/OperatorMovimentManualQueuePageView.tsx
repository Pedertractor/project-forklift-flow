import { Link } from 'react-router-dom';
import { ENV } from '@/constants/env';
import { OPERATOR_MOVIMENT_TASKS_QUEUE_PATH } from '@/constants/operator-moviment-routes';
import { OperatorMovimentManualQueueSection } from './OperatorMovimentManualQueueSection';
import type { OperatorMovimentManualQueuePageViewModel } from './useOperatorMovimentManualQueuePage';

const linkOutlineClass =
  'inline-flex h-[var(--control-height,2.5rem)] shrink-0 items-center justify-center rounded-xl border-2 border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-900 shadow-sm transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand/25';

export function OperatorMovimentManualQueuePageView(
  vm: OperatorMovimentManualQueuePageViewModel,
) {
  const {
    apiReady,
    token,
    queueQuery,
    queue,
    busy,
    pendingReplenishmentRequestId,
    pendingPickupTaskId,
    onAcceptReplenishment,
    onAcceptPickup,
  } = vm;

  return (
    <main className="px-4 py-8 max-[800px]:px-3">
      <div className="mx-auto w-full max-w-6xl">
        <header className="mb-6 flex flex-col gap-4 border-b border-zinc-200 pb-6 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <div></div>
          <Link
            to={OPERATOR_MOVIMENT_TASKS_QUEUE_PATH}
            className={linkOutlineClass}
          >
            Voltar às sugestões
          </Link>
        </header>

        {!ENV.API_URL ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Defina <code className="font-mono">VITE_API_URL</code> e faça login.
          </p>
        ) : !token ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Faça login para acessar as filas.
          </p>
        ) : null}

        {apiReady && token ? (
          <OperatorMovimentManualQueueSection
            queueQuery={queueQuery}
            deliverRows={queue.requests}
            pickupRows={queue.onMachinePickupTasks}
            busy={busy}
            pendingReplenishmentRequestId={pendingReplenishmentRequestId}
            pendingPickupTaskId={pendingPickupTaskId}
            onAcceptReplenishment={onAcceptReplenishment}
            onAcceptPickup={onAcceptPickup}
          />
        ) : null}
      </div>
    </main>
  );
}

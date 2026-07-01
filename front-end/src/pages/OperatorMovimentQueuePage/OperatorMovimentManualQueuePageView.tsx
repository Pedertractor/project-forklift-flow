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
    <main className="relative min-w-0 px-3 py-4 pb-6 md:px-4 md:py-8 max-md:landscape:flex max-md:landscape:min-h-svh max-md:landscape:flex-col max-md:landscape:overflow-hidden max-md:landscape:py-2 max-md:landscape:pr-3">
      <div className="mx-auto w-full min-w-0 max-w-6xl max-md:landscape:flex max-md:landscape:min-h-0 max-md:landscape:flex-1 max-md:landscape:flex-col">
        <header className="mb-4 flex shrink-0 flex-col gap-3 border-b border-zinc-200 pb-4 max-md:landscape:mb-2 max-md:landscape:gap-2 max-md:landscape:pb-2 sm:flex-row sm:items-end sm:justify-between md:mb-6 md:pb-6">
          <div className="min-w-0">
            <h1 className="m-0 text-xl font-bold tracking-tight text-zinc-900 max-md:landscape:text-base md:text-2xl">
              Atividades avulsas
            </h1>
            <p className="mt-1 text-sm text-zinc-600 max-md:landscape:mt-0.5 max-md:landscape:text-xs">
              Aceite entregas e retiradas disponíveis na fila manual.
            </p>
          </div>
          <Link
            to={OPERATOR_MOVIMENT_TASKS_QUEUE_PATH}
            className={`${linkOutlineClass} max-md:landscape:h-8 max-md:landscape:px-3 max-md:landscape:text-xs`}
          >
            Voltar às sugestões
          </Link>
        </header>

        {!ENV.API_URL ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Defina <code className="font-mono">VITE_BASE_URL_API</code> e faça login.
          </p>
        ) : !token ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Faça login para acessar as filas.
          </p>
        ) : null}

        {apiReady && token ? (
          <section
            className="min-w-0 max-md:landscape:flex max-md:landscape:min-h-0 max-md:landscape:flex-1 max-md:landscape:flex-col"
            aria-label="Atividades avulsas"
          >
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
          </section>
        ) : null}
      </div>
    </main>
  );
}

import { ChevronDown, List, Loader2, Repeat, RouteOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/brand-button';
import { cn } from '@/lib/utils';
import { ENV } from '@/constants/env';
import { OPERATOR_MOVIMENT_MANUAL_QUEUE_PATH } from '@/constants/operator-moviment-routes';
import {
  movimentTypeLabel,
  movimentTypePublicIconPath,
} from '@/utils/operator-moviment-display';
import { TripSuggestionsFlowSection } from './TripSuggestionsFlowSection';
import type { OperatorMovimentQueuePageViewModel } from './useOperatorMovimentQueuePage';
import AccordionLoader from '@/components/accordionLoader/accordion-loader';

const linkOutlineClass =
  'inline-flex h-[var(--control-height,2.5rem)] w-full min-w-0 items-center justify-center gap-2 rounded-xl border-2 border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-900 shadow-sm transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand/25 md:w-auto md:shrink-0';

export function OperatorMovimentQueuePageView(
  vm: OperatorMovimentQueuePageViewModel,
) {
  const {
    apiReady,
    token,
    currentPallet,
    tripSuggestionsQuery,
    manualQueueActivityCount,
    pendingTripSuggestionId,
    pendingStandalonePickupTaskId,
    pendingStandaloneDeliverKey,
    busy,
    showAcceptTransitionOverlay,
    onAcceptTrip,
    onAcceptStandalonePickup,
    onAcceptStandaloneDeliver,
    goToEquipment,
  } = vm;

  return (
    <main className="relative min-w-0 px-3 py-4 pb-6 md:px-4 md:py-8 phone-landscape:flex phone-landscape:min-h-svh phone-landscape:flex-col phone-landscape:overflow-hidden phone-landscape:py-2 phone-landscape:pr-3">
      {showAcceptTransitionOverlay ? (
        <div
          className="fixed inset-0 z-100 flex flex-col items-center justify-center gap-3 bg-white/85 backdrop-blur-sm"
          role="status"
          aria-live="polite"
          aria-label="Abrindo atividade"
        >
          <AccordionLoader  />
          <p className="m-0 text-sm font-medium text-zinc-700"></p>
        </div>
      ) : null}

      {currentPallet && token ? (
        <button
          type="button"
          className="fixed bottom-15 left-2 z-[45] hidden size-11 items-center justify-center rounded-full border border-zinc-200/80 bg-white/95 text-brand shadow-lg backdrop-blur-sm transition-colors hover:bg-brand/10 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand/25 phone-landscape:inline-flex"
          onClick={goToEquipment}
          aria-label="Trocar equipamento"
        >
          <Repeat className="size-5 shrink-0" aria-hidden />
        </button>
      ) : null}

      <div className="mx-auto w-full min-w-0 max-w-6xl phone-landscape:flex phone-landscape:min-h-0 phone-landscape:flex-1 phone-landscape:flex-col">
        {!ENV.API_URL ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900 md:px-4 md:py-3">
            Defina <code className="font-mono">VITE_BASE_URL_API</code> e faça login.
          </p>
        ) : !token ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900 md:px-4 md:py-3">
            Faça login para acessar as tarefas.
          </p>
        ) : null}

        <div className="mb-4 flex min-w-0 flex-col gap-3 phone-landscape:hidden md:mb-6 sm:flex-row sm:items-start sm:justify-between">
          {currentPallet ? (
            <details className="group min-w-0 flex-1 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
              <summary
                className={cn(
                  'flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 md:gap-3 md:px-4 md:py-3',
                  '[&::-webkit-details-marker]:hidden',
                )}
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <img
                    src={movimentTypePublicIconPath(currentPallet.type)}
                    alt=""
                    className="h-9 w-auto max-w-18 shrink-0 object-contain"
                    width={72}
                    height={36}
                  />
                  <div className="min-w-0 text-left">
                    <p className="m-0 text-[0.625rem] font-semibold uppercase tracking-wide text-zinc-500">
                      Equipamento ativo
                    </p>
                    <p className="m-0 truncate font-mono text-sm font-bold text-zinc-900">
                      {currentPallet.code}
                    </p>
                    <p className="m-0 text-xs text-zinc-600">
                      {movimentTypeLabel(currentPallet.type)}
                    </p>
                  </div>
                </div>
                <ChevronDown
                  className="size-5 shrink-0 text-zinc-500 transition-transform duration-200 group-open:rotate-180"
                  aria-hidden
                />
              </summary>

              <div className="border-t border-zinc-100 px-3 pb-3 pt-2.5 md:px-4 md:pb-4 md:pt-3">
                <dl className="m-0 grid gap-2.5 text-sm sm:grid-cols-2 md:gap-3">
                  <div>
                    <dt className="text-xs font-medium text-zinc-500">
                      Código
                    </dt>
                    <dd className="mt-0.5 font-mono font-semibold text-zinc-900">
                      {currentPallet.code}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-zinc-500">Tipo</dt>
                    <dd className="mt-0.5 font-medium text-zinc-900">
                      {movimentTypeLabel(currentPallet.type)}
                    </dd>
                  </div>
                </dl>
                <Button
                  type="button"
                  className="mt-4 w-full gap-2 sm:w-auto"
                  onClick={goToEquipment}
                >
                  <Repeat className="size-4 shrink-0" aria-hidden />
                  Trocar equipamento
                </Button>
              </div>
            </details>
          ) : (
            <div className="min-w-0 flex-1" />
          )}

          {/* {apiReady && token ? (
            <Link
              to={OPERATOR_MOVIMENT_MANUAL_QUEUE_PATH}
              className={linkOutlineClass}
            >
              <List className="size-4 shrink-0" aria-hidden />
              Filas manuais
            </Link>
          ) : null} */}
        </div>

        {apiReady && token ? (
          <TripSuggestionsFlowSection
            tripQuery={tripSuggestionsQuery}
            bound
            busy={busy}
            pendingTripSuggestionId={pendingTripSuggestionId}
            pendingStandalonePickupTaskId={pendingStandalonePickupTaskId}
            pendingStandaloneDeliverKey={pendingStandaloneDeliverKey}
            onAcceptTrip={onAcceptTrip}
            onAcceptStandalonePickup={onAcceptStandalonePickup}
            onAcceptStandaloneDeliver={onAcceptStandaloneDeliver}
          />
        ) : null}
        {tripSuggestionsQuery.data?.suggestions.length === 0 &&
        tripSuggestionsQuery.data?.standalonePickupTasks.length === 0 &&
        (tripSuggestionsQuery.data?.standaloneDeliverTasks?.length ?? 0) ===
          0 ? (
          <div className="mt-4 flex w-full min-w-0 flex-col items-stretch justify-center gap-3 rounded-xl border border-zinc-200 bg-white p-3 md:mt-6 md:items-center md:p-4">
            <div className="flex flex-col items-center justify-center">
              <RouteOff className="size-10 text-blue-500" />
              <p className="m-0 text-center text-sm text-zinc-600">
                Nenhuma atividade disponível no momento. Use as filas manuais se
                houver outras tarefas pendentes.
              </p>
            </div>

            <Link
              to={OPERATOR_MOVIMENT_MANUAL_QUEUE_PATH}
              className={linkOutlineClass}
            >
              <List className="size-4 shrink-0" aria-hidden />
              Filas manuais
              <span
                className="inline-flex min-w-[1.25rem] items-center justify-center rounded-md bg-brand px-1.5 py-0.5 text-xs font-bold tabular-nums text-white"
                aria-label={`${manualQueueActivityCount} atividades na fila manual`}
              >
                {manualQueueActivityCount}
              </span>
            </Link>
          </div>
        ) : null}
      </div>
    </main>
  );
}

import { ChevronDown, List, Repeat, RouteOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { OperatorMovimentTaskEntryOverlay } from '@/components/operator-moviment/OperatorMovimentTaskEntryOverlay';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { ENV } from '@/constants/env';
import { OPERATOR_MOVIMENT_MANUAL_QUEUE_PATH } from '@/constants/operator-moviment-routes';
import {
  movimentTypeLabel,
  movimentTypePublicIconPath,
} from '@/utils/operator-moviment-display';
import { TripSuggestionsFlowSection } from './TripSuggestionsFlowSection';
import type { OperatorMovimentQueuePageViewModel } from './useOperatorMovimentQueuePage';

const linkOutlineClass =
  'inline-flex h-[var(--control-height,2.5rem)] shrink-0 items-center justify-center gap-2 rounded-xl border-2 border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-900 shadow-sm transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand/25';

export function OperatorMovimentQueuePageView(
  vm: OperatorMovimentQueuePageViewModel,
) {
  const {
    apiReady,
    token,
    currentPallet,
    acceptPickupMut,
    acceptTripMut,
    acceptDeliverMut,
    tripSuggestionsQuery,
    manualQueueActivityCount,
    pendingTripSuggestionId,
    pendingStandalonePickupTaskId,
    pendingStandaloneDeliverKey,
    busy,
    goToEquipment,
  } = vm;

  return (
    <main className="relative px-4 py-8 max-[800px]:px-3">
      {busy ? (
        <OperatorMovimentTaskEntryOverlay message="Aceitando e abrindo tarefa…" />
      ) : null}
      <div className="mx-auto w-full max-w-6xl">
        {!ENV.API_URL ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Defina <code className="font-mono">VITE_API_URL</code> e faça login.
          </p>
        ) : !token ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Faça login para acessar as tarefas.
          </p>
        ) : null}

        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          {currentPallet ? (
            <details className="group min-w-0 flex-1 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
              <summary
                className={cn(
                  'flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3',
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

              <div className="border-t border-zinc-100 px-4 pb-4 pt-3">
                <dl className="m-0 grid gap-3 text-sm sm:grid-cols-2">
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
                  variant="outline"
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
            onAcceptTrip={(id) => acceptTripMut.mutate(id)}
            onAcceptStandalonePickup={(id) => acceptPickupMut.mutate(id)}
            onAcceptStandaloneDeliver={(row) => acceptDeliverMut.mutate(row)}
          />
        ) : null}
        {tripSuggestionsQuery.data?.suggestions.length === 0 &&
        tripSuggestionsQuery.data?.standalonePickupTasks.length === 0 &&
        (tripSuggestionsQuery.data?.standaloneDeliverTasks?.length ?? 0) ===
          0 ? (
          <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-zinc-200 bg-white p-4 gap-3">
            <RouteOff className="size-10 text-blue-500" />
            <p className="m-0 text-center text-sm text-zinc-600">
              Nenhuma sugestão de rota disponível. Acesse as filas manuais para
              aceitar tarefas.
            </p>
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

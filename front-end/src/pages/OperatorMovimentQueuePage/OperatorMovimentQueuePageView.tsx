import { ArrowDownLeft, ArrowUpRight, Repeat } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  expeditionAreaDetail,
  machineLocationDetail,
  prismaDetail,
  receivingAreaDetail,
} from '@/components/operator-moviment/route-flow-step-details';
import {
  SuggestionFlowConnector,
  SuggestionFlowStep,
} from '@/components/operator-moviment/route-flow-icons';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/card';
import { ENV } from '@/constants/env';
import { OPERATOR_MOVIMENT_MY_TASKS_PATH } from '@/constants/operator-moviment-routes';
import type {
  OperatorPickupTaskQueueItem,
  OperatorReplenishmentRequestItem,
} from '@/types/operator-moviment-pallet.types';
import {
  formatTaskDate,
  movimentTypeLabel,
  movimentTypePublicIconPath,
  priorityLabel,
} from '@/utils/operator-moviment-display';
import { TripSuggestionsFlowSection } from './TripSuggestionsFlowSection';
import type { OperatorMovimentQueuePageViewModel } from './useOperatorMovimentQueuePage';

function DeliverRequestFlow({
  row,
}: {
  row: OperatorReplenishmentRequestItem;
}) {
  return (
    <div className="flex w-full min-w-0 items-start overflow-x-auto pb-0.5 pt-0 [-webkit-overflow-scrolling:touch]">
      <SuggestionFlowStep
        size="compact"
        stepId="receiving"
        label="Recebimento"
        details={[
          receivingAreaDetail(),
          prismaDetail(row.movementCube, 'pick-at-receiving'),
        ]}
        accent="start"
      />
      <SuggestionFlowConnector size="compact" />
      <SuggestionFlowStep
        size="compact"
        stepId="machine"
        label="Máquina"
        details={[
          machineLocationDetail(
            row.destination.name,
            row.destination.position,
          ),
          prismaDetail(row.movementCube, 'deliver-to-machine'),
        ]}
        accent="mid"
      />
    </div>
  );
}

function PickupTaskFlow({ task }: { task: OperatorPickupTaskQueueItem }) {
  const req = task.request;
  return (
    <div className="flex w-full min-w-0 items-start overflow-x-auto pb-0.5 pt-0 [-webkit-overflow-scrolling:touch]">
      <SuggestionFlowStep
        size="compact"
        stepId="machine"
        label="Máquina"
        details={[
          machineLocationDetail(
            req.destination.name,
            req.destination.position,
          ),
          prismaDetail(req.movementCube, 'pick-at-machine'),
        ]}
        accent="mid"
      />
      <SuggestionFlowConnector size="compact" />
      <SuggestionFlowStep
        size="compact"
        stepId="expedition"
        label="Expedição"
        details={[
          expeditionAreaDetail(),
          prismaDetail(req.movementCube, 'carry-to-expedition'),
        ]}
        accent="end"
      />
    </div>
  );
}

const linkOutlineClass =
  'inline-flex h-[var(--control-height,2.5rem)] shrink-0 items-center justify-center rounded-xl border-2 border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-900 shadow-sm transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#005fb8]/25';

export function OperatorMovimentQueuePageView(
  vm: OperatorMovimentQueuePageViewModel,
) {
  const {
    apiReady,
    token,
    currentPallet,
    queueQuery,
    queue,
    acceptReplenishmentMut,
    acceptPickupMut,
    acceptTripMut,
    tripSuggestionsQuery,
    pendingTripSuggestionId,
    pendingStandalonePickupTaskId,
    busy,
    goToEquipment,
  } = vm;

  const deliverRows = queue.requests;
  const pickupRows = queue.onMachinePickupTasks;

  return (
    <main className="px-4 py-8 max-[800px]:px-3">
      <div className="mx-auto w-full max-w-6xl">
        <header className="mb-6 flex flex-col gap-4 border-b border-zinc-200 pb-6 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <div>
            <h1 className="m-0 text-2xl font-bold tracking-tight text-zinc-900">
              Tarefas disponíveis
            </h1>
            <p className="mt-1.5 text-sm text-zinc-600">
              Sugestões de rota e fila para aceitar. Após aceitar, conclua em
              Minhas tarefas.
            </p>
          </div>
          <Link
            to={OPERATOR_MOVIMENT_MY_TASKS_PATH}
            className={linkOutlineClass}
          >
            Minhas tarefas
          </Link>
        </header>

        {!ENV.API_URL ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Defina <code className="font-mono">VITE_API_URL</code> e faça login.
          </p>
        ) : !token ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Faça login para acessar as tarefas.
          </p>
        ) : null}

        {currentPallet ? (
          <Card className="mb-6 flex flex-col gap-3 border border-zinc-200 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <dl className="m-0 grid gap-2 text-sm sm:grid-cols-3 sm:gap-3">
              <div className="min-w-0">
                <img
                  src={movimentTypePublicIconPath(currentPallet.type)}
                  alt=""
                  className="h-10 w-auto max-w-[min(100%,9rem)] object-contain"
                  width={144}
                  height={64}
                />
              </div>
              <div>
                <dt className="text-xs font-medium text-zinc-500">
                  Equipamento
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
              className="shrink-0 gap-2"
              onClick={goToEquipment}
            >
              <Repeat className="size-4 shrink-0" aria-hidden />
              Trocar equipamento
            </Button>
          </Card>
        ) : null}

        {apiReady && token ? (
          <TripSuggestionsFlowSection
            tripQuery={tripSuggestionsQuery}
            bound
            busy={busy}
            pendingTripSuggestionId={pendingTripSuggestionId}
            pendingStandalonePickupTaskId={pendingStandalonePickupTaskId}
            onAcceptTrip={(id) => acceptTripMut.mutate(id)}
            onAcceptStandalonePickup={(id) => acceptPickupMut.mutate(id)}
          />
        ) : null}

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <Card className="overflow-hidden border border-zinc-200 shadow-sm">
            <div className="border-b border-zinc-100 bg-zinc-50/90 px-3 py-2">
              <div className="flex items-center gap-2">
                <ArrowUpRight
                  className="size-4 shrink-0 bg-green-200 rounded-full"
                  aria-hidden
                />
                <h2 className="m-0 text-xs font-semibold text-zinc-800">
                  Entrega: recebimento → máquina
                </h2>
              </div>
            </div>
            {queueQuery.isError ? (
              <p className="p-4 text-sm text-red-700">
                {queueQuery.error instanceof Error
                  ? queueQuery.error.message
                  : 'Erro ao carregar fila.'}
              </p>
            ) : (
              <div className="p-2.5 sm:p-3">
                {queueQuery.isLoading ? (
                  <p className="py-4 text-center text-xs text-zinc-600">
                    Carregando…
                  </p>
                ) : null}
                {!queueQuery.isLoading && deliverRows.length === 0 ? (
                  <p className="py-4 text-center text-xs text-zinc-600">
                    Nenhuma solicitação disponível no momento.
                  </p>
                ) : null}
                <div className="space-y-2">
                  {deliverRows.map((row) => (
                    <div
                      key={row.id}
                      className="rounded-lg border border-zinc-200 bg-white p-2.5 shadow-sm sm:p-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <span className="rounded-full bg-zinc-900/90 px-2 py-px text-[0.625rem] font-semibold leading-tight text-white">
                          {priorityLabel(row.priorityLevel)}
                        </span>
                        <span className="text-[0.625rem] tabular-nums text-zinc-500">
                          {formatTaskDate(row.createdAt)}
                        </span>
                      </div>
                      <div className="mt-2">
                        <DeliverRequestFlow row={row} />
                      </div>
                      <p className="mt-2 text-[0.625rem] leading-snug text-zinc-600">
                        <span className="font-medium text-zinc-700">
                          Solic.
                        </span>{' '}
                        {row.requestedBy.name}
                      </p>
                      <div className="mt-2 flex justify-end border-t border-zinc-100 pt-2">
                        <Button
                          type="button"
                          className="h-7 px-2.5 text-[0.6875rem] font-semibold sm:h-8 sm:px-3"
                          disabled={busy}
                          onClick={() => acceptReplenishmentMut.mutate(row.id)}
                        >
                          Aceitar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          <Card className="overflow-hidden border border-zinc-200 shadow-sm">
            <div className="border-b border-zinc-100 bg-zinc-50/90 px-3 py-2">
              <div className="flex items-center gap-2 ">
                <ArrowDownLeft
                  className="size-4 shrink-0 bg-red-200 rounded-full"
                  aria-hidden
                />
                <h2 className="m-0 text-xs font-semibold text-zinc-800">
                  Retirada: máquina → expedição
                </h2>
              </div>
            </div>
            {queueQuery.isError ? (
              <p className="p-4 text-sm text-red-700">
                {queueQuery.error instanceof Error
                  ? queueQuery.error.message
                  : 'Erro ao carregar fila.'}
              </p>
            ) : (
              <div className="p-2.5 sm:p-3">
                {queueQuery.isLoading ? (
                  <p className="py-4 text-center text-xs text-zinc-600">
                    Carregando…
                  </p>
                ) : null}
                {!queueQuery.isLoading && pickupRows.length === 0 ? (
                  <p className="py-4 text-center text-xs text-zinc-600">
                    Nenhuma retirada disponível no momento.
                  </p>
                ) : null}
                <div className="space-y-2">
                  {pickupRows.map((task) => {
                    const req = task.request;
                    return (
                      <div
                        key={task.id}
                        className="rounded-lg border border-zinc-200 bg-white p-2.5 shadow-sm sm:p-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-1.5">
                          <span className="rounded-full bg-zinc-900/90 px-2 py-px text-[0.625rem] font-semibold leading-tight text-white">
                            {priorityLabel(req.priorityLevel)}
                          </span>
                          <span className="text-[0.625rem] tabular-nums text-zinc-500">
                            {formatTaskDate(task.createdAt)}
                          </span>
                        </div>
                        <div className="mt-2">
                          <PickupTaskFlow task={task} />
                        </div>
                        <div className="mt-2 flex justify-end border-t border-zinc-100 pt-2">
                          <Button
                            type="button"
                            className="h-7 px-2.5 text-[0.6875rem] font-semibold sm:h-8 sm:px-3"
                            disabled={busy}
                            onClick={() => acceptPickupMut.mutate(task.id)}
                          >
                            Aceitar
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </main>
  );
}

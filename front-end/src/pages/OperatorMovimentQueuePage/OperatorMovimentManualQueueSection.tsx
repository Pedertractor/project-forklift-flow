import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
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
import type {
  OperatorPickupTaskQueueItem,
  OperatorReplenishmentRequestItem,
} from '@/types/operator-moviment-pallet.types';
import { formatTaskDate, priorityLabel } from '@/utils/operator-moviment-display';
import type { UseQueryResult } from '@tanstack/react-query';
import type { OperatorReplenishmentQueueResponse } from '@/types/operator-moviment-pallet.types';

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

export interface OperatorMovimentManualQueueSectionProps {
  queueQuery: UseQueryResult<OperatorReplenishmentQueueResponse, Error>;
  deliverRows: OperatorReplenishmentRequestItem[];
  pickupRows: OperatorPickupTaskQueueItem[];
  busy: boolean;
  onAcceptReplenishment: (requestId: string) => void;
  onAcceptPickup: (taskId: string) => void;
}

export function OperatorMovimentManualQueueSection({
  queueQuery,
  deliverRows,
  pickupRows,
  busy,
  onAcceptReplenishment,
  onAcceptPickup,
}: OperatorMovimentManualQueueSectionProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="overflow-hidden border border-zinc-200 shadow-sm">
        <div className="border-b border-zinc-100 bg-zinc-50/90 px-3 py-2">
          <div className="flex items-center gap-2">
            <ArrowUpRight
              className="size-4 shrink-0 rounded-full bg-green-200"
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
                    <span className="font-medium text-zinc-700">Solic.</span>{' '}
                    {row.requestedBy.name}
                  </p>
                  <div className="mt-2 flex justify-end border-t border-zinc-100 pt-2">
                    <Button
                      type="button"
                      className="h-7 px-2.5 text-[0.6875rem] font-semibold sm:h-8 sm:px-3"
                      disabled={busy}
                      onClick={() => onAcceptReplenishment(row.id)}
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
          <div className="flex items-center gap-2">
            <ArrowDownLeft
              className="size-4 shrink-0 rounded-full bg-red-200"
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
                        onClick={() => onAcceptPickup(task.id)}
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
  );
}

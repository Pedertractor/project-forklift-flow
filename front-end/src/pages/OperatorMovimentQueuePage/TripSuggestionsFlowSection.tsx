import type { UseQueryResult } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/card';
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
import type {
  TripCombinedSuggestionApi,
  TripStandaloneDeliverApi,
  TripStandalonePickupApi,
  TripSuggestionsResponse,
} from '@/types/operator-moviment-pallet.types';
import { priorityLabel } from '@/utils/operator-moviment-display';

function CombinedRouteFlow({ row }: { row: TripCombinedSuggestionApi }) {
  const d1 = row.deliverTask.request.movementCube;
  const machine = row.machine;

  return (
    <div className="flex w-full min-w-0 items-start overflow-x-auto pb-2 pt-1 [-webkit-overflow-scrolling:touch]">
      <SuggestionFlowStep
        stepId="receiving"
        label="Recebimento"
        details={[receivingAreaDetail(), prismaDetail(d1, 'pick-at-receiving')]}
        accent="start"
      />
      <SuggestionFlowConnector />
      <SuggestionFlowStep
        stepId="machine"
        label="Entregar na máquina"
        details={[
          machineLocationDetail(machine.name, machine.position),
          prismaDetail(d1, 'deliver-to-machine'),
        ]}
        accent="mid"
      />
      <SuggestionFlowConnector />
      <SuggestionFlowStep
        stepId="pallet"
        label="Pallet na máquina"
        details={[machineLocationDetail(machine.name, machine.position)]}
        accent="mid"
      />
      <SuggestionFlowConnector />
      <SuggestionFlowStep
        stepId="expedition"
        label="Expedição"
        details={[expeditionAreaDetail()]}
        accent="end"
      />
    </div>
  );
}

function StandaloneDeliverFlow({ row }: { row: TripStandaloneDeliverApi }) {
  const cube =
    row.deliverTask?.request.movementCube ??
    row.suggestedOrder[0]?.movementCube ??
    '—';
  const machine = row.machine;

  return (
    <div className="flex w-full min-w-0 items-start overflow-x-auto pb-2 pt-1 [-webkit-overflow-scrolling:touch]">
      <SuggestionFlowStep
        stepId="receiving"
        label="Busque no recebimento"
        details={[
          receivingAreaDetail(),
          prismaDetail(cube, 'pick-at-receiving'),
        ]}
        accent="start"
      />
      <SuggestionFlowConnector />
      <SuggestionFlowStep
        stepId="machine"
        label="Entregue na máquina"
        details={[
          machineLocationDetail(machine.name, machine.position),
          prismaDetail(cube, 'deliver-to-machine'),
        ]}
        accent="end"
      />
    </div>
  );
}

function StandalonePickupFlow({ row }: { row: TripStandalonePickupApi }) {
  const machine = row.machine;

  return (
    <div className="flex w-full min-w-0 items-start overflow-x-auto pb-2 pt-1 [-webkit-overflow-scrolling:touch]">
      <SuggestionFlowStep
        stepId="machine"
        label="Retire na máquina"
        details={[machineLocationDetail(machine.name, machine.position)]}
        accent="mid"
      />
      <SuggestionFlowConnector />
      <SuggestionFlowStep
        stepId="expedition"
        label="Leve à expedição"
        details={[expeditionAreaDetail()]}
        accent="end"
      />
    </div>
  );
}

function CombinedRouteCard({
  row,
  bound,
  busy,
  isAcceptingThisTrip,
  onAcceptTrip,
}: {
  row: TripCombinedSuggestionApi;
  bound: boolean;
  busy: boolean;
  isAcceptingThisTrip: boolean;
  onAcceptTrip: (tripSuggestionId: string) => void;
}) {
  return (
    <Card
    // className={`relative overflow-hidden border-2 shadow-md ${
    //   row.deferRecommended
    //     ? 'border-amber-300/90 bg-gradient-to-br from-amber-50/95 via-white to-white'
    //     : 'border-[#005fb8]/35 bg-gradient-to-br from-[#005fb8]/[0.07] via-white to-white'
    // }`}
    >
      {row.deferRecommended ? (
        <div className="border-b border-amber-200/80 bg-amber-100/60 px-4 py-2 text-center text-xs font-medium text-amber-950">
          Existem itens mais urgentes no setor — avalie antes de seguir esta
          rota.
        </div>
      ) : null}
      <div className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="m-0 text-xs font-semibold uppercase tracking-wider text-[#005fb8]">
            Rota combinada sugerida
          </p>
          <span className="rounded-full bg-zinc-900/90 px-2.5 py-0.5 text-[0.6875rem] font-semibold text-white">
            Prioridade: {priorityLabel(row.effectivePriority)}
          </span>
        </div>
        <p className="mt-2 text-sm font-semibold text-zinc-900">
          Uma ida: recebimento → máquina → retirada → expedição.
        </p>
        <div className="mt-5">
          <CombinedRouteFlow row={row} />
        </div>
        <p className="mt-4 text-xs leading-relaxed text-zinc-600">
          {/* {row.message} */}
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="m-0 text-xs text-zinc-500">
            Ao aceitar, ambas as tarefas ficam no seu equipamento, na ordem
            acima.
          </p>
          <Button
            type="button"
            className="shrink-0 bg-[#005fb8] text-white hover:bg-[#004a94]"
            disabled={!bound || busy || isAcceptingThisTrip}
            onClick={() => onAcceptTrip(row.tripSuggestion.id)}
          >
            {isAcceptingThisTrip ? 'Aceitando…' : 'Aceitar rota sugerida'}
          </Button>
        </div>
      </div>
    </Card>
  );
}

function StandaloneDeliverRouteCard({
  row,
  bound,
  busy,
  isAcceptingThisDeliver,
  onAcceptDeliver,
}: {
  row: TripStandaloneDeliverApi;
  bound: boolean;
  busy: boolean;
  isAcceptingThisDeliver: boolean;
  onAcceptDeliver: (row: TripStandaloneDeliverApi) => void;
}) {
  return (
    <Card
      className={`overflow-hidden border-2 shadow-md ${
        row.deferRecommended
          ? 'border-amber-300/80 bg-amber-50/40'
          : 'border-zinc-200 bg-white'
      }`}
    >
      <div className="p-4 sm:p-5">
        <p className="m-0 text-xs font-semibold uppercase tracking-wider text-zinc-600">
          Sugestão de entrega
        </p>
        <p className="mt-2 text-sm font-semibold text-zinc-900">
          Levar prisma do recebimento até a máquina (sem retirada combinada).
        </p>
        <div className="mt-5">
          <StandaloneDeliverFlow row={row} />
        </div>
        <p className="mt-4 text-xs leading-relaxed text-zinc-600">
          {row.message}
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-[0.6875rem] font-semibold text-zinc-800">
            Prioridade: {priorityLabel(row.effectivePriority)}
          </span>
          <Button
            type="button"
            className="shrink-0 bg-[#005fb8] text-white hover:bg-[#004a94]"
            disabled={!bound || busy || isAcceptingThisDeliver}
            onClick={() => onAcceptDeliver(row)}
          >
            {isAcceptingThisDeliver ? 'Aceitando…' : 'Aceitar entrega sugerida'}
          </Button>
        </div>
      </div>
    </Card>
  );
}

function StandalonePickupRouteCard({
  row,
  bound,
  busy,
  taskId,
  isAcceptingThisPickup,
  onAcceptPickup,
}: {
  row: TripStandalonePickupApi;
  bound: boolean;
  busy: boolean;
  taskId: string;
  isAcceptingThisPickup: boolean;
  onAcceptPickup: (id: string) => void;
}) {
  return (
    <Card
      className={`overflow-hidden border-2 shadow-md ${
        row.deferRecommended
          ? 'border-amber-300/80 bg-amber-50/40'
          : 'border-zinc-200 bg-white'
      }`}
    >
      <div className="p-4 sm:p-5">
        <p className="m-0 text-xs font-semibold uppercase tracking-wider text-zinc-600">
          Sugestão de retirada
        </p>
        <p className="mt-2 text-sm font-semibold text-zinc-900">
          Retirada na máquina — levar o pallet à expedição.
        </p>
        <div className="mt-5">
          <StandalonePickupFlow row={row} />
        </div>
        <div className="mt-5 flex justify-end">
          <Button
            type="button"
            className="shrink-0 "
            disabled={!bound || busy || isAcceptingThisPickup}
            onClick={() => onAcceptPickup(taskId)}
          >
            {isAcceptingThisPickup ? 'Aceitando…' : 'Aceitar retirada sugerida'}
          </Button>
        </div>
      </div>
    </Card>
  );
}

type MainTripQueueItem =
  | {
      displayKind: 'combined';
      critical: boolean;
      sortAt: number;
      combined: TripCombinedSuggestionApi;
    }
  | {
      displayKind: 'deliver';
      critical: boolean;
      sortAt: number;
      deliver: TripStandaloneDeliverApi;
    }
  | {
      displayKind: 'pickup';
      critical: boolean;
      sortAt: number;
      pickup: TripStandalonePickupApi;
    };

function buildMainTripQueueItems(
  combined: TripCombinedSuggestionApi[],
  standaloneDelivers: TripStandaloneDeliverApi[],
  standalonePickups: TripStandalonePickupApi[],
): MainTripQueueItem[] {
  const items: MainTripQueueItem[] = [
    ...combined.map((row) => ({
      displayKind: 'combined' as const,
      critical: row.effectivePriority === 'VERY_HIGH',
      sortAt: Math.min(
        new Date(row.deliverTask.createdAt).getTime(),
        new Date(row.pickupTask.createdAt).getTime(),
      ),
      combined: row,
    })),
    ...standaloneDelivers.map((row) => ({
      displayKind: 'deliver' as const,
      critical: row.effectivePriority === 'VERY_HIGH',
      sortAt: new Date(row.deliverTask.createdAt).getTime(),
      deliver: row,
    })),
    ...standalonePickups.map((row) => ({
      displayKind: 'pickup' as const,
      critical: row.effectivePriority === 'VERY_HIGH',
      sortAt: new Date(row.pickupTask.createdAt).getTime(),
      pickup: row,
    })),
  ];

  return items.sort((a, b) => {
    if (a.critical !== b.critical) {
      return a.critical ? -1 : 1;
    }
    return a.sortAt - b.sortAt;
  });
}

export interface TripSuggestionsFlowSectionProps {
  tripQuery: UseQueryResult<TripSuggestionsResponse, Error>;
  bound: boolean;
  busy: boolean;
  pendingTripSuggestionId: string | null;
  pendingStandalonePickupTaskId: string | null;
  pendingStandaloneDeliverKey: string | null;
  onAcceptTrip: (tripSuggestionId: string) => void;
  onAcceptStandalonePickup: (taskId: string) => void;
  onAcceptStandaloneDeliver: (row: TripStandaloneDeliverApi) => void;
}

export function TripSuggestionsFlowSection({
  tripQuery,
  bound,
  busy,
  pendingTripSuggestionId,
  pendingStandalonePickupTaskId,
  pendingStandaloneDeliverKey,
  onAcceptTrip,
  onAcceptStandalonePickup,
  onAcceptStandaloneDeliver,
}: TripSuggestionsFlowSectionProps) {
  if (tripQuery.isError) {
    return (
      <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        {tripQuery.error instanceof Error
          ? tripQuery.error.message
          : 'Erro ao carregar sugestões de rota.'}
      </p>
    );
  }

  if (tripQuery.isLoading) {
    return (
      <p className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
        Carregando sugestões de rota…
      </p>
    );
  }

  const data = tripQuery.data;
  if (!data) {
    return null;
  }

  const combined = data.suggestions;
  const seenPickupIds = new Set<string>();
  const standalonePickups = data.standalonePickupTasks.filter((row) => {
    const id = row.pickupTask.id;
    if (seenPickupIds.has(id)) {
      return false;
    }
    seenPickupIds.add(id);
    return true;
  });
  const seenCombinedPickupIds = new Set(
    combined.map((row) => row.pickupTask.id),
  );
  const seenCombinedDeliverIds = new Set(
    combined.map((row) => row.deliverTask.id),
  );
  const standalonePickupsWithoutCombinedOverlap = standalonePickups.filter(
    (row) => !seenCombinedPickupIds.has(row.pickupTask.id),
  );
  const standaloneDelivers = (data.standaloneDeliverTasks ?? []).filter(
    (row) => {
      const deliverId = row.deliverTask?.id ?? row.requestId;
      return !seenCombinedDeliverIds.has(deliverId);
    },
  );
  const mainQueue = buildMainTripQueueItems(
    combined,
    standaloneDelivers,
    standalonePickupsWithoutCombinedOverlap,
  );

  if (mainQueue.length === 0) {
    return null;
  }

  return (
    <section
      className="mt-8 space-y-4"
      aria-labelledby="trip-suggestions-heading"
    >
      {!bound ? (
        <p className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
          Vincule-se a um equipamento para aceitar uma sugestão de rota.
        </p>
      ) : null}

      <div className="space-y-5">
        {mainQueue.map((item) => {
          if (item.displayKind === 'combined') {
            const row = item.combined;
            return (
              <CombinedRouteCard
                key={row.tripSuggestion.id}
                row={row}
                bound={bound}
                busy={busy}
                isAcceptingThisTrip={
                  pendingTripSuggestionId === row.tripSuggestion.id
                }
                onAcceptTrip={onAcceptTrip}
              />
            );
          }
          if (item.displayKind === 'deliver') {
            const row = item.deliver;
            const acceptKey = row.deliverTask?.id ?? `pool:${row.requestId}`;
            return (
              <StandaloneDeliverRouteCard
                key={`deliver-${row.machine.id}-${acceptKey}`}
                row={row}
                bound={bound}
                busy={busy}
                isAcceptingThisDeliver={
                  pendingStandaloneDeliverKey === acceptKey
                }
                onAcceptDeliver={onAcceptStandaloneDeliver}
              />
            );
          }
          const row = item.pickup;
          const taskId = row.pickupTask.id;
          return (
            <StandalonePickupRouteCard
              key={`pickup-${taskId}`}
              row={row}
              bound={bound}
              busy={busy}
              taskId={taskId}
              isAcceptingThisPickup={pendingStandalonePickupTaskId === taskId}
              onAcceptPickup={onAcceptStandalonePickup}
            />
          );
        })}
      </div>
    </section>
  );
}

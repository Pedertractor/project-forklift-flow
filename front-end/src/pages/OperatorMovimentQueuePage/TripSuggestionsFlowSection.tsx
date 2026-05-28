import type { UseQueryResult } from '@tanstack/react-query';

import {
  DeliverFlowAcceptButton,
  DeliverFlowActionFooter,
  DeliverFlowCard,
  DeliverFlowDeferBanner,
  DeliverThreeStepFlow,
  type DeliverFlowStepConfig,
} from '@/components/operator-moviment/deliver-three-step-flow';

import {
  expeditionAreaDetail,
  goToReceivingDetail,
  machineLocationDetail,
  prismaDetail,
  receivingAreaDetail,
} from '@/components/operator-moviment/route-flow-step-details';

import type {
  TripCombinedSuggestionApi,
  TripStandaloneDeliverApi,
  TripStandalonePickupApi,
  TripSuggestionsResponse,
} from '@/types/operator-moviment-pallet.types';

import { isCriticalPriority } from '@/utils/operator-moviment-display';

import { Check } from 'lucide-react';

function buildCombinedSteps(
  row: TripCombinedSuggestionApi,
): DeliverFlowStepConfig[] {
  const d1 = row.deliverTask.request.movementCube;

  const machine = row.machine;

  return [
    {
      stepNumber: 1,

      stepId: 'receiving',

      label: 'Recebimento',

      details: [receivingAreaDetail(), prismaDetail(d1, 'pick-at-receiving')],
    },

    {
      stepNumber: 2,

      stepId: 'machine',

      label: 'Entregue na máquina',

      details: [
        machineLocationDetail(machine.name),

        prismaDetail(d1, 'deliver-to-machine'),
      ],
    },

    {
      stepNumber: 3,

      stepId: 'pallet',

      label: 'Pallet na máquina',

      details: [machineLocationDetail(machine.name)],
    },

    {
      stepNumber: 4,

      stepId: 'expedition',

      label: 'Expedição',

      details: [expeditionAreaDetail()],
    },
  ];
}

function buildStandaloneDeliverSteps(
  row: TripStandaloneDeliverApi,
): DeliverFlowStepConfig[] {
  const cube =
    row.deliverTask?.request.movementCube ??
    row.suggestedOrder[0]?.movementCube ??
    null;

  const machine = row.machine;

  return [
    {
      stepNumber: 1,

      stepId: 'receiving',

      label: 'Vá ao recebimento',

      details: [goToReceivingDetail()],
    },

    {
      stepNumber: 2,

      stepId: 'pallet',

      label: 'Pegue o pallet no recebimento',

      details: [receivingAreaDetail(), prismaDetail(cube, 'pick-at-receiving')],
    },

    {
      stepNumber: 3,

      stepId: 'machine',

      label: 'Entregue o pallet na máquina',

      details: [
        machineLocationDetail(machine.name),

        prismaDetail(cube, 'deliver-to-machine'),
      ],
    },
  ];
}

function buildStandalonePickupSteps(
  row: TripStandalonePickupApi,
): DeliverFlowStepConfig[] {
  const machine = row.machine;

  return [
    {
      stepNumber: 1,

      stepId: 'machine',

      label: 'Retire na máquina',

      details: [machineLocationDetail(machine.name)],
    },

    {
      stepNumber: 2,

      stepId: 'expedition',

      label: 'Leve à expedição',

      details: [expeditionAreaDetail()],
    },
  ];
}

function SuggestionFlowCardBody({
  title,
  steps,
  message,
  hint,
}: {
  title?: string;
  steps: DeliverFlowStepConfig[];
  message?: string;
  hint?: string;
}) {
  return (
    <div className="px-5 py-4 sm:px-8">
      {title ? (
        <p className="mb-4 text-center text-xs font-semibold uppercase tracking-wider text-brand">
          {title}
        </p>
      ) : null}

      <DeliverThreeStepFlow steps={steps} />
      {message ? (
        <p className="mt-5 text-center text-xs leading-relaxed text-zinc-500">
          {message}
        </p>
      ) : null}
      {hint ? (
        <p className="mt-3 text-center text-xs leading-relaxed text-zinc-500">
          {hint}
        </p>
      ) : null}
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
  const isCritical = isCriticalPriority(row.effectivePriority);

  const steps = buildCombinedSteps(row);

  return (
    <DeliverFlowCard
      className={row.deferRecommended ? 'ring-2 ring-amber-300/80' : undefined}
      deferBanner={
        row.deferRecommended ? (
          <DeliverFlowDeferBanner>
            Existem itens mais urgentes no setor — avalie antes de seguir esta
            rota.
          </DeliverFlowDeferBanner>
        ) : undefined
      }
    >
      <SuggestionFlowCardBody
        title="Rota combinada sugerida"
        steps={steps}
        message={row.message}
      />

      <DeliverFlowActionFooter isCritical={isCritical}>
        <DeliverFlowAcceptButton
          disabled={!bound || busy || isAcceptingThisTrip}
          onClick={() => onAcceptTrip(row.tripSuggestion.id)}
        >
          {isAcceptingThisTrip ? (
            'Aceitando…'
          ) : (
            <>
              <Check className="size-5 shrink-0" aria-hidden />
              Aceitar rota sugerida
            </>
          )}
        </DeliverFlowAcceptButton>
      </DeliverFlowActionFooter>
    </DeliverFlowCard>
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
  const isCritical = isCriticalPriority(row.effectivePriority);

  const steps = buildStandaloneDeliverSteps(row);

  return (
    <DeliverFlowCard
      className={row.deferRecommended ? 'ring-2 ring-amber-300/80' : undefined}
      deferBanner={
        row.deferRecommended ? (
          <DeliverFlowDeferBanner>
            Existem itens mais urgentes no setor — avalie antes de aceitar esta
            entrega.
          </DeliverFlowDeferBanner>
        ) : undefined
      }
    >
      <SuggestionFlowCardBody steps={steps} message={row.message} />

      <DeliverFlowActionFooter isCritical={isCritical}>
        <DeliverFlowAcceptButton
          disabled={!bound || busy || isAcceptingThisDeliver}
          onClick={() => onAcceptDeliver(row)}
        >
          {isAcceptingThisDeliver ? (
            'Aceitando…'
          ) : (
            <>
              <Check className="size-5 shrink-0" aria-hidden />
              Aceitar entrega sugerida
            </>
          )}
        </DeliverFlowAcceptButton>
      </DeliverFlowActionFooter>
    </DeliverFlowCard>
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
  const isCritical = isCriticalPriority(row.effectivePriority);

  const steps = buildStandalonePickupSteps(row);

  return (
    <DeliverFlowCard
      className={row.deferRecommended ? 'ring-2 ring-amber-300/80' : undefined}
      deferBanner={
        row.deferRecommended ? (
          <DeliverFlowDeferBanner>
            Existem itens mais urgentes no setor — avalie antes de aceitar esta
            retirada.
          </DeliverFlowDeferBanner>
        ) : undefined
      }
    >
      <SuggestionFlowCardBody
        title="Sugestão de retirada"
        steps={steps}
        message={row.message}
      />

      <DeliverFlowActionFooter isCritical={isCritical}>
        <DeliverFlowAcceptButton
          disabled={!bound || busy || isAcceptingThisPickup}
          onClick={() => onAcceptPickup(taskId)}
        >
          {isAcceptingThisPickup ? (
            'Aceitando…'
          ) : (
            <>
              <Check className="size-5 shrink-0" aria-hidden />
              Aceitar retirada sugerida
            </>
          )}
        </DeliverFlowAcceptButton>
      </DeliverFlowActionFooter>
    </DeliverFlowCard>
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

      sortAt: row.deliverTask
        ? new Date(row.deliverTask.createdAt).getTime()
        : 0,

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

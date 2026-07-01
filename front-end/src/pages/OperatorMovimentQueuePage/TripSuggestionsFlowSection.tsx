import type { UseQueryResult } from '@tanstack/react-query';

import {
  DeliverFlowAcceptButton,
  DeliverFlowActionFooter,
  DeliverFlowActivitySubtitle,
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
  OperatorPickupTaskQueueItem,
  TripCombinedSuggestionApi,
  TripFlowStepApi,
  TripStandaloneDeliverApi,
  TripStandalonePickupApi,
  TripSuggestionsResponse,
} from '@/types/operator-moviment-pallet.types';

import { formatReplenishmentMovementCubeDisplay } from '@/constants/operator-machine-replenishment';
import { isCriticalPriority } from '@/utils/operator-moviment-display';
import {
  buildMainTripQueueItems,
  pickTopMainTripQueueItem,
  type MainTripQueueItem,
} from '@/utils/operator-moviment-trip-queue';

import { ArrowDownLeft, ArrowUpRight, Box, Check } from 'lucide-react';
import AccordionLoader from '@/components/accordionLoader/accordion-loader';

function resolveMovementCubeDisplay(
  deliverTask: OperatorPickupTaskQueueItem | null | undefined,
  suggestedOrder: TripFlowStepApi[],
): string | undefined {
  const cube =
    deliverTask?.request.movementCube ??
    suggestedOrder[0]?.movementCube ??
    null;

  return cube ? formatReplenishmentMovementCubeDisplay(cube) : undefined;
}

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

      label: 'Retire o pallet da máquina',

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

function AcceptButtonLabel({ accepting }: { accepting: boolean }) {
  return accepting ? (
    'Aceitando…'
  ) : (
    <>
      <Check className="size-5 shrink-0 phone-landscape:size-4" aria-hidden />
      Aceitar
    </>
  );
}

function formatSuggestionRequestedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function resolveSuggestionRequestedAtIso(
  deliverTask?: OperatorPickupTaskQueueItem | null,
  pickupTask?: OperatorPickupTaskQueueItem | null,
): string | undefined {
  const primary = deliverTask ?? pickupTask;
  if (!primary) {
    return undefined;
  }
  return primary.request?.createdAt ?? primary.createdAt;
}

function SuggestionFlowCardBody({
  activityLabel,
  title,
  steps,
  machineName,
  hint,
  cube,
  requestedAt,
}: {
  /** Subtítulo do tipo de operação (Entrega / Retirada / Rota combinada). */
  activityLabel?: 'Entrega' | 'Retirada' | 'Rota combinada';
  title?: string;
  isCritical?: boolean;
  steps: DeliverFlowStepConfig[];
  machineName?: string;
  hint?: string;
  cube?: string;
  /** ISO da solicitação (ex.: `request.createdAt` da tarefa). */
  requestedAt?: string;
}) {
  const requestedAtLabel = requestedAt
    ? formatSuggestionRequestedAt(requestedAt)
    : undefined;

  return (
    <div className="min-w-0 px-3 py-3 md:px-8 md:py-4 phone-landscape:flex phone-landscape:min-h-0 phone-landscape:flex-1 phone-landscape:flex-col phone-landscape:px-3 phone-landscape:py-2">
      {activityLabel ? (
        <div className="phone-landscape:shrink-0">
          <DeliverFlowActivitySubtitle
            start={
              <div className="inline-flex min-w-0 max-w-full flex-wrap items-center gap-x-1 gap-y-0.5 text-sm font-semibold uppercase tracking-wide text-brand phone-landscape:gap-x-1 phone-landscape:text-sm md:gap-x-1.5 md:text-xl md:tracking-wider">
                {machineName ? (
                  <span className="truncate">{machineName}</span>
                ) : null}
                {cube ? (
                  <>
                    {machineName ? (
                      <span className="shrink-0" aria-hidden>
                        -
                      </span>
                    ) : null}
                    <div className="flex items-center gap-0.5 rounded-lg bg-brand/20 px-1 py-0.5 phone-landscape:px-0.5 phone-landscape:py-0 md:gap-1 md:py-0">
                      <Box
                        strokeWidth={2.5}
                        className="size-3.5 shrink-0 text-brand phone-landscape:size-3 md:size-5"
                        aria-hidden
                      />
                      <span className="text-sm tracking-widest phone-landscape:text-sm md:text-xl">
                        {cube}
                      </span>
                    </div>
                  </>
                ) : null}
              </div>
            }
            end={
              requestedAtLabel ? (
                <time
                  dateTime={requestedAt}
                  className="whitespace-nowrap text-[10px] font-medium normal-case tracking-normal text-zinc-500 phone-landscape:text-[11px] sm:text-[11px] md:text-xs"
                >
                  {requestedAtLabel}
                </time>
              ) : null
            }
          >
            <span className="inline-flex items-center gap-1 text-[11px] leading-tight phone-landscape:gap-1 phone-landscape:text-[13px] sm:text-xs">
              {activityLabel === 'Entrega' ? (
                <>
                  Entrega de pallet
                  <ArrowUpRight
                    className="size-4 rounded-full bg-green-200 phone-landscape:size-3"
                    aria-hidden
                  />
                </>
              ) : activityLabel === 'Retirada' ? (
                <>
                  Retirada de pallet
                  <ArrowDownLeft
                    className="size-4 rounded-full bg-red-200 phone-landscape:size-3"
                    aria-hidden
                  />
                </>
              ) : (
                'Rota combinada'
              )}
            </span>
          </DeliverFlowActivitySubtitle>
        </div>
      ) : null}
      {title ? (
        <p className="mb-4 text-center text-xs font-semibold uppercase tracking-wider text-brand phone-landscape:mb-2 phone-landscape:text-sm phone-landscape:shrink-0">
          {title}
        </p>
      ) : null}

      <div className="w-full phone-landscape:flex phone-landscape:min-h-0 phone-landscape:flex-1">
        <DeliverThreeStepFlow steps={steps} />
      </div>
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
        isCritical={isCritical}
        activityLabel="Rota combinada"
        steps={steps}
        machineName={row.machine.name}
        cube={resolveMovementCubeDisplay(row.deliverTask, row.suggestedOrder)}
        requestedAt={resolveSuggestionRequestedAtIso(
          row.deliverTask,
          row.pickupTask,
        )}
      />

      <DeliverFlowActionFooter isCritical={isCritical}>
        <DeliverFlowAcceptButton
          intent="accept"
          disabled={!bound || busy || isAcceptingThisTrip}
          onClick={() => onAcceptTrip(row.tripSuggestion.id)}
        >
          <AcceptButtonLabel accepting={isAcceptingThisTrip} />
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
      <SuggestionFlowCardBody
        isCritical={isCritical}
        activityLabel="Entrega"
        steps={steps}
        machineName={row.machine.name}
        cube={resolveMovementCubeDisplay(row.deliverTask, row.suggestedOrder)}
        requestedAt={resolveSuggestionRequestedAtIso(row.deliverTask)}
      />

      <DeliverFlowActionFooter isCritical={isCritical}>
        <DeliverFlowAcceptButton
          intent="accept"
          disabled={!bound || busy || isAcceptingThisDeliver}
          onClick={() => onAcceptDeliver(row)}
        >
          <AcceptButtonLabel accepting={isAcceptingThisDeliver} />
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
        isCritical={isCritical}
        activityLabel="Retirada"
        steps={steps}
        machineName={row.machine.name}
        requestedAt={resolveSuggestionRequestedAtIso(undefined, row.pickupTask)}
      />

      <DeliverFlowActionFooter isCritical={isCritical}>
        <DeliverFlowAcceptButton
          intent="accept"
          disabled={!bound || busy || isAcceptingThisPickup}
          onClick={() => onAcceptPickup(taskId)}
        >
          <AcceptButtonLabel accepting={isAcceptingThisPickup} />
        </DeliverFlowAcceptButton>
      </DeliverFlowActionFooter>
    </DeliverFlowCard>
  );
}

function renderMainTripQueueItem(
  item: MainTripQueueItem,
  options: {
    bound: boolean;
    busy: boolean;
    pendingTripSuggestionId: string | null;
    pendingStandalonePickupTaskId: string | null;
    pendingStandaloneDeliverKey: string | null;
    onAcceptTrip: (tripSuggestionId: string) => void;
    onAcceptStandalonePickup: (taskId: string) => void;
    onAcceptStandaloneDeliver: (row: TripStandaloneDeliverApi) => void;
  },
) {
  const {
    bound,
    busy,
    pendingTripSuggestionId,
    pendingStandalonePickupTaskId,
    pendingStandaloneDeliverKey,
    onAcceptTrip,
    onAcceptStandalonePickup,
    onAcceptStandaloneDeliver,
  } = options;

  if (item.displayKind === 'combined') {
    const row = item.combined;
    return (
      <CombinedRouteCard
        key={row.tripSuggestion.id}
        row={row}
        bound={bound}
        busy={busy}
        isAcceptingThisTrip={pendingTripSuggestionId === row.tripSuggestion.id}
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
        isAcceptingThisDeliver={pendingStandaloneDeliverKey === acceptKey}
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
      <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800 md:px-4 md:py-3">
        {tripQuery.error instanceof Error
          ? tripQuery.error.message
          : 'Erro ao carregar sugestões de rota.'}
      </p>
    );
  }

  if (tripQuery.isLoading) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-8 md:px-4 md:py-10">
        <AccordionLoader />
      </div>
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
  const topSuggestion = pickTopMainTripQueueItem(mainQueue);

  if (!topSuggestion) {
    return null;
  }

  return (
    <section
      className="mt-4 min-w-0 space-y-3 phone-landscape:mt-0 phone-landscape:flex phone-landscape:min-h-0 phone-landscape:flex-1 phone-landscape:flex-col phone-landscape:space-y-0 md:mt-8 md:space-y-4"
      aria-labelledby="trip-suggestions-heading"
    >
      {!bound ? (
        <p className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-700 md:px-4 md:py-3">
          Vincule-se a um equipamento para aceitar uma sugestão de rota.
        </p>
      ) : null}

      <div className="flex min-w-0 flex-col gap-4 phone-landscape:min-h-0 phone-landscape:flex-1 md:gap-5">
        {renderMainTripQueueItem(topSuggestion, {
          bound,
          busy,
          pendingTripSuggestionId,
          pendingStandalonePickupTaskId,
          pendingStandaloneDeliverKey,
          onAcceptTrip,
          onAcceptStandalonePickup,
          onAcceptStandaloneDeliver,
        })}
      </div>
    </section>
  );
}

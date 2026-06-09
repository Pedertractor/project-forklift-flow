import {
  DeliverFlowAcceptButton,
  DeliverFlowActionFooter,
  DeliverFlowActivitySubtitle,
  DeliverFlowCard,
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
import AccordionLoader from '@/components/accordionLoader/accordion-loader';
import { formatReplenishmentMovementCubeDisplay } from '@/constants/operator-machine-replenishment';
import type {
  OperatorPickupTaskQueueItem,
  OperatorReplenishmentQueueResponse,
  OperatorReplenishmentRequestItem,
} from '@/types/operator-moviment-pallet.types';
import { isCriticalPriority } from '@/utils/operator-moviment-display';
import type { UseQueryResult } from '@tanstack/react-query';
import { ArrowDownLeft, ArrowUpRight, Box, Check } from 'lucide-react';

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

function AcceptButtonLabel({ accepting }: { accepting: boolean }) {
  return accepting ? (
    'Aceitando…'
  ) : (
    <>
      <Check className="size-5 shrink-0" aria-hidden />
      Aceitar
    </>
  );
}

function SuggestionFlowCardBody({
  activityLabel,
  steps,
  machineName,
  cube,
  requestedAt,
}: {
  activityLabel: 'Entrega' | 'Retirada';
  steps: DeliverFlowStepConfig[];
  machineName?: string;
  cube?: string;
  requestedAt?: string;
}) {
  const requestedAtLabel = requestedAt
    ? formatSuggestionRequestedAt(requestedAt)
    : undefined;

  return (
    <div className="min-w-0 px-3 py-3 md:px-8 md:py-4">
      <DeliverFlowActivitySubtitle
        start={
          <div className="inline-flex min-w-0 max-w-full flex-wrap items-center gap-x-1 gap-y-0.5 text-sm font-semibold uppercase tracking-wide text-brand md:gap-x-1.5 md:text-xl md:tracking-wider">
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
                <div className="flex items-center gap-0.5 rounded-lg bg-brand/20 px-1 py-0.5 md:gap-1 md:py-0">
                  <Box
                    strokeWidth={2.5}
                    className="size-3.5 shrink-0 text-brand md:size-5"
                    aria-hidden
                  />
                  <span className="text-sm tracking-widest md:text-xl">
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
              className="whitespace-nowrap text-[10px] font-medium normal-case tracking-normal text-zinc-500 sm:text-[11px] md:text-xs"
            >
              {requestedAtLabel}
            </time>
          ) : null
        }
      >
        <span className="inline-flex items-center gap-1 text-[11px] leading-tight sm:text-xs">
          {activityLabel === 'Entrega' ? (
            <>
              Entrega de pallet
              <ArrowUpRight
                className="size-4 rounded-full bg-green-200"
                aria-hidden
              />
            </>
          ) : (
            <>
              Retirada de pallet
              <ArrowDownLeft
                className="size-4 rounded-full bg-red-200"
                aria-hidden
              />
            </>
          )}
        </span>
      </DeliverFlowActivitySubtitle>

      <DeliverThreeStepFlow steps={steps} />
    </div>
  );
}

function buildManualDeliverSteps(
  row: OperatorReplenishmentRequestItem,
): DeliverFlowStepConfig[] {
  const machine = row.destination?.name ?? '—';

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
      details: [
        receivingAreaDetail(),
        prismaDetail(row.movementCube, 'pick-at-receiving'),
      ],
    },
    {
      stepNumber: 3,
      stepId: 'machine',
      label: 'Entregue o pallet na máquina',
      details: [
        machineLocationDetail(machine),
        prismaDetail(row.movementCube, 'deliver-to-machine'),
      ],
    },
  ];
}

function buildManualPickupSteps(
  task: OperatorPickupTaskQueueItem,
): DeliverFlowStepConfig[] {
  const machine = task.request.destination?.name ?? '—';

  return [
    {
      stepNumber: 1,
      stepId: 'machine',
      label: 'Retire na máquina',
      details: [machineLocationDetail(machine)],
    },
    {
      stepNumber: 2,
      stepId: 'expedition',
      label: 'Leve à expedição',
      details: [expeditionAreaDetail()],
    },
  ];
}

function ManualDeliverCard({
  row,
  busy,
  isAccepting,
  onAccept,
}: {
  row: OperatorReplenishmentRequestItem;
  busy: boolean;
  isAccepting: boolean;
  onAccept: (requestId: string) => void;
}) {
  const isCritical = isCriticalPriority(row.priorityLevel);
  const cube = formatReplenishmentMovementCubeDisplay(row.movementCube);

  return (
    <DeliverFlowCard>
      <SuggestionFlowCardBody
        activityLabel="Entrega"
        steps={buildManualDeliverSteps(row)}
        machineName={row.destination?.name}
        cube={cube}
        requestedAt={row.createdAt}
      />
      <DeliverFlowActionFooter isCritical={isCritical}>
        <DeliverFlowAcceptButton
          disabled={busy || isAccepting}
          onClick={() => onAccept(row.id)}
        >
          <AcceptButtonLabel accepting={isAccepting} />
        </DeliverFlowAcceptButton>
      </DeliverFlowActionFooter>
    </DeliverFlowCard>
  );
}

function ManualPickupCard({
  task,
  busy,
  isAccepting,
  onAccept,
}: {
  task: OperatorPickupTaskQueueItem;
  busy: boolean;
  isAccepting: boolean;
  onAccept: (taskId: string) => void;
}) {
  const req = task.request;
  const isCritical = isCriticalPriority(req.priorityLevel);

  return (
    <DeliverFlowCard>
      <SuggestionFlowCardBody
        activityLabel="Retirada"
        steps={buildManualPickupSteps(task)}
        machineName={req.destination?.name}
        requestedAt={task.createdAt}
      />
      <DeliverFlowActionFooter isCritical={isCritical}>
        <DeliverFlowAcceptButton
          disabled={busy || isAccepting}
          onClick={() => onAccept(task.id)}
        >
          <AcceptButtonLabel accepting={isAccepting} />
        </DeliverFlowAcceptButton>
      </DeliverFlowActionFooter>
    </DeliverFlowCard>
  );
}

function ManualQueueColumnHeading({
  variant,
}: {
  variant: 'deliver' | 'pickup';
}) {
  const isDeliver = variant === 'deliver';

  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50/90 px-3 py-2.5 md:px-4">
      <div className="flex items-center gap-2">
        {isDeliver ? (
          <ArrowUpRight
            className="size-4 shrink-0 rounded-full bg-green-200"
            aria-hidden
          />
        ) : (
          <ArrowDownLeft
            className="size-4 shrink-0 rounded-full bg-red-200"
            aria-hidden
          />
        )}
        <h2 className="m-0 text-xs font-semibold text-zinc-800 sm:text-sm">
          {isDeliver ? 'Entrega de pallet' : 'Retirada de pallet'}
        </h2>
      </div>
    </div>
  );
}

export interface OperatorMovimentManualQueueSectionProps {
  queueQuery: UseQueryResult<OperatorReplenishmentQueueResponse, Error>;
  deliverRows: OperatorReplenishmentRequestItem[];
  pickupRows: OperatorPickupTaskQueueItem[];
  busy: boolean;
  pendingReplenishmentRequestId: string | null;
  pendingPickupTaskId: string | null;
  onAcceptReplenishment: (requestId: string) => void;
  onAcceptPickup: (taskId: string) => void;
}

export function OperatorMovimentManualQueueSection({
  queueQuery,
  deliverRows,
  pickupRows,
  busy,
  pendingReplenishmentRequestId,
  pendingPickupTaskId,
  onAcceptReplenishment,
  onAcceptPickup,
}: OperatorMovimentManualQueueSectionProps) {
  if (queueQuery.isError) {
    return (
      <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800 md:px-4 md:py-3">
        {queueQuery.error instanceof Error
          ? queueQuery.error.message
          : 'Erro ao carregar fila.'}
      </p>
    );
  }

  if (queueQuery.isLoading) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-8 md:px-4 md:py-10">
        <AccordionLoader />
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
      <div className="flex min-w-0 flex-col gap-4 md:gap-5">
        <ManualQueueColumnHeading variant="deliver" />
        {deliverRows.length === 0 ? (
          <p className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-6 text-center text-sm text-zinc-600 md:px-4">
            Nenhuma solicitação disponível no momento.
          </p>
        ) : (
          deliverRows.map((row) => (
            <ManualDeliverCard
              key={row.id}
              row={row}
              busy={busy}
              isAccepting={pendingReplenishmentRequestId === row.id}
              onAccept={onAcceptReplenishment}
            />
          ))
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-4 md:gap-5">
        <ManualQueueColumnHeading variant="pickup" />
        {pickupRows.length === 0 ? (
          <p className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-6 text-center text-sm text-zinc-600 md:px-4">
            Nenhuma retirada disponível no momento.
          </p>
        ) : (
          pickupRows.map((task) => (
            <ManualPickupCard
              key={task.id}
              task={task}
              busy={busy}
              isAccepting={pendingPickupTaskId === task.id}
              onAccept={onAcceptPickup}
            />
          ))
        )}
      </div>
    </div>
  );
}

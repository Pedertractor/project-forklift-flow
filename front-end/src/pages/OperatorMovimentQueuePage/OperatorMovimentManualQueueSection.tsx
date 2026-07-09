import {
  DeliverFlowAcceptButton,
  DeliverFlowActionFooter,
  DeliverFlowActivitySubtitle,
  DeliverFlowCard,
  DeliverFlowMachineCubeHighlight,
  DeliverThreeStepFlow,
  type DeliverFlowStepConfig,
} from '@/components/operator-moviment/deliver-three-step-flow';
import {
  expeditionAreaDetail,
  goToReceivingDetail,
  prismaDetail,
  receivingAreaDetail,
} from '@/components/operator-moviment/route-flow-step-details';
import { machineLocationDetailItems, toMachineDisplayInfo } from '@/utils/machine-display';
import AccordionLoader from '@/components/accordionLoader/accordion-loader';
import { formatReplenishmentMovementCubeDisplay } from '@/constants/operator-machine-replenishment';
import type {
  OperatorPickupTaskQueueItem,
  OperatorReplenishmentQueueResponse,
  OperatorReplenishmentRequestItem,
} from '@/types/operator-moviment-pallet.types';
import { isCriticalPriority } from '@/utils/operator-moviment-display';
import type { UseQueryResult } from '@tanstack/react-query';
import { ArrowDownLeft, ArrowUpRight, Check } from 'lucide-react';

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
      <Check className="size-5 shrink-0 phone-landscape:size-5" aria-hidden />
      Aceitar
    </>
  );
}

function SuggestionFlowCardBody({
  activityLabel,
  steps,
  machineName,
  assetNumber,
  pillar,
  cube,
  requestedAt,
}: {
  activityLabel: 'Entrega' | 'Retirada';
  steps: DeliverFlowStepConfig[];
  machineName?: string;
  assetNumber?: string | null;
  pillar?: string | null;
  cube?: string;
  requestedAt?: string;
}) {
  const requestedAtLabel = requestedAt
    ? formatSuggestionRequestedAt(requestedAt)
    : undefined;

  return (
    <div className="min-w-0 px-3 py-3 md:px-8 md:py-4 phone-landscape:px-2 phone-landscape:py-1.5">
      <div className="phone-landscape:mb-1 phone-landscape:shrink-0">
        <DeliverFlowActivitySubtitle
          start={
            <DeliverFlowMachineCubeHighlight
              machineName={machineName}
              assetNumber={assetNumber}
              pillar={pillar}
              cube={cube}
            />
          }
          end={
            requestedAtLabel ? (
              <time
                dateTime={requestedAt}
                className="whitespace-nowrap text-xs font-medium normal-case tracking-normal text-zinc-500 phone-landscape:text-xs md:text-xs"
              >
                {requestedAtLabel}
              </time>
            ) : null
          }
        >
          <span className="inline-flex items-center gap-1 font-semibold normal-case text-zinc-700 text-xs leading-tight phone-landscape:gap-1 phone-landscape:text-sm sm:text-sm">
            {activityLabel === 'Entrega' ? (
              <>
                Entrega de pallet
                <ArrowUpRight
                  className="size-3.5 rounded-full bg-green-200 phone-landscape:size-3.5"
                  aria-hidden
                />
              </>
            ) : (
              <>
                Retirada de pallet
                <ArrowDownLeft
                  className="size-3.5 rounded-full bg-red-200 phone-landscape:size-3.5"
                  aria-hidden
                />
              </>
            )}
          </span>
        </DeliverFlowActivitySubtitle>
      </div>

      <DeliverThreeStepFlow steps={steps} landscapeFillHeight={false} />
    </div>
  );
}

function buildManualDeliverSteps(
  row: OperatorReplenishmentRequestItem,
): DeliverFlowStepConfig[] {
  const machine = toMachineDisplayInfo(row.destination);

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
        ...machineLocationDetailItems(machine),
        prismaDetail(row.movementCube, 'deliver-to-machine'),
      ],
    },
  ];
}

function buildManualPickupSteps(
  task: OperatorPickupTaskQueueItem,
): DeliverFlowStepConfig[] {
  const machine = toMachineDisplayInfo(task.request.destination);

  return [
    {
      stepNumber: 1,
      stepId: 'machine',
      label: 'Retire na máquina',
      details: machineLocationDetailItems(machine),
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
    <DeliverFlowCard className="phone-landscape:flex-none phone-landscape:shrink-0">
      <SuggestionFlowCardBody
        activityLabel="Entrega"
        steps={buildManualDeliverSteps(row)}
        machineName={row.destination?.name}
        assetNumber={row.destination?.assetNumber}
        pillar={row.destination?.pillar}
        cube={cube}
        requestedAt={row.createdAt}
      />
      <DeliverFlowActionFooter isCritical={isCritical}>
        <DeliverFlowAcceptButton
          intent="accept"
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
    <DeliverFlowCard className="phone-landscape:flex-none phone-landscape:shrink-0">
      <SuggestionFlowCardBody
        activityLabel="Retirada"
        steps={buildManualPickupSteps(task)}
        machineName={req.destination?.name}
        assetNumber={req.destination?.assetNumber}
        pillar={req.destination?.pillar}
        requestedAt={task.createdAt}
      />
      <DeliverFlowActionFooter isCritical={isCritical}>
        <DeliverFlowAcceptButton
          intent="accept"
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
    <div className="rounded-xl border border-zinc-200 bg-zinc-50/90 px-3 py-2.5 phone-landscape:shrink-0 phone-landscape:px-2.5 phone-landscape:py-2 md:px-4">
      <div className="flex items-center gap-2">
        {isDeliver ? (
          <ArrowUpRight
            className="size-4 shrink-0 rounded-full bg-green-200 phone-landscape:size-5"
            aria-hidden
          />
        ) : (
          <ArrowDownLeft
            className="size-4 shrink-0 rounded-full bg-red-200 phone-landscape:size-5"
            aria-hidden
          />
        )}
        <h2 className="m-0 text-sm font-semibold text-zinc-800 phone-landscape:text-base sm:text-sm">
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
    <div className="grid gap-4 phone-landscape:min-h-0 phone-landscape:flex-1 phone-landscape:grid-cols-2 phone-landscape:gap-2 phone-landscape:overflow-hidden lg:grid-cols-2 lg:gap-5">
      <div className="flex min-w-0 flex-col gap-4 phone-landscape:min-h-0 phone-landscape:gap-2 phone-landscape:overflow-y-auto md:gap-5">
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

      <div className="flex min-w-0 flex-col gap-4 phone-landscape:min-h-0 phone-landscape:gap-2 phone-landscape:overflow-y-auto md:gap-5">
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

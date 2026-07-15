import { useEffect, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Forklift, Package } from 'lucide-react';
import { HorizontalActivityStepper } from '@/components/activity/HorizontalActivityStepper';
import { Button } from '@/components/ui/brand-button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatDurationMs } from '@/utils/formatDurationMs';
import type {
  DeliveryTaskListItem,
  PickupTaskListItem,
  TaskOperatedWithValue,
} from '@/types/machine-task.types';
import type { OperatorMachineSupplyRequestListItem } from '@/types/operator-machine.types';
import {
  movimentTypeLabel,
} from '@/utils/operator-moviment-display';
import {
  buildOperatorMachineTaskRows,
  formatTaskDate,
  type OperatorMachineTaskListRow,
} from './operator-machine-display';
import {
  DELIVERY_FLOW_STEPS,
  deliveryFlowHeadline,
  deliveryFlowStepStatusesFromTask,
  deriveDeliveryFlowPhaseFromTask,
  derivePickupFlowPhaseFromTask,
  findDeliveryForPickup,
  findDeliveryForSupplyRequest,
  findSupplyForPickup,
  PICKUP_FLOW_STEPS,
  PICKUP_WITH_REPLENISHMENT_FLOW_STEPS,
  PICKUP_WITH_REPLENISHMENT_FLOW_STEPS_TV,
  pickupFlowHeadline,
  pickupFlowStepStatusesFromTask,
  pickupWithReplenishmentFlowHeadline,
  pickupWithReplenishmentFlowStepStatuses,
  SUPPLY_ONLY_FLOW_STEPS,
  supplyOnlyFlowHeadline,
  supplyOnlyFlowStepStatuses,
} from './operator-machine-flow';
import AccordionLoader from '@/components/accordionLoader/accordion-loader';
import { EmptyStateMessage } from '@/components/empty-state-message/empty-state-message';

/** Cronômetro desde a solicitação (atualiza a cada segundo). */
function FlowRequestTimer({
  startIso,
  dark,
  compact,
}: {
  startIso: string;
  dark: boolean;
  compact: boolean;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const start = new Date(startIso).getTime();
  const elapsed = Number.isFinite(start) ? now - start : null;

  return (
    <time
      dateTime={startIso}
      title="Tempo desde a solicitação"
      className={cn(
        'shrink-0 tabular-nums font-semibold tracking-tight',
        dark ? 'text-sky-300' : 'text-brand',
        compact ? 'text-base sm:text-lg' : 'text-sm',
      )}
    >
      {formatDurationMs(elapsed)}
    </time>
  );
}

function TaskKindIcon({
  kind,
  linkedToReplenishmentFlow = false,
  dark = false,
}: {
  kind: OperatorMachineTaskListRow['kind'];
  linkedToReplenishmentFlow?: boolean;
  dark?: boolean;
}) {
  const arrowTone = dark ? 'text-black' : undefined;

  if (kind === 'PICKUP' && linkedToReplenishmentFlow) {
    return (
      <span className="inline-flex shrink-0 items-center gap-0.5" aria-hidden>
        <ArrowUpRight
          className={cn('size-4 rounded-full bg-green-200', arrowTone)}
        />
        <ArrowDownLeft
          className={cn('size-4 rounded-full bg-red-200', arrowTone)}
        />
      </span>
    );
  }
  if (kind === 'DELIVERY') {
    return (
      <ArrowUpRight
        className={cn(
          'size-4 shrink-0 rounded-full bg-green-200',
          arrowTone,
        )}
        aria-hidden
      />
    );
  }
  if (kind === 'PICKUP') {
    return (
      <ArrowDownLeft
        className={cn('size-4 shrink-0 rounded-full bg-red-200', arrowTone)}
        aria-hidden
      />
    );
  }
  return <Package className="size-4 shrink-0 text-sky-400" aria-hidden />;
}

function flowCardTitle(
  row: OperatorMachineTaskListRow,
  compact = false,
): string {
  switch (row.kind) {
    case 'DELIVERY':
      return 'Entrega de pallet';
    case 'PICKUP':
      return row.linkedToReplenishmentFlow
        ? compact
          ? 'Entrega + Retirada'
          : 'Entrega de pallet + Retirada de pallet'
        : 'Retirada de pallet';
    default:
      return 'Solicitação ao abastecimento';
  }
}

function findDeliveryTask(
  deliveryTasks: DeliveryTaskListItem[],
  id: string,
): DeliveryTaskListItem | null {
  return deliveryTasks.find((t) => t.id === id) ?? null;
}

function findPickupTask(
  pickupTasks: PickupTaskListItem[],
  id: string,
): PickupTaskListItem | null {
  return pickupTasks.find((t) => t.id === id) ?? null;
}

function findSupplyRequest(
  supplyRequests: OperatorMachineSupplyRequestListItem[],
  id: string,
): OperatorMachineSupplyRequestListItem | null {
  return supplyRequests.find((r) => r.id === id) ?? null;
}

export interface OperatorMachineTasksListProps {
  deliveryTasks: DeliveryTaskListItem[];
  pickupTasks: PickupTaskListItem[];
  supplyRequests: OperatorMachineSupplyRequestListItem[];
  loading: boolean;
  error: Error | null;
  busy?: boolean;
  cancelPickupPendingId?: string | null;
  onRequestCancelPickup?: (pickupTaskId: string) => void;
  /** Exibe nome da máquina no card (monitor TV / multi-máquina). */
  showMachineName?: boolean;
  /** Mensagem quando não há fluxos (default: texto da dobra). */
  emptyTitle?: string;
  className?: string;
  /** Cards e stepper mais densos (monitor TV). */
  compact?: boolean;
  /** Aparência para fundo escuro. */
  dark?: boolean;
  /**
   * Linhas já calculadas (bypassa `buildOperatorMachineTaskRows` interno).
   *
   * Necessário quando o chamador recorta `deliveryTasks`/`pickupTasks`/
   * `supplyRequests` para renderizar um único card por vez (monitor TV): o
   * recorte tira do contexto as retiradas irmãs da mesma máquina, e recalcular
   * `linkedToReplenishmentFlow` só com 1 item sempre dá "vinculado" — duplicando
   * o card de "Entrega + Retirada". Calcule as `rows` uma vez com as listas
   * completas da máquina e passe aqui.
   */
  rows?: OperatorMachineTaskListRow[];
}

export function OperatorMachineTasksList({
  deliveryTasks,
  pickupTasks,
  supplyRequests,
  loading,
  error,
  busy = false,
  cancelPickupPendingId = null,
  onRequestCancelPickup,
  showMachineName = false,
  emptyTitle = 'Nenhuma solicitação em aberto. Se necessário, solicite uma retirada ou abastecimento de pallet.',
  className,
  compact = false,
  dark = false,
  rows: rowsOverride,
}: OperatorMachineTasksListProps) {
  const rows =
    rowsOverride ??
    buildOperatorMachineTaskRows(deliveryTasks, pickupTasks, supplyRequests);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <AccordionLoader />
      </div>
    );
  }

  if (error) {
    return (
      <p
        className={cn(
          'm-0 text-sm',
          dark ? 'text-red-300' : 'text-red-700',
        )}
      >
        {error.message || 'Erro ao carregar solicitações.'}
      </p>
    );
  }

  if (rows.length === 0) {
    return <EmptyStateMessage title={emptyTitle} />;
  }

  return (
    <div className={className ?? (compact ? 'flex flex-col gap-2' : 'flex flex-col gap-4')}>
      {rows.map((row) => (
        <RequestFlowCard
          key={`${row.kind}-${row.id}`}
          row={row}
          deliveryTasks={deliveryTasks}
          pickupTasks={pickupTasks}
          supplyRequests={supplyRequests}
          busy={busy}
          cancelPickupPendingId={cancelPickupPendingId}
          onRequestCancelPickup={onRequestCancelPickup}
          showMachineName={showMachineName}
          compact={compact}
          dark={dark}
        />
      ))}
    </div>
  );
}

interface RequestFlowCardProps {
  row: OperatorMachineTaskListRow;
  deliveryTasks: DeliveryTaskListItem[];
  pickupTasks: PickupTaskListItem[];
  supplyRequests: OperatorMachineSupplyRequestListItem[];
  busy: boolean;
  cancelPickupPendingId: string | null;
  onRequestCancelPickup?: (pickupTaskId: string) => void;
  showMachineName?: boolean;
  compact?: boolean;
  dark?: boolean;
}

function resolveMachineLabel(
  deliveryTask: DeliveryTaskListItem | null,
  pickupTask: PickupTaskListItem | null,
  supplyRequest: OperatorMachineSupplyRequestListItem | null,
): string | null {
  const machine =
    deliveryTask?.machine ??
    pickupTask?.machine ??
    supplyRequest?.machine ??
    null;
  if (!machine) return null;
  const parts = [machine.name];
  if (machine.assetNumber) parts.push(`Pat. ${machine.assetNumber}`);
  if (machine.pillar) parts.push(`Pilar ${machine.pillar}`);
  return parts.join(' · ');
}

type TransportAssignedTask = Pick<
  DeliveryTaskListItem,
  | 'status'
  | 'assignedAt'
  | 'assignedOperatorId'
  | 'assignedMovimentPalletId'
  | 'operatedWith'
  | 'assignedOperator'
>;

function isTransportAccepted(task: TransportAssignedTask | null | undefined): boolean {
  if (!task) return false;
  return Boolean(
    task.assignedAt ||
      task.assignedOperatorId ||
      task.assignedMovimentPalletId ||
      task.status === 'ASSIGNED' ||
      task.status === 'IN_PROGRESS',
  );
}

/**
 * Equipamento do transporte que aceitou a task (ou o deliver do continuum
 * vinculado). Só retorna após o aceite.
 */
function resolveAcceptedTransportEquipment(
  deliveryTask: DeliveryTaskListItem | null,
  pickupTask: PickupTaskListItem | null,
  replenishmentDelivery: DeliveryTaskListItem | null,
): TaskOperatedWithValue | null {
  const candidates = [deliveryTask, replenishmentDelivery, pickupTask];
  for (const task of candidates) {
    if (!isTransportAccepted(task)) continue;
    if (task?.operatedWith) return task.operatedWith;
    if (task?.assignedOperator?.isOperating) {
      return task.assignedOperator.isOperating;
    }
  }
  return null;
}

function RequestFlowCard({
  row,
  deliveryTasks,
  pickupTasks,
  supplyRequests,
  busy,
  cancelPickupPendingId,
  onRequestCancelPickup,
  showMachineName = false,
  compact = false,
  dark = false,
}: RequestFlowCardProps) {
  const deliveryTask =
    row.kind === 'DELIVERY' ? findDeliveryTask(deliveryTasks, row.id) : null;
  const pickupTask =
    row.kind === 'PICKUP' ? findPickupTask(pickupTasks, row.id) : null;
  const supplyRequest =
    row.kind === 'SUPPLY'
      ? findSupplyRequest(supplyRequests, row.id)
      : row.kind === 'PICKUP' && row.linkedToReplenishmentFlow && pickupTask
        ? findSupplyForPickup(pickupTask, supplyRequests)
        : null;
  const replenishmentDelivery =
    row.kind === 'PICKUP' && row.linkedToReplenishmentFlow && pickupTask
      ? findDeliveryForPickup(pickupTask, supplyRequests, deliveryTasks)
      : row.kind === 'SUPPLY' && supplyRequest
        ? findDeliveryForSupplyRequest(deliveryTasks, supplyRequest)
        : null;

  const showCancelButton =
    row.kind === 'PICKUP' && row.canCancel && onRequestCancelPickup;

  const machineLabel = showMachineName
    ? resolveMachineLabel(deliveryTask, pickupTask, supplyRequest)
    : null;

  const acceptedEquipment = resolveAcceptedTransportEquipment(
    deliveryTask,
    pickupTask,
    replenishmentDelivery,
  );
  const equipmentLabel = acceptedEquipment
    ? movimentTypeLabel(acceptedEquipment)
    : null;
  const showForkliftIcon = acceptedEquipment === 'FORKLIFT';
  const palletTruckIconSrc =
    acceptedEquipment === 'PALLET_TRUCK'
      ? dark
        ? '/PALLET_TRUCK_WHITE.png'
        : '/PALLET_TRUCK.png'
      : null;

  const metaBlock = (
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0 flex-1">
        {machineLabel ? (
          <p
            className={cn(
              'm-0 truncate font-semibold tracking-wide text-brand',
              dark
                ? 'mb-1 text-sm normal-case sm:text-base'
                : compact
                  ? 'mb-0.5 text-[11px] normal-case'
                  : 'mb-1 text-xs uppercase',
            )}
          >
            {machineLabel}
          </p>
        ) : null}
        <h3
          className={cn(
            'm-0 flex items-center gap-1.5 font-semibold tracking-tight',
            dark
              ? 'text-base sm:text-lg text-zinc-100'
              : compact
                ? 'text-xs text-zinc-900'
                : 'text-sm text-zinc-900',
          )}
        >
          {flowCardTitle(row, compact)}
          <TaskKindIcon
            kind={row.kind}
            linkedToReplenishmentFlow={
              row.kind === 'PICKUP' && row.linkedToReplenishmentFlow
            }
            dark={dark}
          />
        </h3>
        <div
          className={cn(
            'flex flex-wrap items-center gap-1.5',
            compact ? 'mt-0.5' : 'mt-1.5',
          )}
        >
          {row.isCritical ? (
            <span
              className={cn(
                'inline-flex rounded-md font-medium ring-1 ring-inset',
                compact ? 'px-1.5 py-0 text-[10px]' : 'px-2 py-0.5 text-xs',
                dark
                  ? 'bg-red-950/60 text-red-300 ring-red-800'
                  : 'bg-red-50 text-red-800 ring-red-200',
              )}
            >
              Crítico
            </span>
          ) : null}
          <time
            className={cn(
              dark ? 'text-zinc-400' : 'text-zinc-500',
              compact ? 'text-xs sm:text-sm' : 'text-xs',
            )}
            dateTime={row.createdAt}
          >
            {formatTaskDate(row.createdAt)}
          </time>
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <div className="flex items-center gap-3">
          {(showForkliftIcon || palletTruckIconSrc) && equipmentLabel ? (
            <span
              className={cn(
                'inline-flex shrink-0 items-center justify-center rounded-full p-1',
                dark ? 'bg-zinc-700 text-zinc-100' : 'bg-zinc-200 text-zinc-800',
                compact ? 'size-8 sm:size-9' : 'size-9',
              )}
              title={equipmentLabel}
            >
              {showForkliftIcon ? (
                <Forklift
                  className="size-[70%] stroke-[1.75]"
                  aria-hidden
                />
              ) : palletTruckIconSrc ? (
                <img
                  src={palletTruckIconSrc}
                  alt={equipmentLabel}
                  className="size-[55%] object-contain object-center"
                />
              ) : null}
            </span>
          ) : null}
          <FlowRequestTimer
            startIso={row.createdAt}
            dark={dark}
            compact={compact}
          />
        </div>
        {showCancelButton ? (
          <Button
            type="button"
            variant="outline"
            className="shrink-0 text-red-700 hover:bg-red-50"
            disabled={busy}
            onClick={() => onRequestCancelPickup(row.id)}
          >
            {cancelPickupPendingId === row.id
              ? 'Cancelando…'
              : 'Cancelar retirada'}
          </Button>
        ) : null}
      </div>
    </div>
  );

  const stepper = (
    <>
      {row.kind === 'DELIVERY' && deliveryTask ? (
        <HorizontalActivityStepper
          compact={compact}
          dark={dark}
          steps={[...DELIVERY_FLOW_STEPS]}
          statuses={deliveryFlowStepStatusesFromTask(deliveryTask)}
          headline={
            compact
              ? undefined
              : deliveryFlowHeadline(
                  deriveDeliveryFlowPhaseFromTask(deliveryTask),
                  deliveryTask,
                )
          }
        />
      ) : null}

      {row.kind === 'PICKUP' && pickupTask ? (
        row.linkedToReplenishmentFlow ? (
          <HorizontalActivityStepper
            compact={compact}
            dark={dark}
            steps={[
              ...(compact
                ? PICKUP_WITH_REPLENISHMENT_FLOW_STEPS_TV
                : PICKUP_WITH_REPLENISHMENT_FLOW_STEPS),
            ]}
            statuses={pickupWithReplenishmentFlowStepStatuses(
              supplyRequest,
              replenishmentDelivery,
              pickupTask,
            )}
            headline={
              compact
                ? undefined
                : pickupWithReplenishmentFlowHeadline(
                    supplyRequest,
                    replenishmentDelivery,
                    pickupTask,
                  )
            }
          />
        ) : (
          <HorizontalActivityStepper
            compact={compact}
            dark={dark}
            steps={[...PICKUP_FLOW_STEPS]}
            statuses={pickupFlowStepStatusesFromTask(pickupTask)}
            headline={
              compact
                ? undefined
                : pickupFlowHeadline(
                    derivePickupFlowPhaseFromTask(pickupTask),
                    pickupTask,
                  )
            }
          />
        )
      ) : null}

      {row.kind === 'SUPPLY' && supplyRequest ? (
        <HorizontalActivityStepper
          compact={compact}
          dark={dark}
          steps={[...SUPPLY_ONLY_FLOW_STEPS]}
          statuses={supplyOnlyFlowStepStatuses(
            supplyRequest,
            replenishmentDelivery,
          )}
          headline={
            compact
              ? undefined
              : supplyOnlyFlowHeadline(supplyRequest, replenishmentDelivery)
          }
        />
      ) : null}
    </>
  );

  return (
    <Card
      className={cn(
        'flex flex-col p-0 shadow-sm',
        dark
          ? 'border border-zinc-700/80 bg-zinc-900/80'
          : 'border border-zinc-200 bg-white',
      )}
    >
      {compact ? (
        <div className="flex flex-1 flex-col gap-1.5 p-2.5">
          {metaBlock}
          {stepper}
        </div>
      ) : (
        <>
          <div
            className={cn(
              dark ? 'border-b border-zinc-800' : 'border-b border-zinc-100',
              'px-4 py-3',
            )}
          >
            {metaBlock}
          </div>
          <div className="flex flex-1 flex-col gap-4 p-4">{stepper}</div>
        </>
      )}
    </Card>
  );
}

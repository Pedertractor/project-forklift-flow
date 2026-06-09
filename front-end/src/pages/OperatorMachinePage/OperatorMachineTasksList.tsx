import { ArrowDownLeft, ArrowUpRight, Package } from 'lucide-react';
import { HorizontalActivityStepper } from '@/components/activity/HorizontalActivityStepper';
import { Button } from '@/components/ui/brand-button';
import { Card } from '@/components/ui/card';
import type {
  DeliveryTaskListItem,
  PickupTaskListItem,
} from '@/types/machine-task.types';
import type { OperatorMachineSupplyRequestListItem } from '@/types/operator-machine.types';
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
  findOpenReplenishmentDelivery,
  findReplenishmentDeliveryForPickup,
  PICKUP_FLOW_STEPS,
  PICKUP_WITH_REPLENISHMENT_FLOW_STEPS,
  pickupFlowHeadline,
  pickupFlowStepStatusesFromTask,
  pickupWithReplenishmentFlowHeadline,
  pickupWithReplenishmentFlowStepStatuses,
  SUPPLY_ONLY_FLOW_STEPS,
  supplyOnlyFlowHeadline,
  supplyOnlyFlowStepStatuses,
} from './operator-machine-flow';
import { EmptyStateMessage } from '@/components/empty-state-message/empty-state-message';
import AccordionLoader from '@/components/accordionLoader/accordion-loader';

function TaskKindIcon({ kind }: { kind: OperatorMachineTaskListRow['kind'] }) {
  if (kind === 'DELIVERY') {
    return (
      <ArrowUpRight
        className="size-4 shrink-0 rounded-full bg-green-200"
        aria-hidden
      />
    );
  }
  if (kind === 'PICKUP') {
    return (
      <ArrowDownLeft
        className="size-4 shrink-0 rounded-full bg-red-200"
        aria-hidden
      />
    );
  }
  return <Package className="size-4 shrink-0 text-amber-700" aria-hidden />;
}

function flowCardTitle(row: OperatorMachineTaskListRow): string {
  switch (row.kind) {
    case 'DELIVERY':
      return 'Entrega de pallet';
    case 'PICKUP':
      return row.triggersReplenishment
        ? 'Entrega de pallet + Retirada de pallet'
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
}: OperatorMachineTasksListProps) {
  const rows = buildOperatorMachineTaskRows(
    deliveryTasks,
    pickupTasks,
    supplyRequests,
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <AccordionLoader />
      </div>
    );
  }

  if (error) {
    return (
      <p className="m-0 text-sm text-red-700">
        {error.message || 'Erro ao carregar solicitações.'}
      </p>
    );
  }

  if (rows.length === 0) {
    return (
      <EmptyStateMessage title="Nenhuma solicitação em aberto. Se necessário, solicite uma retirada ou abastecimento de pallet." />
    );
  }

  return (
    <div className="flex flex-col gap-4">
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
}

function RequestFlowCard({
  row,
  deliveryTasks,
  pickupTasks,
  supplyRequests,
  busy,
  cancelPickupPendingId,
  onRequestCancelPickup,
}: RequestFlowCardProps) {
  const deliveryTask =
    row.kind === 'DELIVERY' ? findDeliveryTask(deliveryTasks, row.id) : null;
  const pickupTask =
    row.kind === 'PICKUP' ? findPickupTask(pickupTasks, row.id) : null;
  const supplyRequest =
    row.kind === 'SUPPLY'
      ? findSupplyRequest(supplyRequests, row.id)
      : row.kind === 'PICKUP' && row.linkedSupplyRequestId
        ? findSupplyRequest(supplyRequests, row.linkedSupplyRequestId)
        : null;
  const replenishmentDelivery =
    row.kind === 'PICKUP' && row.triggersReplenishment && pickupTask
      ? findReplenishmentDeliveryForPickup(
          deliveryTasks,
          pickupTask.machineId,
          pickupTask.createdAt,
        )
      : row.kind === 'SUPPLY'
        ? findOpenReplenishmentDelivery(deliveryTasks, row.machineId)
        : null;

  const showCancelButton =
    row.kind === 'PICKUP' && row.canCancel && onRequestCancelPickup;

  return (
    <Card className="flex flex-col border border-zinc-200 p-0 shadow-sm">
      <div className="border-b border-zinc-100 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="m-0 flex items-center gap-2 text-sm font-semibold tracking-tight text-zinc-900">
              {flowCardTitle(row)}
              <TaskKindIcon kind={row.kind} />
            </h3>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              {row.isCritical ? (
                <span className="inline-flex rounded-md bg-red-50 px-2 py-0.5 text-xs font-medium text-red-800 ring-1 ring-inset ring-red-200">
                  Crítico
                </span>
              ) : null}
              <time className="text-xs text-zinc-500" dateTime={row.createdAt}>
                {formatTaskDate(row.createdAt)}
              </time>
            </div>
          </div>

          {showCancelButton ? (
            <Button
              type="button"
              variant="outline"
              className="shrink-0 self-end text-red-700 hover:bg-red-50"
              disabled={busy}
              onClick={() => onRequestCancelPickup(row.id)}
            >
              {cancelPickupPendingId === row.id
                ? 'Cancelando…'
                : 'Cancelar solicitação'}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-4">
        {row.kind === 'DELIVERY' && deliveryTask ? (
          <HorizontalActivityStepper
            steps={[...DELIVERY_FLOW_STEPS]}
            statuses={deliveryFlowStepStatusesFromTask(deliveryTask)}
            headline={deliveryFlowHeadline(
              deriveDeliveryFlowPhaseFromTask(deliveryTask),
              deliveryTask,
            )}
          />
        ) : null}

        {row.kind === 'PICKUP' && pickupTask ? (
          row.triggersReplenishment ? (
            <HorizontalActivityStepper
              steps={[...PICKUP_WITH_REPLENISHMENT_FLOW_STEPS]}
              statuses={pickupWithReplenishmentFlowStepStatuses(
                supplyRequest,
                replenishmentDelivery,
                pickupTask,
              )}
              headline={pickupWithReplenishmentFlowHeadline(
                supplyRequest,
                replenishmentDelivery,
                pickupTask,
              )}
            />
          ) : (
            <HorizontalActivityStepper
              steps={[...PICKUP_FLOW_STEPS]}
              statuses={pickupFlowStepStatusesFromTask(pickupTask)}
              headline={pickupFlowHeadline(
                derivePickupFlowPhaseFromTask(pickupTask),
                pickupTask,
              )}
            />
          )
        ) : null}

        {row.kind === 'SUPPLY' && supplyRequest ? (
          <HorizontalActivityStepper
            steps={[...SUPPLY_ONLY_FLOW_STEPS]}
            statuses={supplyOnlyFlowStepStatuses(
              supplyRequest,
              replenishmentDelivery,
            )}
            headline={supplyOnlyFlowHeadline(
              supplyRequest,
              replenishmentDelivery,
            )}
          />
        ) : null}
      </div>
    </Card>
  );
}

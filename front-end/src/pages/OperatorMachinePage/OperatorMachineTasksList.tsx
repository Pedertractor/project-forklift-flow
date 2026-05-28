import { ArrowDownLeft, ArrowUpRight, Package } from 'lucide-react';
import { Button } from '@/components/ui/Button';
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
import { EmptyStateMessage } from '@/components/empty-state-message/empty-state-message';
import AccordionLoader from '@/components/accordionLoader/accordion-loader';

function TaskKindIcon({ kind }: { kind: OperatorMachineTaskListRow['kind'] }) {
  if (kind === 'DELIVERY') {
    return (
      <ArrowUpRight className="size-4 shrink-0 text-emerald-700" aria-hidden />
    );
  }
  if (kind === 'PICKUP') {
    return (
      <ArrowDownLeft className="size-4 shrink-0 text-sky-700" aria-hidden />
    );
  }
  return <Package className="size-4 shrink-0 text-amber-700" aria-hidden />;
}

function kindBadgeClass(kind: OperatorMachineTaskListRow['kind']): string {
  switch (kind) {
    case 'DELIVERY':
      return 'bg-emerald-50 text-emerald-800 ring-emerald-200';
    case 'PICKUP':
      return 'bg-sky-50 text-sky-800 ring-sky-200';
    default:
      return 'bg-amber-50 text-amber-900 ring-amber-200';
  }
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

  return (
    <section aria-labelledby="op-machine-tasks-heading">
      <h2
        id="op-machine-tasks-heading"
        className="mb-3 text-lg font-semibold tracking-tight text-zinc-900"
      >
        Solicitações desta máquina
      </h2>
      <p className="mb-4 text-sm text-zinc-600">
        Entregas, retiradas e avisos em aberto nesta máquina.
      </p>

      <Card className="border border-zinc-200 p-2 shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center px-4 py-6">
            <AccordionLoader />
          </div>
        ) : error ? (
          <p className="px-4 py-6 text-sm text-red-700">
            {error.message || 'Erro ao carregar solicitações.'}
          </p>
        ) : rows.length === 0 ? (
          <EmptyStateMessage title="Nenhuma solicitação em aberto. Se necessário, solicite uma retirada ou abastecimento de pallet." />
        ) : (
          <ul className="m-0 divide-y divide-zinc-100 p-0 list-none">
            {rows.map((row) => (
              <li key={`${row.kind}-${row.id}`} className="px-4 py-3.5">
                <div className="flex items-start gap-3">
                  <TaskKindIcon kind={row.kind} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${kindBadgeClass(row.kind)}`}
                      >
                        {row.kind === 'DELIVERY'
                          ? 'Entrega'
                          : row.kind === 'PICKUP'
                            ? 'Retirada'
                            : 'Abastecimento'}
                      </span>
                      {row.isCritical ? (
                        <span className="inline-flex rounded-md bg-red-50 px-2 py-0.5 text-xs font-medium text-red-800 ring-1 ring-inset ring-red-200">
                          Crítico
                        </span>
                      ) : null}
                      <time
                        className="text-xs text-zinc-500"
                        dateTime={row.createdAt}
                      >
                        {formatTaskDate(row.createdAt)}
                      </time>
                    </div>
                    <p className="m-0 mt-1 text-sm font-semibold text-zinc-900">
                      {row.title}
                    </p>
                    <p className="m-0 mt-0.5 text-sm text-zinc-600">
                      {row.subtitle}
                    </p>
                    <p className="m-0 mt-1.5 text-sm text-zinc-700">
                      <span className="font-medium text-zinc-800">
                        Situação:
                      </span>{' '}
                      {row.statusLabel}
                    </p>
                    {row.kind === 'PICKUP' &&
                    row.canCancel &&
                    onRequestCancelPickup ? (
                      <div className="mt-3">
                        <Button
                          type="button"
                          variant="outline"
                          className="text-red-700 hover:bg-red-50"
                          disabled={busy}
                          onClick={() => onRequestCancelPickup(row.id)}
                        >
                          {cancelPickupPendingId === row.id
                            ? 'Cancelando…'
                            : 'Cancelar solicitação'}
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  );
}

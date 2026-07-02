import { type ReactNode } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Clock3,
  Package,
  Timer,
  type LucideIcon,
} from 'lucide-react';

import { DataTableCard } from '@/components/ui/table';
import { EmptyStateMessage } from '@/components/empty-state-message/empty-state-message';
import type { OperationalDashboardMachineRow } from '@/services/operational-dashboard-api';
import { formatDurationMs } from '@/utils/formatDurationMs';

function MachineMobileStat({
  icon: Icon,
  iconWrapClass,
  label,
  value,
}: {
  icon: LucideIcon;
  iconWrapClass: string;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-zinc-100 bg-zinc-50/70 px-3 py-2.5">
      <span
        className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${iconWrapClass}`}
      >
        <Icon className="size-4" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="m-0 text-[0.7rem] font-medium leading-tight text-zinc-500">
          {label}
        </p>
        <p className="m-0 text-sm font-semibold leading-tight tabular-nums text-zinc-900">
          {value}
        </p>
      </div>
    </div>
  );
}

function MachineMobileCard({
  machine,
}: {
  machine: OperationalDashboardMachineRow;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2.5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
          <Package className="size-5" aria-hidden />
        </span>
        <h3 className="m-0 min-w-0 flex-1 truncate text-sm font-semibold text-zinc-900">
          {machine.machine_name}
        </h3>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <MachineMobileStat
          icon={ArrowDownLeft}
          iconWrapClass="bg-red-100 text-red-600"
          label="Retiradas"
          value={machine.pickups_total}
        />
        <MachineMobileStat
          icon={ArrowUpRight}
          iconWrapClass="bg-green-100 text-green-600"
          label="Entregas"
          value={machine.deliveries_total}
        />
        <MachineMobileStat
          icon={Clock3}
          iconWrapClass="bg-blue-100 text-blue-600"
          label="Média retirada"
          value={formatDurationMs(machine.avg_pickup_wait_ms)}
        />
        <MachineMobileStat
          icon={Timer}
          iconWrapClass="bg-amber-100 text-amber-600"
          label="Média entrega"
          value={formatDurationMs(machine.avg_delivery_wait_ms)}
        />
      </div>
    </div>
  );
}

export function DashboardMachinesSection({
  rows,
}: {
  rows: OperationalDashboardMachineRow[];
}) {
  return (
    <section aria-labelledby="dashboard-machines-heading">
      <div className="mb-3 min-w-0">
        <h2
          id="dashboard-machines-heading"
          className="m-0 text-base font-semibold text-zinc-900"
        >
          Por máquina
        </h2>
        <p className="mt-1 text-sm text-zinc-600">
          Retiradas, entregas e tempo médio da criação até a conclusão da
          tarefa.
        </p>
      </div>

      <div className="flex flex-col gap-3 md:hidden">
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <EmptyStateMessage
              title="Sem movimentações no período"
              description="Não há tarefas registradas para os filtros selecionados."
            />
          </div>
        ) : (
          rows.map((machine) => (
            <MachineMobileCard key={machine.machine_id} machine={machine} />
          ))
        )}
      </div>

      <DataTableCard className="hidden min-w-0 border-0 shadow-sm md:block">
        <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50/90">
              <th className="px-3 py-3 font-semibold text-zinc-700">Máquina</th>
              <th className="px-3 py-3 font-semibold text-zinc-700">
                <div className="flex items-center gap-2">
                  <ArrowDownLeft
                    className="size-4 rounded-full bg-red-200"
                    aria-hidden
                  />
                  Retiradas de paletes
                </div>
              </th>
              <th className="px-3 py-3 font-semibold text-zinc-700">
                <div className="flex items-center gap-2">
                  <ArrowUpRight
                    className="size-4 rounded-full bg-green-200"
                    aria-hidden
                  />
                  Entregas de paletes
                </div>
              </th>
              <th className="px-3 py-3 font-semibold text-zinc-700">
                Média tempo retirada de paletes
              </th>
              <th className="px-3 py-3 font-semibold text-zinc-700">
                Média tempo entrega de paletes
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                  <EmptyStateMessage
                    title="Sem movimentações no período"
                    description="Não há tarefas registradas para os filtros selecionados."
                  />
                </td>
              </tr>
            ) : (
              rows.map((machine) => (
                <tr
                  key={machine.machine_id}
                  className="border-b border-zinc-100 last:border-0"
                >
                  <td className="px-3 py-3 font-medium text-zinc-900">
                    {machine.machine_name}
                  </td>
                  <td className="px-3 py-3 tabular-nums text-zinc-700">
                    {machine.pickups_total}
                  </td>
                  <td className="px-3 py-3 tabular-nums text-zinc-700">
                    {machine.deliveries_total}
                  </td>
                  <td className="px-3 py-3 tabular-nums text-zinc-700">
                    {formatDurationMs(machine.avg_pickup_wait_ms)}
                  </td>
                  <td className="px-3 py-3 tabular-nums text-zinc-700">
                    {formatDurationMs(machine.avg_delivery_wait_ms)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </DataTableCard>
    </section>
  );
}

import { MachineMetaText } from '@/components/machines/MachineMetaText';
import { DataTableCard } from '@/components/ui/table';
import {
  formatTaskDate,
  replenishmentMovimentTypeLabel,
} from '@/utils/operator-moviment-display';
import { requestStatusLabel } from '@/utils/replenishment-labels';
import { cn } from '@/lib/utils';
import type { ReplenishmentMovimentType } from '@/types/replenishment-moviment.types';
import type { ReplenishmentRequestListItem } from '@/types/replenishment-request.types';
import type { RequestStatusValue } from '@/types/replenishment-request.types';
import {
  AlertTriangle,
  Box,
  CheckIcon,
  ChevronRight,
  Clock3,
  Factory,
  User,
  type LucideIcon,
} from 'lucide-react';
import { EmptyStateMessage } from '@/components/empty-state-message/empty-state-message';
import AccordionLoader from '@/components/accordionLoader/accordion-loader';
import { type ReactNode } from 'react';

function movementTypeLabel(t: string): string {
  if (t === 'FORKLIFT' || t === 'ANY') {
    return replenishmentMovimentTypeLabel(t);
  }
  return t;
}

function replenishmentMovimentTypeIconPath(
  type: ReplenishmentMovimentType | string,
): string {
  return type === 'ANY' ? '/PALLET_TRUCK.png' : '/FORKLIFT.png';
}

function requestStatusColorClass(status: RequestStatusValue): string {
  switch (status) {
    case 'CREATED':
    case 'COMPLETED':
      return 'text-green-500';
    case 'IN_PROGRESS':
      return 'text-yellow-500';
    case 'ON_MACHINE':
      return 'text-blue-500';
    case 'CANCELED':
      return 'text-red-500';
    default:
      return 'text-gray-500';
  }
}

function requestStatusPillClass(status: RequestStatusValue): string {
  switch (status) {
    case 'CREATED':
    case 'COMPLETED':
      return 'bg-green-50 text-green-700 ring-green-200';
    case 'IN_PROGRESS':
      return 'bg-yellow-50 text-yellow-700 ring-yellow-200';
    case 'ON_MACHINE':
      return 'bg-blue-50 text-blue-700 ring-blue-200';
    case 'CANCELED':
      return 'bg-red-50 text-red-700 ring-red-200';
    default:
      return 'bg-zinc-100 text-zinc-600 ring-zinc-200';
  }
}

function MobileStat({
  icon: Icon,
  iconSrc,
  iconClass,
  label,
  children,
}: {
  icon?: LucideIcon;
  iconSrc?: string;
  iconClass?: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-zinc-100 bg-zinc-50/70 px-2.5 py-2">
      {iconSrc ? (
        <img
          src={iconSrc}
          alt=""
          aria-hidden
          className="mt-0.5 size-4 shrink-0 object-contain"
        />
      ) : Icon ? (
        <Icon
          className={cn('mt-0.5 size-4 shrink-0 text-zinc-400', iconClass)}
          aria-hidden
        />
      ) : null}
      <div className="min-w-0">
        <p className="m-0 text-[0.65rem] font-medium uppercase leading-tight tracking-wide text-zinc-500">
          {label}
        </p>
        <div className="mt-0.5 text-sm leading-tight text-zinc-900">
          {children}
        </div>
      </div>
    </div>
  );
}

function ReplenishmentRequestMobileCard({
  row,
  showHistoryColumns,
  onRowClick,
}: {
  row: ReplenishmentRequestListItem;
  showHistoryColumns: boolean;
  onRowClick: (row: ReplenishmentRequestListItem) => void;
}) {
  const isCritical = row.priorityLevel === 'VERY_HIGH';

  return (
    <button
      type="button"
      onClick={() => onRowClick(row)}
      aria-label={`Ver detalhe da solicitação para ${row.destination.name}`}
      className="flex w-full flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 text-left shadow-sm transition-colors hover:bg-zinc-50/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
            <Factory className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="m-0 truncate text-sm font-semibold text-zinc-900">
              {row.destination.name}
            </p>
            <MachineMetaText
              assetNumber={row.destination.assetNumber}
              pillar={row.destination.pillar}
            />
            <p className="m-0 truncate text-xs text-zinc-500">
              {row.destination.sector.typeSector}
            </p>
          </div>
        </div>
        <span
          className={cn(
            'inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset',
            requestStatusPillClass(row.status),
          )}
        >
          {row.status === 'COMPLETED' ? (
            <CheckIcon className="size-3.5" aria-hidden />
          ) : null}
          {requestStatusLabel(row.status)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <MobileStat icon={Box} iconClass="text-blue-500" label="Prisma">
          <span className="font-mono">{row.movementCube}</span>
        </MobileStat>
        <MobileStat
          iconSrc={replenishmentMovimentTypeIconPath(row.typeMovimentPallet)}
          label="Tipo mov."
        >
          {movementTypeLabel(row.typeMovimentPallet)}
        </MobileStat>
        <MobileStat
          icon={AlertTriangle}
          iconClass={isCritical ? 'text-red-500' : undefined}
          label="Crítico"
        >
          <span
            className={
              isCritical ? 'font-semibold text-red-600' : 'text-zinc-500'
            }
          >
            {isCritical ? 'Sim' : 'Não'}
          </span>
        </MobileStat>
        {!showHistoryColumns ? (
          <MobileStat icon={Clock3} label="Solicitado">
            {formatTaskDate(row.createdAt)}
          </MobileStat>
        ) : null}
        {showHistoryColumns ? (
          <MobileStat icon={User} label="Solicitante">
            <span className="truncate">{row.requestedBy.name}</span>
          </MobileStat>
        ) : null}
        {showHistoryColumns ? (
          <MobileStat icon={Clock3} label="Atualizado">
            {formatTaskDate(row.updatedAt)}
          </MobileStat>
        ) : null}
      </div>

      <span className="flex items-center justify-end gap-1 text-xs font-medium text-brand">
        Ver detalhe
        <ChevronRight className="size-4" aria-hidden />
      </span>
    </button>
  );
}

export type ReplenishmentRequestsTableVariant = 'open' | 'history';

type ReplenishmentRequestsTableProps = {
  variant: ReplenishmentRequestsTableVariant;
  rows: ReplenishmentRequestListItem[];
  isLoading: boolean;
  emptyMessage: string;
  onRowClick: (row: ReplenishmentRequestListItem) => void;
};

export function ReplenishmentRequestsTable({
  variant,
  rows,
  isLoading,
  emptyMessage,
  onRowClick,
}: ReplenishmentRequestsTableProps) {
  const showHistoryColumns = variant === 'history';
  const colSpan = showHistoryColumns ? 7 : 5;

  return (
    <>
      {/* Mobile: blocos em coluna só na lista em aberto (a tabela é ruim em
          telas pequenas). No histórico mantemos a tabela. */}
      {!showHistoryColumns ? (
        <div className="flex flex-col gap-3 md:hidden">
          {isLoading ? (
            <div className="flex items-center justify-center rounded-2xl border border-zinc-200 bg-white py-10 shadow-sm">
              <AccordionLoader />
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-8 shadow-sm">
              <EmptyStateMessage title={emptyMessage} />
            </div>
          ) : (
            rows.map((row) => (
              <ReplenishmentRequestMobileCard
                key={row.id}
                row={row}
                showHistoryColumns={showHistoryColumns}
                onRowClick={onRowClick}
              />
            ))
          )}
        </div>
      ) : null}

      {/* Histórico: tabela em todas as telas. Aberto: tabela a partir de md. */}
      <DataTableCard
        className={showHistoryColumns ? 'min-w-0' : 'hidden min-w-0 md:block'}
      >
      <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-50/90">
            <th className="px-3 py-3 font-semibold text-zinc-700">Destino</th>
            <th className="px-3 py-3 font-semibold text-zinc-700">Prisma</th>
            {showHistoryColumns ? (
              <th className="px-3 py-3 font-semibold text-zinc-700">
                Solicitante
              </th>
            ) : null}
            <th className="px-3 py-3 font-semibold text-zinc-700">Tipo mov.</th>
            <th className="px-3 py-3 font-semibold text-zinc-700">Crítico</th>
            <th className="px-3 py-3 font-semibold text-zinc-700">Status</th>
            {showHistoryColumns ? (
              <th className="px-3 py-3 font-semibold text-zinc-700">
                Atualizado
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td
                colSpan={colSpan}
                className="px-4 py-8 text-zinc-500"
              >
                <div className="flex items-center justify-center">
                  <AccordionLoader />
                </div>
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td
                colSpan={colSpan}
                className="px-4 py-8 text-center text-zinc-500"
              >
                <EmptyStateMessage title={emptyMessage} />
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={row.id}
                className="cursor-pointer border-b border-zinc-100 transition-colors last:border-0 hover:bg-zinc-50/80 focus-visible:bg-zinc-50/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/30"
                tabIndex={0}
                role="button"
                aria-label={`Ver detalhe da solicitação para ${row.destination.name}`}
                onClick={() => onRowClick(row)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onRowClick(row);
                  }
                }}
              >
                <td className="px-3 py-3">
                  <div className="font-medium text-zinc-900">
                    {row.destination.name}
                  </div>
                  <MachineMetaText
                    assetNumber={row.destination.assetNumber}
                    pillar={row.destination.pillar}
                  />
                  <div className="text-xs text-zinc-500">
                    {row.destination.sector.typeSector}
                  </div>
                </td>
                <td className="px-3 py-3 font-mono text-zinc-800">
                  <span className="flex items-center gap-2">
                    <Box
                      className="size-4 shrink-0 text-blue-500"
                      aria-hidden
                    />
                    {row.movementCube}
                  </span>
                </td>
                {showHistoryColumns ? (
                  <td className="px-3 py-3 text-zinc-700">
                    {row.requestedBy.name}
                  </td>
                ) : null}
                <td className="px-3 py-3 text-zinc-700">
                  <span className="flex items-center gap-2">
                    <img
                      src={replenishmentMovimentTypeIconPath(
                        row.typeMovimentPallet,
                      )}
                      alt=""
                      aria-hidden
                      className="size-4 shrink-0 object-contain"
                    />
                    {movementTypeLabel(row.typeMovimentPallet)}
                  </span>
                </td>
                <td className="px-3 py-3 text-zinc-700">
                  <p
                    className={
                      row.priorityLevel === 'VERY_HIGH'
                        ? 'font-semibold text-red-600'
                        : 'text-zinc-500'
                    }
                  >
                    {row.priorityLevel === 'VERY_HIGH' ? 'Sim' : 'Não'}
                  </p>
                </td>
                <td className="px-3 py-3 text-zinc-700">
                  <p
                    className={cn(
                      'flex items-center gap-2',
                      requestStatusColorClass(row.status),
                    )}
                  >
                    {row.status === 'COMPLETED' ? (
                      <CheckIcon className="h-4 w-4" aria-hidden />
                    ) : null}
                    {requestStatusLabel(row.status)}
                  </p>
                </td>
                {showHistoryColumns ? (
                  <td className="whitespace-nowrap px-3 py-3 text-zinc-600">
                    {formatTaskDate(row.updatedAt)}
                  </td>
                ) : null}
              </tr>
            ))
          )}
        </tbody>
      </table>
      </DataTableCard>
    </>
  );
}

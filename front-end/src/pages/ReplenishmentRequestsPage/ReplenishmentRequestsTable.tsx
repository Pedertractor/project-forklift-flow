import { Card } from '@/components/ui/card';
import {
  formatTaskDate,
  replenishmentMovimentTypeLabel,
} from '@/utils/operator-moviment-display';
import { requestStatusLabel } from '@/utils/replenishment-labels';
import { cn } from '@/lib/utils';
import type { ReplenishmentRequestListItem } from '@/types/replenishment-request.types';
import type { RequestStatusValue } from '@/types/replenishment-request.types';
import { Box, CheckIcon } from 'lucide-react';

function movementTypeLabel(t: string): string {
  if (t === 'FORKLIFT' || t === 'ANY') {
    return replenishmentMovimentTypeLabel(t);
  }
  return t;
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
    <Card className="min-w-0 overflow-x-auto border border-zinc-200 shadow-sm">
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
                className="px-4 py-8 text-center text-zinc-500"
              >
                Carregando…
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td
                colSpan={colSpan}
                className="px-4 py-8 text-center text-zinc-500"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={row.id}
                className="cursor-pointer border-b border-zinc-100 transition-colors last:border-0 hover:bg-zinc-50/80 focus-visible:bg-zinc-50/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#005fb8]/30"
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
                  {movementTypeLabel(row.typeMovimentPallet)}
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
    </Card>
  );
}

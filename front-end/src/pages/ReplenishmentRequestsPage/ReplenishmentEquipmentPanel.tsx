import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type {
  MovimentPalletEquipmentType,
  MovimentPalletListItem,
} from '@/types/moviment-pallet.types';
import {
  movimentTypeLabel,
  movimentTypePublicIconPath,
} from '@/utils/operator-moviment-display';
import {
  incompleteAssignedTaskCount,
  isReadyToAcceptReplenishmentQueue,
  type EquipmentColumnStats,
} from './replenishment-equipment-status';
import AccordionLoader from '@/components/accordionLoader/accordion-loader';

export type { EquipmentColumnStats };

export interface ReplenishmentEquipmentPanelProps {
  forklifts: MovimentPalletListItem[];
  palletTrucks: MovimentPalletListItem[];
  forkliftStats: EquipmentColumnStats;
  palletTruckStats: EquipmentColumnStats;
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  /** Dentro da sidebar direita: sem cabeçalho duplicado. */
  embedded?: boolean;
}

function operatorRoleShort(
  role: string | undefined,
  equipmentType: MovimentPalletEquipmentType,
): string | null {
  if (equipmentType === 'FORKLIFT') return 'Empilhadeirista';
  if (equipmentType === 'PALLET_TRUCK') return 'Transpaleteirista';
  if (!role) return null;
  if (role === 'PALLET_TRANSPORTER') {
    return equipmentType === 'FORKLIFT' ? 'Empilhadeirista' : 'Transpaleteirista';
  }
  return null;
}

function EquipmentBlock({
  item,
  compact = false,
}: {
  item: MovimentPalletListItem;
  compact?: boolean;
}) {
  const unbound = item.operatorId === null;
  const activeTasks = incompleteAssignedTaskCount(item);
  const readyForQueue = isReadyToAcceptReplenishmentQueue(item);
  const operatorLabel = operatorRoleShort(item.operator?.role, item.type);

  const statusLabel = readyForQueue
    ? 'Livre'
    : unbound
      ? 'Sem operador'
      : activeTasks > 0
        ? 'Com tarefa'
        : 'Em operação';

  const statusClass = readyForQueue
    ? 'bg-green-100 text-green-700'
    : activeTasks > 0
      ? 'bg-amber-100 text-amber-700'
      : 'bg-zinc-100 text-zinc-600';

  return (
    <li className="rounded-xl border border-zinc-200 bg-white p-3">
      <div
        className={cn(
          'gap-2.5',
          compact
            ? 'flex flex-col items-center text-center'
            : 'flex items-start',
        )}
      >
        <div className="flex shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white px-1.5 py-1">
          <img
            src={movimentTypePublicIconPath(item.type)}
            alt=""
            className="h-9 w-auto max-w-[3.25rem] object-contain"
            width={52}
            height={36}
          />
        </div>
        <div className={cn('min-w-0', compact ? 'w-full' : 'flex-1')}>
          <p className="m-0 text-sm font-semibold tracking-tight text-zinc-900">
            {item.code}
          </p>
          <span
            className={cn(
              'mt-1 inline-flex rounded-full px-2 py-0.5 text-[0.625rem] font-medium uppercase tracking-wide',
              statusClass,
            )}
          >
            {statusLabel}
          </span>
          {!unbound && item.operator ? (
            <p className="mt-1.5 m-0 text-xs leading-snug text-zinc-600">
              {operatorLabel ? (
                <span className="font-medium text-zinc-800">
                  {operatorLabel}
                </span>
              ) : null}
              {item.operator.card ? (
                <span className="text-zinc-500">
                  {operatorLabel ? ' · ' : ''}
                  Crachá {item.operator.card}
                </span>
              ) : null}
            </p>
          ) : unbound ? (
            <p className="mt-1.5 m-0 text-xs text-zinc-500">
              Aguardando operador
            </p>
          ) : null}
        </div>
      </div>
    </li>
  );
}

function EquipmentColumn({
  type,
  items,
  stats,
  compact = false,
}: {
  type: MovimentPalletEquipmentType;
  items: MovimentPalletListItem[];
  stats: EquipmentColumnStats;
  compact?: boolean;
}) {
  const title = movimentTypeLabel(type);

  return (
    <div className="flex min-w-0 flex-col">
      <div className="mb-3 flex flex-col items-center gap-2 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50">
          <img
            src={movimentTypePublicIconPath(type)}
            alt=""
            className="h-10 w-auto max-w-[4.5rem] object-contain"
            width={72}
            height={40}
          />
        </div>
        <div>
          <h3 className="m-0 text-xs font-bold uppercase tracking-wide text-zinc-800">
            {title}
          </h3>
          <p className="mt-1 m-0 text-[0.6875rem] text-zinc-500">
            {stats.total} no setor · {stats.readyForQueue} livre
            {stats.readyForQueue === 1 ? '' : 's'}
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 px-3 py-4 text-center text-xs text-zinc-500">
          Nenhum operador de {title.toLowerCase()} em operação neste setor.
        </p>
      ) : (
        <ul
          className={cn(
            'm-0 grid list-none gap-2 p-0',
            compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2',
          )}
        >
          {items.map((item) => (
            <EquipmentBlock key={item.id} item={item} compact={compact} />
          ))}
        </ul>
      )}
    </div>
  );
}

export function ReplenishmentEquipmentPanel({
  forklifts,
  palletTrucks,
  forkliftStats,
  palletTruckStats,
  isLoading,
  isError,
  errorMessage,
  embedded = false,
}: ReplenishmentEquipmentPanelProps) {
  return (
    <Card
      className={cn(
        embedded
          ? 'border-0 bg-transparent p-0 shadow-none'
          : 'border border-zinc-200 p-4 shadow-sm',
      )}
    >
      {!embedded ? (
        <header className="mb-4 border-b border-zinc-100 pb-3">
          <h2 className="m-0 text-sm font-semibold text-zinc-900">
            Meios de locomoção
          </h2>
        </header>
      ) : null}

      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <AccordionLoader />
        </div>
      ) : isError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
          {errorMessage ?? 'Erro ao carregar equipamentos.'}
        </p>
      ) : (
        <div className="grid min-w-0 grid-cols-2 gap-3 sm:gap-4 p-3">
          <EquipmentColumn
            type="FORKLIFT"
            items={forklifts}
            stats={forkliftStats}
            compact={embedded}
          />
          <EquipmentColumn
            type="PALLET_TRUCK"
            items={palletTrucks}
            stats={palletTruckStats}
            compact={embedded}
          />
        </div>
      )}
    </Card>
  );
}

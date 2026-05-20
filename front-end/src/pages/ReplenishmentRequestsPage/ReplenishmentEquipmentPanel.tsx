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
  equipmentQueueInsight,
  incompleteAssignedTaskCount,
  isReadyToAcceptReplenishmentQueue,
  queueInsightMessage,
  type EquipmentColumnStats,
} from './replenishment-equipment-status';

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

function operatorRoleShort(role: string | undefined): string | null {
  if (!role) return null;
  if (role === 'FORKLIFT_OPERATOR') return 'Empilhadeirista';
  if (role === 'FOLLOW_UP_OPERATOR') return 'Transpaleteirista';
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
  const operatorLabel = operatorRoleShort(item.operator?.role);

  const ringClass = readyForQueue
    ? 'border-sky-300/90 bg-gradient-to-br from-sky-50/90 to-white'
    : unbound
      ? 'border-emerald-200/90 bg-gradient-to-br from-emerald-50/80 to-white'
      : activeTasks > 0
        ? 'border-amber-200/80 bg-gradient-to-br from-amber-50/50 to-white'
        : 'border-zinc-200 bg-white';

  return (
    <li
      className={cn(
        'rounded-xl border-2 p-3 shadow-sm transition-colors',
        ringClass,
      )}
    >
      <div
        className={cn(
          'gap-2.5',
          compact
            ? 'flex flex-col items-center text-center'
            : 'flex items-start',
        )}
      >
        <div
          className={cn(
            'flex shrink-0 items-center justify-center rounded-lg border px-1.5 py-1 bg-white',
            readyForQueue
              ? 'border-sky-200/80'
              : unbound
                ? 'border-emerald-200/80'
                : 'border-amber-200/70',
          )}
        >
          <img
            src={movimentTypePublicIconPath(item.type)}
            alt=""
            className="h-9 w-auto max-w-[3.25rem] object-contain"
            width={52}
            height={36}
          />
        </div>
        <div className={cn('min-w-0', compact ? 'w-full' : 'flex-1')}>
          <p className="m-0 font-mono text-sm font-bold tracking-tight text-zinc-900">
            {item.code}
          </p>
          {readyForQueue ? (
            <span className="mt-1 inline-flex rounded-full bg-sky-100 px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide text-sky-900">
              Livre para transporte
            </span>
          ) : unbound ? (
            <span className="mt-1 inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide text-emerald-800">
              Sem operador
            </span>
          ) : (
            <span className="mt-1 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide text-amber-900">
              {activeTasks > 0 ? 'Com tarefa ativa' : 'Em operação'}
            </span>
          )}
          {!unbound && item.operator ? (
            <p className="mt-1.5 m-0 text-xs leading-snug text-zinc-700">
              <span className="font-medium text-zinc-900">
                {item.operator.name}
              </span>
              {operatorLabel ? (
                <span className="text-zinc-500"> · {operatorLabel}</span>
              ) : null}
            </p>
          ) : unbound ? (
            <p className="mt-1.5 m-0 text
            xs text-zinc-600">
              {activeTasks === 0
                ? 'Sem tarefa — aguardando operador vincular'
                : 'Aguardando operador para retomar'}
            </p>
          ) : null}
          {readyForQueue ? (
            <p className="mt-1 m-0 text-[0.6875rem] font-medium text-sky-800">
              Pode acatar pedido de reposição na fila
            </p>
          ) : activeTasks > 0 ? (
            <p className="mt-1 m-0 text-[0.6875rem] text-zinc-500">
              {activeTasks === 1
                ? '1 tarefa em andamento'
                : `${activeTasks} tarefas em andamento`}
            </p>
          ) : !unbound ? (
            <p className="mt-1 m-0 text-[0.6875rem] text-zinc-500">
              Sem tarefa ativa no momento
            </p>
          ) : null}
        </div>
      </div>
    </li>
  );
}

function QueueInsightBanner({
  stats,
  type,
}: {
  stats: EquipmentColumnStats;
  type: MovimentPalletEquipmentType;
}) {
  const typeLabel = movimentTypeLabel(type);
  const message = queueInsightMessage(stats, typeLabel);
  if (!message) return null;

  const insight = equipmentQueueInsight(stats);
  return (
    <p
      className={cn(
        'mb-3 rounded-xl border px-3 py-2.5 text-[0.6875rem] leading-snug',
        insight === 'ready' &&
          'border-sky-200 bg-sky-50/90 text-sky-950',
        insight === 'waiting' &&
          'border-amber-200 bg-amber-50/90 text-amber-950',
        insight === 'idle_unbound' &&
          'border-zinc-200 bg-zinc-50 text-zinc-700',
        insight === 'neutral' &&
          'border-zinc-200 bg-zinc-50/80 text-zinc-600',
      )}
    >
      {message}
    </p>
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
        <div className="flex size-14 items-center justify-center rounded-2xl border-2 border-zinc-200 bg-zinc-50 shadow-sm">
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
          <p className="mt-1 m-0 text-[0.6875rem] leading-snug text-zinc-600">
            <span className="font-semibold text-sky-700">
              {stats.readyForQueue}{' '}
              {stats.readyForQueue === 1 ? 'livre p/ fila' : 'livres p/ fila'}
            </span>
            <span className="text-zinc-400"> · </span>
            <span className="font-semibold text-emerald-700">
              {stats.withoutActiveTasks}{' '}
              {stats.withoutActiveTasks === 1 ? 'sem tarefa' : 'sem tarefas'}
            </span>
          </p>
          <p className="mt-0.5 m-0 text-[0.625rem] text-zinc-500">
            {stats.total} no setor
            {stats.available > 0 ? (
              <>
                <span className="text-zinc-400"> · </span>
                {stats.available} sem operador
              </>
            ) : null}
          </p>
          {stats.queuePending > 0 ? (
            <p className="mt-0.5 m-0 text-[0.625rem] font-medium text-[#005fb8]">
              {stats.queuePending} pedido{stats.queuePending === 1 ? '' : 's'}{' '}
              na fila
            </p>
          ) : null}
        </div>
      </div>

      <QueueInsightBanner stats={stats} type={type} />

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 px-3 py-4 text-center text-xs text-zinc-500">
          Nenhuma {title.toLowerCase()} cadastrada neste filtro.
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
          <p className="mt-1 m-0 text-xs text-zinc-600">
            Veja quais equipamentos estão sem tarefa ativa e podem atender a
            fila de reposição.
          </p>
        </header>
      ) : null}

      {isLoading ? (
        <p className="py-6 text-center text-sm text-zinc-500">
          Carregando equipamentos…
        </p>
      ) : isError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
          {errorMessage ?? 'Erro ao carregar equipamentos.'}
        </p>
      ) : (
        <div className="grid min-w-0 grid-cols-2 gap-3 sm:gap-4">
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

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

export interface EquipmentColumnStats {
  total: number;
  available: number;
  queuePending: number;
}

export interface ReplenishmentEquipmentPanelProps {
  forklifts: MovimentPalletListItem[];
  palletTrucks: MovimentPalletListItem[];
  forkliftStats: EquipmentColumnStats;
  palletTruckStats: EquipmentColumnStats;
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
}

function operatorRoleShort(role: string | undefined): string | null {
  if (!role) return null;
  if (role === 'FORKLIFT_OPERATOR') return 'Empilhadeirista';
  if (role === 'FOLLOW_UP_OPERATOR') return 'Transpaleteirista';
  return null;
}

function EquipmentBlock({ item }: { item: MovimentPalletListItem }) {
  const available = item.operatorId === null;
  const taskCount = item._count.movimentPalletTasks;
  const operatorLabel = operatorRoleShort(item.operator?.role);

  return (
    <li
      className={cn(
        'rounded-xl border-2 bg-white p-3 shadow-sm transition-colors',
        available
          ? 'border-emerald-200/90 bg-gradient-to-br from-emerald-50/80 to-white'
          : 'border-amber-200/80 bg-gradient-to-br from-amber-50/50 to-white',
      )}
    >
      <div className="flex items-start gap-2.5">
        <div
          className={cn(
            'flex shrink-0 items-center justify-center rounded-lg border px-1.5 py-1',
            available
              ? 'border-emerald-200/80 bg-white'
              : 'border-amber-200/70 bg-white',
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
        <div className="min-w-0 flex-1">
          <p className="m-0 font-mono text-sm font-bold tracking-tight text-zinc-900">
            {item.code}
          </p>
          <span
            className={cn(
              'mt-1 inline-flex rounded-full px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide',
              available
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-amber-100 text-amber-900',
            )}
          >
            {available ? 'Disponível' : 'Em operação'}
          </span>
          {!available && item.operator ? (
            <p className="mt-1.5 m-0 text-xs leading-snug text-zinc-700">
              <span className="font-medium text-zinc-900">
                {item.operator.name}
              </span>
              {operatorLabel ? (
                <span className="text-zinc-500"> · {operatorLabel}</span>
              ) : null}
            </p>
          ) : available ? (
            <p className="mt-1.5 m-0 text-xs text-zinc-600">
              Pronta para vincular e acatar tarefas
            </p>
          ) : null}
          {taskCount > 0 ? (
            <p className="mt-1 m-0 text-[0.6875rem] text-zinc-500">
              {taskCount === 1
                ? '1 tarefa vinculada'
                : `${taskCount} tarefas vinculadas`}
            </p>
          ) : !available ? (
            <p className="mt-1 m-0 text-[0.6875rem] text-zinc-500">
              Sem tarefa ativa no momento
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
}: {
  type: MovimentPalletEquipmentType;
  items: MovimentPalletListItem[];
  stats: EquipmentColumnStats;
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
            <span className="font-semibold text-emerald-700">
              {stats.available}{' '}
              {stats.available === 1 ? 'disponível' : 'disponíveis'}
            </span>
            <span className="text-zinc-400"> · </span>
            <span>{stats.total} no setor</span>
          </p>
          {stats.queuePending > 0 ? (
            <p className="mt-0.5 m-0 text-[0.625rem] font-medium text-[#005fb8]">
              {stats.queuePending} pedido{stats.queuePending === 1 ? '' : 's'}{' '}
              na fila
            </p>
          ) : null}
        </div>
      </div>

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 px-3 py-4 text-center text-xs text-zinc-500">
          Nenhuma {title.toLowerCase()} cadastrada neste filtro.
        </p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {items.map((item) => (
            <EquipmentBlock key={item.id} item={item} />
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
}: ReplenishmentEquipmentPanelProps) {
  return (
    <Card className="border border-zinc-200 p-4 shadow-sm">
      <header className="mb-4 border-b border-zinc-100 pb-3">
        <h2 className="m-0 text-sm font-semibold text-zinc-900">
          Meios de locomoção
        </h2>
        <p className="mt-1 m-0 text-xs text-zinc-600">
          Disponibilidade no setor e operação atual de cada equipamento.
        </p>
      </header>

      {isLoading ? (
        <p className="py-6 text-center text-sm text-zinc-500">
          Carregando equipamentos…
        </p>
      ) : isError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
          {errorMessage ?? 'Erro ao carregar equipamentos.'}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <EquipmentColumn
            type="FORKLIFT"
            items={forklifts}
            stats={forkliftStats}
          />
          <EquipmentColumn
            type="PALLET_TRUCK"
            items={palletTrucks}
            stats={palletTruckStats}
          />
        </div>
      )}
    </Card>
  );
}

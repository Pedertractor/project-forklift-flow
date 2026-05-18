import type { MovimentPalletListItem } from '@/types/moviment-pallet.types';

export function incompleteAssignedTaskCount(
  item: MovimentPalletListItem,
): number {
  return item.incompleteAssignedTaskCount ?? 0;
}

/** Operador vinculado e sem tarefa em aberto — pode acatar pedido na fila agora. */
export function isReadyToAcceptReplenishmentQueue(
  item: MovimentPalletListItem,
): boolean {
  return item.operatorId !== null && incompleteAssignedTaskCount(item) === 0;
}

/** Sem tarefa ativa no equipamento (com ou sem operador vinculado). */
export function hasNoActiveTasks(item: MovimentPalletListItem): boolean {
  return incompleteAssignedTaskCount(item) === 0;
}

export interface EquipmentColumnStats {
  total: number;
  /** Sem operador vinculado. */
  available: number;
  queuePending: number;
  /** Com operador e sem tarefa em aberto — apto a acatar fila. */
  readyForQueue: number;
  /** Todos sem tarefa ativa no momento. */
  withoutActiveTasks: number;
}

export function buildEquipmentColumnStats(
  items: MovimentPalletListItem[],
  queuePending: number,
): EquipmentColumnStats {
  return {
    total: items.length,
    available: items.filter((i) => i.operatorId === null).length,
    queuePending,
    readyForQueue: items.filter(isReadyToAcceptReplenishmentQueue).length,
    withoutActiveTasks: items.filter(hasNoActiveTasks).length,
  };
}

export type EquipmentQueueInsight =
  | 'ready'
  | 'waiting'
  | 'idle_unbound'
  | 'neutral';

export function equipmentQueueInsight(stats: EquipmentColumnStats): EquipmentQueueInsight {
  if (stats.queuePending > 0) {
    if (stats.readyForQueue > 0) return 'ready';
    return 'waiting';
  }
  if (stats.withoutActiveTasks > 0 && stats.readyForQueue === 0) {
    return 'idle_unbound';
  }
  return 'neutral';
}

export function queueInsightMessage(
  stats: EquipmentColumnStats,
  typeLabel: string,
): string | null {
  const insight = equipmentQueueInsight(stats);
  if (insight === 'ready') {
    const n = stats.readyForQueue;
    return `${n} ${typeLabel} ${n === 1 ? 'sem tarefa ativa' : 'sem tarefas ativas'} — ${n === 1 ? 'pode acatar' : 'podem acatar'} reposição na fila agora`;
  }
  if (insight === 'waiting') {
    return `Nenhuma ${typeLabel.toLowerCase()} livre no momento — ${stats.queuePending} pedido${stats.queuePending === 1 ? '' : 's'} aguardando transporte`;
  }
  if (insight === 'idle_unbound') {
    const unbound = stats.withoutActiveTasks - stats.readyForQueue;
    if (unbound <= 0) return null;
    return `${unbound} ${typeLabel} ${unbound === 1 ? 'sem tarefa' : 'sem tarefas'}, aguardando operador vincular`;
  }
  if (stats.withoutActiveTasks > 0) {
    const n = stats.withoutActiveTasks;
    return `${n} ${typeLabel} ${n === 1 ? 'sem tarefa ativa' : 'sem tarefas ativas'} no setor`;
  }
  return null;
}

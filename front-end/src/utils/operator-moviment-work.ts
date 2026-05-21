import type { ForkliftTaskStatusApi } from '@/types/operator-moviment-pallet.types';

export const OPEN_MOVIMENT_TASK_STATUSES: readonly ForkliftTaskStatusApi[] = [
  'CREATED',
  'ASSIGNED',
  'IN_PROGRESS',
];

export function isOpenMovimentTaskStatus(status: ForkliftTaskStatusApi): boolean {
  return OPEN_MOVIMENT_TASK_STATUSES.includes(status);
}

export function countOpenMovimentTasks(
  tasks: ReadonlyArray<{ status: ForkliftTaskStatusApi }>,
): number {
  return tasks.filter((t) => isOpenMovimentTaskStatus(t.status)).length;
}

/** Tarefas em aberto vinculadas ao equipamento do operador (evita contar fila do setor). */
export function countOpenMovimentTasksForPallet(
  tasks: ReadonlyArray<{
    status: ForkliftTaskStatusApi;
    assignedMovimentPalletId: string | null;
  }>,
  myPalletId: string | null | undefined,
): number {
  if (!myPalletId) {
    return 0;
  }
  return tasks.filter(
    (t) =>
      isOpenMovimentTaskStatus(t.status) &&
      t.assignedMovimentPalletId === myPalletId,
  ).length;
}

export function filterTasksForMyPallet<
  T extends { assignedMovimentPalletId: string | null },
>(tasks: ReadonlyArray<T>, myPalletId: string | null | undefined): T[] {
  if (!myPalletId) {
    return [];
  }
  return tasks.filter((t) => t.assignedMovimentPalletId === myPalletId);
}

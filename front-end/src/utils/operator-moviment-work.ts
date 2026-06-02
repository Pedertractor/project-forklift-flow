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

function taskAssignedOperatorId(task: {
  assignedOperatorId?: string | null;
  assignedMovimentPalletId?: string | null;
}): string | null {
  return task.assignedOperatorId ?? task.assignedMovimentPalletId ?? null;
}

/** Tarefas em aberto atribuídas ao operador logado. */
export function countOpenMovimentTasksForOperator(
  tasks: ReadonlyArray<{
    status: ForkliftTaskStatusApi;
    assignedOperatorId?: string | null;
    assignedMovimentPalletId?: string | null;
  }>,
  myOperatorUserId: string | null | undefined,
): number {
  if (!myOperatorUserId) {
    return 0;
  }
  return tasks.filter(
    (t) =>
      isOpenMovimentTaskStatus(t.status) &&
      taskAssignedOperatorId(t) === myOperatorUserId,
  ).length;
}

/** @deprecated Use countOpenMovimentTasksForOperator */
export const countOpenMovimentTasksForPallet = countOpenMovimentTasksForOperator;

export function filterTasksForMyOperator<
  T extends {
    assignedOperatorId?: string | null;
    assignedMovimentPalletId?: string | null;
  },
>(tasks: ReadonlyArray<T>, myOperatorUserId: string | null | undefined): T[] {
  if (!myOperatorUserId) {
    return [];
  }
  return tasks.filter((t) => taskAssignedOperatorId(t) === myOperatorUserId);
}

/** @deprecated Use filterTasksForMyOperator */
export const filterTasksForMyPallet = filterTasksForMyOperator;

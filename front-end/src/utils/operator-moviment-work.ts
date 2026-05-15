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

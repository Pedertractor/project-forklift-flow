import type { QueryClient } from '@tanstack/react-query';
import type {
  DeliveryTaskListItem,
  MachineTaskStatusValue,
  PickupTaskListItem,
} from '@/types/machine-task.types';
import type {
  OperatorMovimentWsDeliveryTaskUpdated,
  OperatorMovimentWsMachineProductionStatusUpdated,
  OperatorMovimentWsPickupTaskUpdated,
} from '@/types/operator-moviment-ws.types';
import type { MachineListItem, MachineProductionStatus } from '@/types/machine.types';

export const OPERATOR_MACHINE_TASKS_QUERY_KEY = [
  'operator-machine',
  'machine-tasks',
] as const;

export const OPERATOR_MACHINE_MY_MACHINE_QUERY_KEY = [
  'operator-machine',
  'my-machine',
] as const;

type MachineTasksCache = {
  deliveryTasks: DeliveryTaskListItem[];
  pickupTasks: PickupTaskListItem[];
  openSupply: { id: string; status: string } | null;
};

function patchTaskStatus<T extends { id: string; status: MachineTaskStatusValue }>(
  tasks: T[],
  taskId: string,
  status: MachineTaskStatusValue,
): T[] {
  let changed = false;
  const next = tasks.map((task) => {
    if (task.id !== taskId || task.status === status) {
      return task;
    }
    changed = true;
    return {
      ...task,
      status,
      statusSince: new Date().toISOString(),
    };
  });
  return changed ? next : tasks;
}

export function patchPickupTaskInMachineTasksCache(
  queryClient: QueryClient,
  event: Pick<OperatorMovimentWsPickupTaskUpdated, 'taskId' | 'status'>,
): boolean {
  let patched = false;
  queryClient.setQueryData<MachineTasksCache>(
    [...OPERATOR_MACHINE_TASKS_QUERY_KEY],
    (prev) => {
      if (!prev) {
        return prev;
      }
      const pickupTasks = patchTaskStatus(
        prev.pickupTasks,
        event.taskId,
        event.status,
      );
      if (pickupTasks === prev.pickupTasks) {
        return prev;
      }
      patched = true;
      return { ...prev, pickupTasks };
    },
    { updatedAt: Date.now() },
  );
  return patched;
}

export function patchDeliveryTaskInMachineTasksCache(
  queryClient: QueryClient,
  event: Pick<OperatorMovimentWsDeliveryTaskUpdated, 'taskId' | 'status'>,
): boolean {
  let patched = false;
  queryClient.setQueryData<MachineTasksCache>(
    [...OPERATOR_MACHINE_TASKS_QUERY_KEY],
    (prev) => {
      if (!prev) {
        return prev;
      }
      const deliveryTasks = patchTaskStatus(
        prev.deliveryTasks,
        event.taskId,
        event.status,
      );
      if (deliveryTasks === prev.deliveryTasks) {
        return prev;
      }
      patched = true;
      return { ...prev, deliveryTasks };
    },
    { updatedAt: Date.now() },
  );
  return patched;
}

/** Máquina vinculada: `my-machine` ou inferida das tarefas já em cache. */
export function resolveBoundMachineIdFromCache(
  queryClient: QueryClient,
): string | null {
  const fromMyMachine = queryClient.getQueryData<{ id: string } | null>([
    ...OPERATOR_MACHINE_MY_MACHINE_QUERY_KEY,
  ]);
  if (fromMyMachine?.id) {
    return fromMyMachine.id;
  }
  const tasks = queryClient.getQueryData<MachineTasksCache>([
    ...OPERATOR_MACHINE_TASKS_QUERY_KEY,
  ]);
  if (!tasks) {
    return null;
  }
  const openPickup = tasks.pickupTasks.find(
    (p) => p.status === 'CREATED' || p.status === 'ASSIGNED' || p.status === 'IN_PROGRESS',
  );
  if (openPickup?.machineId) {
    return openPickup.machineId;
  }
  const openDelivery = tasks.deliveryTasks.find(
    (d) => d.status === 'CREATED' || d.status === 'ASSIGNED' || d.status === 'IN_PROGRESS',
  );
  return openDelivery?.machineId ?? null;
}

export function patchMachineProductionStatusInCache(
  queryClient: QueryClient,
  event: Pick<
    OperatorMovimentWsMachineProductionStatusUpdated,
    'machineId' | 'productionStatus'
  >,
): boolean {
  let patched = false;
  queryClient.setQueryData<MachineListItem | null>(
    [...OPERATOR_MACHINE_MY_MACHINE_QUERY_KEY],
    (prev) => {
      if (!prev || prev.id !== event.machineId) {
        return prev;
      }
      const nextStatus = event.productionStatus as MachineProductionStatus;
      if (prev.productionStatus === nextStatus) {
        return prev;
      }
      patched = true;
      return { ...prev, productionStatus: nextStatus };
    },
    { updatedAt: Date.now() },
  );
  return patched;
}

export function refetchOperatorMyMachine(queryClient: QueryClient): void {
  void queryClient.refetchQueries({
    queryKey: [...OPERATOR_MACHINE_MY_MACHINE_QUERY_KEY],
    type: 'active',
  });
}

export function applyMachineOperatorWsEvent(
  queryClient: QueryClient,
  event:
    | Pick<OperatorMovimentWsPickupTaskUpdated, 'type' | 'taskId' | 'status'>
    | Pick<OperatorMovimentWsDeliveryTaskUpdated, 'type' | 'taskId' | 'status'>,
): boolean {
  if (event.type === 'pickup_task_updated') {
    return patchPickupTaskInMachineTasksCache(queryClient, event);
  }
  if (event.type === 'delivery_task_updated') {
    return patchDeliveryTaskInMachineTasksCache(queryClient, event);
  }
  return false;
}

export function refetchOperatorMachineTasks(queryClient: QueryClient): void {
  void queryClient.refetchQueries({
    queryKey: [...OPERATOR_MACHINE_TASKS_QUERY_KEY],
    type: 'active',
  });
  void queryClient.refetchQueries({
    queryKey: ['operator-machine', 'operator-supply-requests'],
    type: 'active',
  });
}

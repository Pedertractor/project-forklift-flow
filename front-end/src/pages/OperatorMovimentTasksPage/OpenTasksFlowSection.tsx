import { type ReactNode } from 'react';
import {
  DeliverFlowAcceptButton,
  DeliverFlowActionFooter,
  DeliverFlowCard,
  DeliverFlowCardHeader,
  DeliverThreeStepFlow,
  type DeliverFlowStepConfig,
} from '@/components/operator-moviment/deliver-three-step-flow';
import {
  expeditionAreaDetail,
  goToReceivingDetail,
  machineLocationDetail,
  prismaDetail,
  receivingAreaDetail,
} from '@/components/operator-moviment/route-flow-step-details';
import {
  formatTaskDate,
  isCriticalPriority,
} from '@/utils/operator-moviment-display';
import { taskStatusLabelPt } from '@/utils/operator-moviment-labels';
import type {
  ForkliftTaskTypeApi,
  OperatorMovimentTaskItem,
} from '@/types/operator-moviment-pallet.types';
import { isOpenMovimentTaskStatus } from '@/utils/operator-moviment-work';
import { Check, Layers2 } from 'lucide-react';
import AccordionLoader from '@/components/accordionLoader/accordion-loader';

interface TaskRouteGroup {
  machineId: string;
  machineName: string;
  machinePosition: string;
  priority: OperatorMovimentTaskItem['request']['priorityLevel'];
  deliverTask: OperatorMovimentTaskItem | null;
  pickupTask: OperatorMovimentTaskItem | null;
  createdAt: string;
}

interface CompleteMutationHandlers {
  isPending: boolean;
  variables?: string;
  mutate: (id: string) => void;
}

function canCompleteDeliver(
  type: ForkliftTaskTypeApi,
  status: string,
): boolean {
  return (
    type === 'DELIVER_TO_MACHINE' &&
    (status === 'CREATED' || status === 'ASSIGNED' || status === 'IN_PROGRESS')
  );
}

function canCompletePickup(
  task: OperatorMovimentTaskItem,
  myPalletId: string | null,
): boolean {
  if (task.type !== 'PICKUP_TO_EXPEDITION') {
    return false;
  }
  if (
    task.status !== 'CREATED' &&
    task.status !== 'ASSIGNED' &&
    task.status !== 'IN_PROGRESS'
  ) {
    return false;
  }
  if (myPalletId == null) {
    return false;
  }
  if (
    task.assignedMovimentPalletId != null &&
    task.assignedMovimentPalletId !== myPalletId
  ) {
    return false;
  }
  return true;
}

function groupOpenTasks(tasks: OperatorMovimentTaskItem[]): TaskRouteGroup[] {
  const byMachine = new Map<string, TaskRouteGroup>();
  const openTasks = tasks.filter((t) => isOpenMovimentTaskStatus(t.status));

  for (const task of openTasks) {
    const dest = task.request.destination;
    let group = byMachine.get(dest.id);
    if (!group) {
      group = {
        machineId: dest.id,
        machineName: dest.name,
        machinePosition: dest.position,
        priority: task.request.priorityLevel,
        deliverTask: null,
        pickupTask: null,
        createdAt: task.createdAt,
      };
      byMachine.set(dest.id, group);
    }
    if (task.type === 'DELIVER_TO_MACHINE') {
      group.deliverTask = task;
    } else {
      group.pickupTask = task;
    }
    if (
      new Date(task.createdAt).getTime() < new Date(group.createdAt).getTime()
    ) {
      group.createdAt = task.createdAt;
    }
    if (
      task.request.priorityLevel === 'VERY_HIGH' ||
      (task.request.priorityLevel === 'HIGH' && group.priority !== 'VERY_HIGH')
    ) {
      group.priority = task.request.priorityLevel;
    }
  }

  return Array.from(byMachine.values());
}

function buildOpenTaskSteps(
  group: TaskRouteGroup,
  myPalletId: string | null,
): DeliverFlowStepConfig[] {
  const deliverOpen =
    group.deliverTask !== null &&
    canCompleteDeliver(group.deliverTask.type, group.deliverTask.status);
  const pickupOpen =
    group.pickupTask !== null &&
    canCompletePickup(group.pickupTask, myPalletId);
  const deliverCube = group.deliverTask?.request.movementCube;
  const machineDetails = [machineLocationDetail(group.machineName)];

  if (deliverOpen && pickupOpen) {
    return [
      {
        stepNumber: 1,
        stepId: 'receiving',
        label: 'Pegue o pallet no recebimento',
        details: [
          receivingAreaDetail(),
          prismaDetail(deliverCube, 'pick-at-receiving'),
        ],
      },
      {
        stepNumber: 2,
        stepId: 'machine',
        label: 'Entregue o pallet na máquina',
        details: [
          ...machineDetails,
          prismaDetail(deliverCube, 'deliver-to-machine'),
        ],
      },
      {
        stepNumber: 3,
        stepId: 'pallet',
        label: 'Pallet na máquina',
        details: machineDetails,
      },
      {
        stepNumber: 4,
        stepId: 'expedition',
        label: 'Expedição',
        details: [expeditionAreaDetail('Entregar na expedição')],
      },
    ];
  }

  if (deliverOpen && group.deliverTask) {
    return [
      {
        stepNumber: 1,
        stepId: 'receiving',
        label: 'Vá ao recebimento',
        details: [goToReceivingDetail()],
      },
      {
        stepNumber: 2,
        stepId: 'pallet',
        label: 'Pegue o pallet no recebimento',
        details: [
          receivingAreaDetail(),
          prismaDetail(deliverCube, 'pick-at-receiving'),
        ],
      },
      {
        stepNumber: 3,
        stepId: 'machine',
        label: 'Entregue o pallet na máquina',
        details: [
          ...machineDetails,
          prismaDetail(deliverCube, 'deliver-to-machine'),
        ],
      },
    ];
  }

  return [
    {
      stepNumber: 1,
      stepId: 'machine',
      label: 'Retire o pallet na máquina',
      details: machineDetails,
    },
    {
      stepNumber: 2,
      stepId: 'expedition',
      label: 'Expedição',
      details: [expeditionAreaDetail()],
    },
  ];
}

function OpenActivityHeading() {
  return (
    <p className="m-0 flex items-center gap-2 px-0.5 text-sm font-semibold text-zinc-900 md:text-base">
      <span
        className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand"
        aria-hidden
      >
        <Layers2 className="size-4" strokeWidth={2.25} />
      </span>
      Atividade em andamento
    </p>
  );
}

function TaskConfirmationProgressBar() {
  return (
    <div
      className="relative h-1 w-full max-w-[17rem] overflow-hidden rounded-full bg-zinc-200"
      role="progressbar"
      aria-valuetext="Enviando confirmação"
      aria-busy="true"
    >
      <div className="absolute inset-y-0 w-[38%] rounded-full bg-brand motion-safe:animate-task-confirm-progress" />
    </div>
  );
}

function OpenTaskRouteCard({
  group,
  bound,
  busy,
  myPalletId,
  completeDeliverMut,
  completePickupMut,
}: {
  group: TaskRouteGroup;
  bound: boolean;
  busy: boolean;
  myPalletId: string | null;
  completeDeliverMut: CompleteMutationHandlers;
  completePickupMut: CompleteMutationHandlers;
}) {
  const steps = buildOpenTaskSteps(group, myPalletId);
  const deliverOpen =
    group.deliverTask !== null &&
    canCompleteDeliver(group.deliverTask.type, group.deliverTask.status);
  const pickupOpen =
    group.pickupTask !== null &&
    canCompletePickup(group.pickupTask, myPalletId);

  const isCombined = deliverOpen && pickupOpen;
  const activeTask = deliverOpen
    ? group.deliverTask
    : pickupOpen
      ? group.pickupTask
      : null;
  const statusLabel = activeTask ? taskStatusLabelPt(activeTask.status) : null;
  const sinceLabel = activeTask ? formatTaskDate(activeTask.createdAt) : null;
  const isCritical = isCriticalPriority(group.priority);

  const cardTitle = isCombined
    ? 'Rota completa na máquina'
    : deliverOpen
      ? 'Entrega em andamento'
      : 'Retirada em andamento';

  const deliverPending =
    !!group.deliverTask &&
    completeDeliverMut.isPending &&
    completeDeliverMut.variables === group.deliverTask.id;
  const pickupPending =
    !!group.pickupTask &&
    completePickupMut.isPending &&
    completePickupMut.variables === group.pickupTask.id;

  const footerHint =
    deliverOpen && pickupOpen
      ? 'Conclua a entrega na máquina para habilitar a confirmação na expedição.'
      : null;

  return (
    <DeliverFlowCard>
       
      <div className="px-5 py-4 sm:px-8">
        <DeliverThreeStepFlow steps={steps} />
        {footerHint ? (
          <p className="mt-5 text-center text-xs leading-relaxed text-zinc-500">
            {footerHint}
          </p>
        ) : null}
      </div>

      <DeliverFlowActionFooter isCritical={isCritical}>
        <div className="flex flex-col items-center gap-2">
          {deliverOpen && group.deliverTask ? (
            <DeliverFlowAcceptButton
              disabled={!bound || busy || deliverPending}
              onClick={() => completeDeliverMut.mutate(group.deliverTask!.id)}
            >
              {deliverPending ? (
                'Registrando…'
              ) : (
                <>
                  <Check className="size-5 shrink-0" aria-hidden />
                  Concluir entrega
                </>
              )}
            </DeliverFlowAcceptButton>
          ) : pickupOpen && group.pickupTask ? (
            <DeliverFlowAcceptButton
              disabled={!bound || busy || pickupPending}
              onClick={() => completePickupMut.mutate(group.pickupTask!.id)}
            >
              {pickupPending ? (
                'Registrando…'
              ) : (
                <>
                  <Check className="size-5 shrink-0" aria-hidden />
                  Confirmar na expedição
                </>
              )}
            </DeliverFlowAcceptButton>
          ) : null}
          {deliverPending || pickupPending ? (
            <TaskConfirmationProgressBar />
          ) : null}
        </div>
      </DeliverFlowActionFooter>
    </DeliverFlowCard>
  );
}

export interface OpenTasksFlowSectionProps {
  /** Todas as tarefas atribuídas (abertas e concluídas) para agrupar rotas combinadas. */
  tasks: OperatorMovimentTaskItem[];
  myPalletId: string | null;
  isLoading: boolean;
  bound: boolean;
  busy: boolean;
  completeDeliverMut: CompleteMutationHandlers;
  completePickupMut: CompleteMutationHandlers;
  emptyAction: ReactNode;
}

export function OpenTasksFlowSection({
  tasks,
  myPalletId,
  isLoading,
  bound,
  busy,
  completeDeliverMut,
  completePickupMut,
  emptyAction,
}: OpenTasksFlowSectionProps) {
  const groups = groupOpenTasks(tasks).filter((group) => {
    const deliverOpen =
      group.deliverTask !== null &&
      canCompleteDeliver(group.deliverTask.type, group.deliverTask.status);
    const pickupOpen =
      group.pickupTask !== null &&
      canCompletePickup(group.pickupTask, myPalletId);
    return deliverOpen || pickupOpen;
  });
  const hasOpenWork = groups.length > 0;

  return (
    <section className="mt-6" aria-labelledby="open-tasks-flow-heading">
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <AccordionLoader />
        </div>
      ) : null}

      {!isLoading && !hasOpenWork ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/80 px-4 py-10 text-center">
          <p className="m-0 text-sm text-zinc-600">
            Nenhuma tarefa em aberto no momento.
          </p>
          <div className="mt-4 flex justify-center">{emptyAction}</div>
        </div>
      ) : null}

      {!isLoading && hasOpenWork && groups.length > 0 ? (
        <ul className="m-0 flex list-none flex-col gap-5 p-0">
          {groups.map((group) => (
            <li key={group.machineId} className="flex flex-col gap-2.5">
              <OpenActivityHeading />
              <OpenTaskRouteCard
                group={group}
                bound={bound}
                busy={busy}
                myPalletId={myPalletId}
                completeDeliverMut={completeDeliverMut}
                completePickupMut={completePickupMut}
              />
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

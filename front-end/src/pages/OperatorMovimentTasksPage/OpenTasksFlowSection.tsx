import { Fragment, type ReactNode } from 'react';
import {
  expeditionAreaDetail,
  machineLocationDetail,
  prismaDetail,
  receivingAreaDetail,
  RouteFlowStepDetails,
  type RouteFlowDetailItem,
} from '@/components/operator-moviment/route-flow-step-details';
import {
  routeFlowStepIcon,
  SuggestionFlowConnector,
  type RouteFlowStepId,
} from '@/components/operator-moviment/route-flow-icons';
import { ForkliftLoader } from '@/components/forklift-loader/forklifit-loader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/card';
import {
  formatTaskDate,
  priorityLabel,
} from '@/utils/operator-moviment-display';
import { taskStatusLabelPt } from '@/utils/operator-moviment-labels';
import type {
  ForkliftTaskTypeApi,
  OperatorMovimentTaskItem,
} from '@/types/operator-moviment-pallet.types';
import { isOpenMovimentTaskStatus } from '@/utils/operator-moviment-work';
import { cn } from '@/lib/utils';
import { CheckIcon } from 'lucide-react';

type StepState = 'done' | 'current' | 'upcoming';

/** Alinhado a `route-flow-icons` (recebimento → máquina → pallet → expedição). */
type FlowStepId = RouteFlowStepId;

interface FlowStepConfig {
  id: FlowStepId;
  label: string;
  details: RouteFlowDetailItem[];
  state: StepState;
}

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

function groupOpenTasks(
  tasks: OperatorMovimentTaskItem[],
  myPalletId: string | null,
): TaskRouteGroup[] {
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
    const rank = { VERY_HIGH: 0, HIGH: 0, NORMAL: 1 };
    if (rank[task.request.priorityLevel] < rank[group.priority]) {
      group.priority = task.request.priorityLevel;
    }
  }

  for (const group of byMachine.values()) {
    if (group.pickupTask && !group.deliverTask) {
      const pickupPalletId = group.pickupTask.assignedMovimentPalletId;
      const completedDeliver = tasks.find(
        (t) =>
          t.type === 'DELIVER_TO_MACHINE' &&
          t.status === 'COMPLETED' &&
          t.request.destination.id === group.machineId &&
          (t.assignedMovimentPalletId === pickupPalletId ||
            (pickupPalletId == null &&
              myPalletId != null &&
              t.assignedMovimentPalletId === myPalletId)),
      );
      if (completedDeliver) {
        group.deliverTask = completedDeliver;
      }
    }
  }

  return [...byMachine.values()].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

function buildSteps(
  group: TaskRouteGroup,
  myPalletId: string | null,
): FlowStepConfig[] {
  const deliverOpen =
    group.deliverTask !== null &&
    canCompleteDeliver(group.deliverTask.type, group.deliverTask.status);
  const pickupOpen =
    group.pickupTask !== null &&
    canCompletePickup(group.pickupTask, myPalletId);
  const deliverCube = group.deliverTask?.request.movementCube;
  const machineDetails = [
    machineLocationDetail(group.machineName, group.machinePosition),
  ];

  if (deliverOpen && pickupOpen) {
    return [
      {
        id: 'receiving',
        label: 'Pegue o pallet no recebimento',
        details: [
          receivingAreaDetail(),
          prismaDetail(deliverCube, 'pick-at-receiving'),
        ],
        state: deliverOpen ? 'current' : 'done',
      },
      {
        id: 'machine',
        label: 'Entregue o pallet na máquina',
        details: [
          ...machineDetails,
          prismaDetail(deliverCube, 'deliver-to-machine'),
        ],
        state: deliverOpen ? 'current' : pickupOpen ? 'current' : 'done',
      },
      {
        id: 'pallet',
        label: 'Pallet na máquina',
        details: machineDetails,
        state: deliverOpen ? 'upcoming' : pickupOpen ? 'current' : 'done',
      },
      {
        id: 'expedition',
        label: 'Expedição',
        details: [expeditionAreaDetail('Entregar na expedição')],
        state: pickupOpen ? 'current' : deliverOpen ? 'upcoming' : 'done',
      },
    ];
  }

  if (deliverOpen && group.deliverTask) {
    return [
      {
        id: 'receiving',
        label: 'Vá ao recebimento',
        details: [receivingAreaDetail('Deslocar-se até o recebimento')],
        state: deliverOpen ? 'current' : 'done',
      },
      {
        id: 'receiving',
        label: 'Pegue o pallet no recebimento',
        details: [
          receivingAreaDetail(),
          prismaDetail(deliverCube, 'pick-at-receiving'),
        ],
        state: deliverOpen ? 'current' : 'done',
      },
      {
        id: 'machine',
        label: 'Entregue o pallet na máquina',
        details: [
          ...machineDetails,
          prismaDetail(deliverCube, 'deliver-to-machine'),
        ],
        state: deliverOpen ? 'current' : 'done',
      },
    ];
  }

  return [
    {
      id: 'machine',
      label: 'Retire o pallet na máquina',
      details: machineDetails,
      state: pickupOpen ? 'current' : 'done',
    },
    {
      id: 'expedition',
      label: 'Expedição',
      details: [expeditionAreaDetail()],
      state: pickupOpen ? 'current' : 'done',
    },
  ];
}

/** Largura fixa da coluna = alinhamento ícone, texto, botão e seta entre passos. */
const flowStepColumnClass = 'w-[9.25rem] shrink-0 sm:w-[10.5rem]';

function TaskConfirmationProgressBar() {
  return (
    <div
      className="relative h-1 w-full overflow-hidden rounded-full bg-zinc-200"
      role="progressbar"
      aria-valuetext="Enviando confirmação"
      aria-busy="true"
    >
      <div className="absolute inset-y-0 w-[38%] rounded-full bg-brand motion-safe:animate-task-confirm-progress" />
    </div>
  );
}

const flowStepActionButtonClass =
  'h-8 w-full px-2 py-1.5 text-[0.6875rem] font-semibold leading-tight';

function FlowStepColumn({
  step,
  action,
}: {
  step: FlowStepConfig;
  action: ReactNode;
}) {
  const Icon = routeFlowStepIcon(step.id);
  const isCurrent = step.state === 'current';
  const isDone = step.state === 'done';

  return (
    <div
      className={cn(
        flowStepColumnClass,
        'flex flex-col items-center text-center',
      )}
    >
      {/* Faixa com a mesma altura do conector — seta alinha ao centro do ícone */}
      <div className="flex h-12 w-full shrink-0 items-center justify-center sm:h-14 ">
        <div
          className={cn(
            'relative flex size-12 items-center justify-center rounded-full border-2 bg-white shadow-sm transition-colors sm:size-14',
            isDone && 'border-emerald-500 bg-emerald-50  text-emerald-700',
            isCurrent &&
              'border-black bg-brand/10 text-black ring-4 ring-black/20',
            !isDone && !isCurrent && 'border-zinc-200 text-zinc-400',
          )}
        >
          {isDone ? (
            <svg
              className="size-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              aria-hidden
            >
              <path
                d="M5 12l5 5L20 7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <Icon className="size-6 sm:size-7" />
          )}
          {isCurrent ? (
            <span className="absolute -bottom-1 left-1/2 size-2.5 -translate-x-1/2 rounded-full bg-brand animate-pulse ring-2 ring-white" />
          ) : null}
        </div>
      </div>

      {action ? (
        <div className="mt-2 flex w-full flex-col items-center gap-1.5">
          {action}
        </div>
      ) : null}

      <p
        className={cn(
          'mt-2.5 text-[0.6875rem] font-bold uppercase tracking-wide',
          isCurrent
            ? 'text-brand'
            : isDone
              ? 'text-emerald-700'
              : 'text-zinc-500',
        )}
      >
        {step.label}
      </p>
      <div className="mt-1.5 w-full">
        <RouteFlowStepDetails items={step.details} />
      </div>
    </div>
  );
}

function RouteFlowTrack({
  steps,
  renderStepAction,
}: {
  steps: FlowStepConfig[];
  renderStepAction: (step: FlowStepConfig) => ReactNode;
}) {
  return (
    <div className="w-full min-w-0 overflow-x-auto py-1 [-webkit-overflow-scrolling:touch]">
      <div className="flex min-w-max items-start justify-center px-1">
        {steps.map((step, index) => (
          <Fragment key={`${step.id}-${index}`}>
            <FlowStepColumn step={step} action={renderStepAction(step)} />
            {index < steps.length - 1 ? (
              <SuggestionFlowConnector
                active={step.state === 'done' || step.state === 'current'}
              />
            ) : null}
          </Fragment>
        ))}
      </div>
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
  const steps = buildSteps(group, myPalletId);
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

  const deliverPending =
    !!group.deliverTask &&
    completeDeliverMut.isPending &&
    completeDeliverMut.variables === group.deliverTask.id;
  const pickupPending =
    !!group.pickupTask &&
    completePickupMut.isPending &&
    completePickupMut.variables === group.pickupTask.id;

  const renderStepAction = (step: FlowStepConfig) => {
    if (step.id === 'machine' && deliverOpen && group.deliverTask) {
      return (
        <>
          <Button
            type="button"
            className={cn(
              flowStepActionButtonClass,
              'inline-flex items-center justify-center gap-1.5 bg-brand text-white hover:bg-brand-hover',
            )}
            disabled={!bound || busy}
            onClick={() => completeDeliverMut.mutate(group.deliverTask!.id)}
          >
            <CheckIcon className="size-3.5 shrink-0" aria-hidden />
            {deliverPending ? 'Registrando…' : 'Concluir entrega'}
          </Button>
          {deliverPending ? <TaskConfirmationProgressBar /> : null}
        </>
      );
    }

    if (step.id === 'expedition' && group.pickupTask) {
      if (deliverOpen) {
        return (
          <p className="m-0 w-full text-center text-[0.625rem] leading-snug text-zinc-500">
            Conclua a entrega na máquina para habilitar a expedição.
          </p>
        );
      }
      if (pickupOpen) {
        return (
          <>
            <Button
              type="button"
              className={cn(
                flowStepActionButtonClass,
                'bg-brand text-white hover:bg-brand-hover',
              )}
              disabled={!bound || busy}
              onClick={() => completePickupMut.mutate(group.pickupTask!.id)}
            >
              {pickupPending ? 'Registrando…' : 'Confirmar na expedição'}
            </Button>
            {pickupPending ? <TaskConfirmationProgressBar /> : null}
          </>
        );
      }
    }

    return null;
  };

  return (
    <Card className="overflow-hidden border-2 border-zinc-200/90 bg-white shadow-sm">
      <div className="border-b border-zinc-100 bg-gradient-to-r from-zinc-50 to-white px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="m-0 text-xs font-semibold uppercase tracking-wider text-brand">
              {isCombined
                ? 'Rota completa na máquina'
                : deliverOpen
                  ? 'Entrega em andamento'
                  : 'Retirada em andamento'}
            </p>
            <p className="mt-1 text-sm font-semibold text-zinc-900">
              {group.machineName}
            </p>
          </div>
    
        </div>
        {statusLabel && activeTask ? (
          <p className="mt-2 text-xs text-zinc-600">
            Status:{' '}
            <span className="font-medium text-zinc-800">{statusLabel}</span>
            {' · '}
            Desde {formatTaskDate(activeTask.createdAt)}
          </p>
        ) : null}
      </div>

      <div className="px-3 py-5 sm:px-5 sm:py-6">
        <RouteFlowTrack steps={steps} renderStepActi      <span className="rounded-full bg-zinc-900 px-2.5 py-0.5 text-[0.6875rem] font-semibold text-white">
            {priorityLabel(group.priority)}
          </span>on={renderStepAction} />
      </div>
    </Card>
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
  const groups = groupOpenTasks(tasks, myPalletId).filter((group) => {
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
        <div className="flex justify-center py-12">
          <ForkliftLoader size="lg" />
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
            <li key={group.machineId}>
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

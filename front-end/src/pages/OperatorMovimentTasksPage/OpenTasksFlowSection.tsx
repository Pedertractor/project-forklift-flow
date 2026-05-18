import type { ReactNode } from 'react';
import {
  routeFlowStepIcon,
  type RouteFlowStepId,
} from '@/components/operator-moviment/route-flow-icons';
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
import { cn } from '@/lib/utils';

type StepState = 'done' | 'current' | 'upcoming';

/** Alinhado a `route-flow-icons` (recebimento · máquina · pallet · expedição). */
type FlowStepId = RouteFlowStepId;

interface FlowStepConfig {
  id: FlowStepId;
  label: string;
  subtitle: string;
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

function canCompletePickup(type: ForkliftTaskTypeApi, status: string): boolean {
  return (
    type === 'PICKUP_TO_EXPEDITION' &&
    (status === 'CREATED' || status === 'ASSIGNED' || status === 'IN_PROGRESS')
  );
}

function groupOpenTasks(tasks: OperatorMovimentTaskItem[]): TaskRouteGroup[] {
  const byMachine = new Map<string, TaskRouteGroup>();

  for (const task of tasks) {
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
    const rank = { VERY_HIGH: 0, HIGH: 1, NORMAL: 2 };
    if (rank[task.request.priorityLevel] < rank[group.priority]) {
      group.priority = task.request.priorityLevel;
    }
  }

  return [...byMachine.values()].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

function buildSteps(group: TaskRouteGroup): FlowStepConfig[] {
  const deliverOpen =
    group.deliverTask !== null &&
    canCompleteDeliver(group.deliverTask.type, group.deliverTask.status);
  const pickupOpen =
    group.pickupTask !== null &&
    canCompletePickup(group.pickupTask.type, group.pickupTask.status);
  const deliverCube = group.deliverTask?.request.movementCube;
  const pickupCube = group.pickupTask?.request.movementCube;
  const machineLine = `${group.machineName} · ${group.machinePosition}`;

  if (group.deliverTask && group.pickupTask) {
    return [
      {
        id: 'receiving',
        label: 'Pegue o pallet no recebimento',
        subtitle: deliverCube ? `Cubo ${deliverCube}` : 'Buscar cubo',
        state: deliverOpen ? 'current' : 'done',
      },
      {
        id: 'machine',
        label: 'Entregue o pallet na máquina',
        subtitle: machineLine,
        state: deliverOpen ? 'current' : pickupOpen ? 'current' : 'done',
      },
      {
        id: 'pallet',
        label: 'Pallet na máquina',
        subtitle: pickupCube ? `Cubo ${pickupCube}` : 'Retirar pallet',
        state: deliverOpen ? 'upcoming' : pickupOpen ? 'current' : 'done',
      },
      {
        id: 'expedition',
        label: 'Expedição',
        subtitle: 'Entregar na expedição',
        state: pickupOpen ? 'current' : deliverOpen ? 'upcoming' : 'done',
      },
    ];
  }

  if (group.deliverTask) {
    return [
      {
        id: 'receiving',
        label: 'Se movimente até o recebimento',
        subtitle: 'Recebimento',
        state: deliverOpen ? 'current' : 'done',
      },
      {
        id: 'receiving',
        label: 'Pegue o pallet no recebimento',
        subtitle: deliverCube ? `${deliverCube}` : 'Origem',
        state: deliverOpen ? 'current' : 'done',
      },
      {
        id: 'machine',
        label: 'Entregue o pallet na máquina',
        subtitle: machineLine,
        state: deliverOpen ? 'current' : 'done',
      },
    ];
  }

  return [
    {
      id: 'machine',
      label: 'Retire o pallet na máquina',
      subtitle: machineLine,
      state: pickupOpen ? 'current' : 'done',
    },
    {
      id: 'pallet',
      label: 'Leve o pallet para a expedição',
      subtitle: pickupCube ? `Cubo ${pickupCube}` : 'Retirar pallet',
      state: pickupOpen ? 'current' : 'done',
    },
    {
      id: 'expedition',
      label: 'Expedição',
      subtitle: 'Destino final',
      state: pickupOpen ? 'current' : 'done',
    },
  ];
}

function FlowConnector({ active }: { active: boolean }) {
  return (
    <div className="relative mx-0.5 flex min-w-[1.75rem] flex-1 items-center sm:mx-1 sm:min-w-[2.25rem]">
      <div
        className={cn(
          'h-0.5 w-full rounded-full',
          active ? 'bg-[#005fb8]' : 'bg-zinc-200',
        )}
      />
      <div
        className={cn(
          'absolute right-0 size-0 border-y-[5px] border-y-transparent border-l-[7px]',
          active ? 'border-l-[#005fb8]' : 'border-l-zinc-300',
        )}
        aria-hidden
      />
    </div>
  );
}

function TaskConfirmationProgressBar() {
  return (
    <div
      className="relative mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-200"
      role="progressbar"
      aria-valuetext="Enviando confirmação"
      aria-busy="true"
    >
      <div className="absolute inset-y-0 w-[38%] rounded-full bg-[#005fb8] motion-safe:animate-task-confirm-progress" />
    </div>
  );
}

function FlowStepNode({ step }: { step: FlowStepConfig }) {
  const Icon = routeFlowStepIcon(step.id);
  const isCurrent = step.state === 'current';
  const isDone = step.state === 'done';

  return (
    <div className="flex min-w-[4.75rem] max-w-[7.5rem] flex-1 flex-col items-center text-center">
      <div
        className={cn(
          'relative flex size-12 items-center justify-center rounded-full border-2 bg-white shadow-sm transition-colors sm:size-14',
          isDone && 'border-emerald-500 bg-emerald-50 text-emerald-700',
          isCurrent &&
            'border-[#005fb8] bg-[#005fb8]/10 text-[#005fb8] ring-4 ring-[#005fb8]/20',
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
          <span className="absolute -bottom-1 left-1/2 size-2.5 -translate-x-1/2 rounded-full bg-[#005fb8] ring-2 ring-white" />
        ) : null}
      </div>
      <p
        className={cn(
          'mt-2.5 text-[0.6875rem] font-bold uppercase tracking-wide',
          isCurrent
            ? 'text-[#005fb8]'
            : isDone
              ? 'text-emerald-700'
              : 'text-zinc-500',
        )}
      >
        {step.label}
      </p>
      <p className="mt-0.5 line-clamp-2 text-[0.6875rem] leading-snug font-medium text-zinc-700">
        {step.subtitle}
      </p>
    </div>
  );
}

function RouteFlowTrack({
  steps,
  renderStepFooter,
}: {
  steps: FlowStepConfig[];
  renderStepFooter: (step: FlowStepConfig) => ReactNode;
}) {
  return (
    <div className="flex w-full min-w-0 items-start overflow-x-auto pb-2 pt-1 [-webkit-overflow-scrolling:touch]">
      {steps.map((step, index) => (
        <div
          key={`${step.id}-${index}`}
          className="flex min-w-0 flex-1 items-stretch"
        >
          <div className="flex min-w-[12rem] max-w-none shrink-0 basis-0 flex-1 flex-col items-center px-0.5 sm:min-w-[13.5rem]">
            <FlowStepNode step={step} />
            <div className="mt-3 flex min-h-[4.25rem] w-full min-w-0 flex-col items-stretch justify-start px-0.5">
              {renderStepFooter(step)}
            </div>
          </div>
          {index < steps.length - 1 ? (
            <div className="flex min-w-0 flex-1 items-center self-start pt-7">
              <FlowConnector
                active={step.state === 'done' || step.state === 'current'}
              />
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function OpenTaskRouteCard({
  group,
  bound,
  busy,
  completeDeliverMut,
  completePickupMut,
}: {
  group: TaskRouteGroup;
  bound: boolean;
  busy: boolean;
  completeDeliverMut: CompleteMutationHandlers;
  completePickupMut: CompleteMutationHandlers;
}) {
  const steps = buildSteps(group);
  const deliverOpen =
    group.deliverTask !== null &&
    canCompleteDeliver(group.deliverTask.type, group.deliverTask.status);
  const pickupOpen =
    group.pickupTask !== null &&
    canCompletePickup(group.pickupTask.type, group.pickupTask.status);

  const isCombined = group.deliverTask !== null && group.pickupTask !== null;
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

  const renderStepFooter = (step: FlowStepConfig) => {
    if (step.id === 'machine' && deliverOpen && group.deliverTask) {
      return (
        <>
          <Button
            type="button"
            className="h-auto min-h-[2.75rem] w-full shrink-0 whitespace-normal bg-[#005fb8] px-2 py-2.5 text-center text-xs leading-snug text-white hover:bg-[#004a94] sm:px-3 sm:text-sm"
            disabled={!bound || busy}
            onClick={() => completeDeliverMut.mutate(group.deliverTask!.id)}
          >
            {deliverPending ? 'Registrando…' : 'Confirmar entrega na máquina'}
          </Button>
          {deliverPending ? <TaskConfirmationProgressBar /> : null}
        </>
      );
    }

    if (step.id === 'expedition' && pickupOpen && group.pickupTask) {
      if (deliverOpen) {
        return (
          <p className="m-0 text-center text-[0.6875rem] leading-snug text-zinc-500">
            Conclua a entrega na máquina para habilitar a confirmação na
            expedição.
          </p>
        );
      }
      return (
        <>
          <Button
            type="button"
            className="h-auto min-h-[2.75rem] w-full shrink-0 whitespace-normal bg-[#005fb8] px-2 py-2.5 text-center text-xs leading-snug text-white hover:bg-[#004a94] sm:px-3 sm:text-sm"
            disabled={!bound || busy}
            onClick={() => completePickupMut.mutate(group.pickupTask!.id)}
          >
            {pickupPending ? 'Registrando…' : 'Confirmar entrega na expedição'}
          </Button>
          {pickupPending ? <TaskConfirmationProgressBar /> : null}
        </>
      );
    }

    return null;
  };

  return (
    <Card className="overflow-hidden border-2 border-zinc-200/90 bg-white shadow-sm">
      <div className="border-b border-zinc-100 bg-gradient-to-r from-zinc-50 to-white px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="m-0 text-xs font-semibold uppercase tracking-wider text-[#005fb8]">
              {isCombined
                ? 'Rota completa na máquina'
                : deliverOpen
                  ? 'Entrega em andamento'
                  : 'Retirada em andamento'}
            </p>
            <p className="mt-1 text-sm font-semibold text-zinc-900">
              {group.machineName}
              <span className="font-normal text-zinc-500">
                {' '}
                · {group.machinePosition}
              </span>
            </p>
          </div>
          <span className="rounded-full bg-zinc-900 px-2.5 py-0.5 text-[0.6875rem] font-semibold text-white">
            {priorityLabel(group.priority)}
          </span>
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
        <RouteFlowTrack steps={steps} renderStepFooter={renderStepFooter} />
      </div>
    </Card>
  );
}

export interface OpenTasksFlowSectionProps {
  openTasks: OperatorMovimentTaskItem[];
  isLoading: boolean;
  bound: boolean;
  busy: boolean;
  completeDeliverMut: CompleteMutationHandlers;
  completePickupMut: CompleteMutationHandlers;
  emptyAction: ReactNode;
}

export function OpenTasksFlowSection({
  openTasks,
  isLoading,
  bound,
  busy,
  completeDeliverMut,
  completePickupMut,
  emptyAction,
}: OpenTasksFlowSectionProps) {
  const groups = groupOpenTasks(openTasks);

  return (
    <section className="mt-6" aria-labelledby="open-tasks-flow-heading">
      {isLoading ? (
        <p className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-600">
          Carregando tarefas…
        </p>
      ) : null}

      {!isLoading && groups.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/80 px-4 py-10 text-center">
          <p className="m-0 text-sm text-zinc-600">
            Nenhuma tarefa em aberto no momento.
          </p>
          <div className="mt-4 flex justify-center">{emptyAction}</div>
        </div>
      ) : null}

      {!isLoading && groups.length > 0 ? (
        <ul className="m-0 flex list-none flex-col gap-5 p-0">
          {groups.map((group) => (
            <li key={group.machineId}>
              <OpenTaskRouteCard
                group={group}
                bound={bound}
                busy={busy}
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

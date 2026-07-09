import {
  DeliverFlowActivitySubtitle,
  DeliverFlowCard,
  DeliverFlowMachineCubeHighlight,
  DeliverThreeStepFlow,
  type DeliverFlowStepConfig,
} from '@/components/operator-moviment/deliver-three-step-flow';
import {
  expeditionAreaDetail,
  goToReceivingDetail,
  prismaDetail,
  receivingAreaDetail,
  type RouteFlowDetailItem,
} from '@/components/operator-moviment/route-flow-step-details';
import { machineLocationDetailItems } from '@/utils/machine-display';
import { formatReplenishmentMovementCubeDisplay } from '@/constants/operator-machine-replenishment';
import {
  formatTaskDate,
  isCriticalPriority,
} from '@/utils/operator-moviment-display';
import { formatDurationMs } from '@/utils/formatDurationMs';
import type {
  ForkliftTaskTypeApi,
  OperatorMovimentTaskItem,
} from '@/types/operator-moviment-pallet.types';
import {
  canCompleteMovimentDeliver,
  canCompleteMovimentPickup,
  isOpenMovimentTaskStatus,
} from '@/utils/operator-moviment-work';
import { useEffect, useState } from 'react';
import { CheckCircle2, ClipboardList, Route, Timer } from 'lucide-react';

interface TaskRouteGroup {
  machineId: string;
  machineName: string;
  machineAssetNumber: string | null;
  machinePillar: string | null;
  priority: OperatorMovimentTaskItem['request']['priorityLevel'];
  deliverTask: OperatorMovimentTaskItem | null;
  pickupTask: OperatorMovimentTaskItem | null;
  createdAt: string;
}

function groupOpenTasks(tasks: OperatorMovimentTaskItem[]): TaskRouteGroup[] {
  const byMachine = new Map<string, TaskRouteGroup>();
  const openTasks = tasks.filter((t) => isOpenMovimentTaskStatus(t.status));

  for (const task of openTasks) {
    const dest = task.request?.destination;
    if (!dest) {
      continue;
    }
    let group = byMachine.get(dest.id);
    if (!group) {
      group = {
        machineId: dest.id,
        machineName: dest.name,
        machineAssetNumber: dest.assetNumber ?? null,
        machinePillar: dest.pillar ?? null,
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

function isCombinedRouteGroup(
  group: TaskRouteGroup,
  allTasks: OperatorMovimentTaskItem[],
): boolean {
  if (group.deliverTask && group.pickupTask) {
    return true;
  }
  if (!group.pickupTask) {
    return false;
  }
  return allTasks.some(
    (task) =>
      task.type === 'DELIVER_TO_MACHINE' &&
      task.request.destination.id === group.machineId &&
      task.status === 'COMPLETED',
  );
}

function buildCombinedDeliverPhaseSteps(
  deliverCube: string | undefined,
  machineDetails: RouteFlowDetailItem[],
): DeliverFlowStepConfig[] {
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
  ];
}

function buildCombinedPickupPhaseSteps(
  machineDetails: RouteFlowDetailItem[],
): DeliverFlowStepConfig[] {
  return [
    {
      stepNumber: 1,
      stepId: 'pallet',
      label: 'Pallet na máquina',
      details: machineDetails,
    },
    {
      stepNumber: 2,
      stepId: 'expedition',
      label: 'Expedição',
      details: [expeditionAreaDetail('Entregar na expedição')],
    },
  ];
}

function buildOpenTaskSteps(
  group: TaskRouteGroup,
  operatorUserId: string,
  allTasks: OperatorMovimentTaskItem[],
): DeliverFlowStepConfig[] {
  const deliverOpen =
    group.deliverTask !== null &&
    canCompleteMovimentDeliver(
      group.deliverTask.type,
      group.deliverTask.status,
    );
  const pickupOpen =
    group.pickupTask !== null &&
    canCompleteMovimentPickup(group.pickupTask, operatorUserId);
  const deliverCube = group.deliverTask?.request.movementCube;
  const machineDetails = machineLocationDetailItems({
    name: group.machineName,
    assetNumber: group.machineAssetNumber,
    pillar: group.machinePillar,
  });
  const isCombinedRoute = isCombinedRouteGroup(group, allTasks);

  if (deliverOpen && pickupOpen && isCombinedRoute) {
    return buildCombinedDeliverPhaseSteps(deliverCube, machineDetails);
  }

  if (pickupOpen && !deliverOpen && isCombinedRoute) {
    return buildCombinedPickupPhaseSteps(machineDetails);
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

function resolveFlowActivitySubtitle(
  deliverOpen: boolean,
  pickupOpen: boolean,
  isCombinedRoute: boolean,
): string | null {
  if (deliverOpen) {
    return isCombinedRoute && pickupOpen
      ? 'Entrega — atividade 1 de 2'
      : 'Entrega';
  }
  if (pickupOpen) {
    return isCombinedRoute ? 'Retirada — atividade 2 de 2' : 'Retirada';
  }
  return null;
}

/** Cronômetro puramente visual (front-end): conta o tempo desde `startIso` até agora. */
function LiveActivityTimer({ startIso }: { startIso: string }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const start = new Date(startIso).getTime();
  const elapsed = Number.isFinite(start) ? now - start : null;

  return (
    <span className="font-semibold tabular-nums text-brand">
      {formatDurationMs(elapsed)}
    </span>
  );
}

function AssistedRouteActivityMeta({
  activeTask,
}: {
  activeTask: OperatorMovimentTaskItem;
}) {
  const acceptedIso = activeTask.assignedAt ?? activeTask.statusSince;

  return (
    <div className="grid grid-cols-1 gap-2 border-t border-zinc-100 bg-zinc-50/60 px-5 py-3 text-xs sm:grid-cols-3 sm:px-8">
      <span className="flex items-center gap-1.5 text-zinc-600">
        <ClipboardList className="size-3.5 shrink-0 text-zinc-400" aria-hidden />
        <span>
          Solicitado:{' '}
          <span className="font-medium text-zinc-900">
            {formatTaskDate(activeTask.request.createdAt)}
          </span>
        </span>
      </span>
      <span className="flex items-center gap-1.5 text-zinc-600">
        <CheckCircle2 className="size-3.5 shrink-0 text-zinc-400" aria-hidden />
        <span>
          Aceito:{' '}
          <span className="font-medium text-zinc-900">
            {formatTaskDate(acceptedIso)}
          </span>
        </span>
      </span>
      <span className="flex items-center gap-1.5 text-zinc-600">
        <Timer className="size-3.5 shrink-0 text-brand" aria-hidden />
        <span>
          Em execução: <LiveActivityTimer startIso={acceptedIso} />
        </span>
      </span>
    </div>
  );
}

function AssistedRouteCard({
  group,
  allTasks,
  operatorUserId,
}: {
  group: TaskRouteGroup;
  allTasks: OperatorMovimentTaskItem[];
  operatorUserId: string;
}) {
  const deliverOpen =
    group.deliverTask !== null &&
    canCompleteMovimentDeliver(
      group.deliverTask.type as ForkliftTaskTypeApi,
      group.deliverTask.status,
    );
  const pickupOpen =
    group.pickupTask !== null &&
    canCompleteMovimentPickup(group.pickupTask, operatorUserId);
  const isCombinedRoute = isCombinedRouteGroup(group, allTasks);
  const steps = buildOpenTaskSteps(group, operatorUserId, allTasks);
  const deliverCubeDisplay = group.deliverTask?.request.movementCube
    ? formatReplenishmentMovementCubeDisplay(
        group.deliverTask.request.movementCube,
      )
    : undefined;
  const activitySubtitle = resolveFlowActivitySubtitle(
    deliverOpen,
    pickupOpen,
    isCombinedRoute,
  );
  const isCritical = isCriticalPriority(group.priority);
  const activeTask = deliverOpen
    ? group.deliverTask
    : pickupOpen
      ? group.pickupTask
      : null;

  return (
    <DeliverFlowCard>
      <div className="px-5 py-4 sm:px-8">
        {activitySubtitle ? (
          <DeliverFlowActivitySubtitle
            typography="large"
            start={
              <DeliverFlowMachineCubeHighlight
                machineName={group.machineName}
                assetNumber={group.machineAssetNumber}
                pillar={group.machinePillar}
                cube={deliverOpen ? deliverCubeDisplay : undefined}
                typography="large"
              />
            }
          >
            {activitySubtitle}
          </DeliverFlowActivitySubtitle>
        ) : null}
        <DeliverThreeStepFlow steps={steps} cube={deliverCubeDisplay} />
      </div>
      {activeTask ? <AssistedRouteActivityMeta activeTask={activeTask} /> : null}
      {isCritical ? (
        <div className="border-t border-zinc-100 bg-zinc-50/80 px-5 py-3 text-center text-xs font-medium text-amber-900">
          Tarefa crítica em andamento
        </div>
      ) : null}
    </DeliverFlowCard>
  );
}

export function OperatorAssistedTrajectoryView({
  tasks,
  operatorUserId,
}: {
  tasks: OperatorMovimentTaskItem[];
  operatorUserId: string;
}) {
  const groups = groupOpenTasks(tasks).filter((group) => {
    const deliverOpen =
      group.deliverTask !== null &&
      canCompleteMovimentDeliver(
        group.deliverTask.type,
        group.deliverTask.status,
      );
    const pickupOpen =
      group.pickupTask !== null &&
      canCompleteMovimentPickup(group.pickupTask, operatorUserId);
    return deliverOpen || pickupOpen;
  });

  if (groups.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/80 px-4 py-10 text-center">
        <p className="m-0 text-sm text-zinc-600">
          Nenhuma atividade em aberto para este operador no momento.
        </p>
      </div>
    );
  }

  return (
    <ul className="m-0 flex list-none flex-col gap-4 p-0">
      {groups.map((group) => (
        <li key={group.machineId} className="flex flex-col gap-2">
          <p className="m-0 flex items-center gap-2 text-sm font-semibold text-zinc-900">
            <span
              className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand"
              aria-hidden
            >
              <Route className="size-3.5" strokeWidth={2.25} />
            </span>
            <span className="truncate">{group.machineName}</span>
          </p>
          <AssistedRouteCard
            group={group}
            allTasks={tasks}
            operatorUserId={operatorUserId}
          />
        </li>
      ))}
    </ul>
  );
}

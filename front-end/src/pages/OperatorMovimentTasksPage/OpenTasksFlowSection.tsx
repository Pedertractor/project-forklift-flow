import { type ReactNode } from 'react';
import {
  DeliverFlowAcceptButton,
  DeliverFlowActionFooter,
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
import { isCriticalPriority } from '@/utils/operator-moviment-display';
import type {
  ForkliftTaskTypeApi,
  OperatorMovimentTaskItem,
} from '@/types/operator-moviment-pallet.types';
import { isOpenMovimentTaskStatus } from '@/utils/operator-moviment-work';
import { Check, Layers2, Loader2 } from 'lucide-react';
import AccordionLoader from '@/components/accordionLoader/accordion-loader';

interface TaskRouteGroup {
  machineId: string;
  machineName: string;
  machineAssetNumber: string | null;
  machinePillar: string | null;
  machineStreet: OperatorMovimentTaskItem['request']['destination']['machineStreet'];
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
  myOperatorUserId: string | null,
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
  if (myOperatorUserId == null) {
    return false;
  }
  const assignedId =
    task.assignedOperatorId ?? task.assignedMovimentPalletId ?? null;
  if (assignedId != null && assignedId !== myOperatorUserId) {
    return false;
  }
  return true;
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
        machineStreet: dest.machineStreet ?? null,
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
  myOperatorUserId: string | null,
  allTasks: OperatorMovimentTaskItem[],
): DeliverFlowStepConfig[] {
  const deliverOpen =
    group.deliverTask !== null &&
    canCompleteDeliver(group.deliverTask.type, group.deliverTask.status);
  const pickupOpen =
    group.pickupTask !== null &&
    canCompletePickup(group.pickupTask, myOperatorUserId);
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

function OpenActivityHeading() {
  return (
    <p className="m-0 flex items-center gap-2 px-0.5 text-sm font-semibold text-zinc-900 phone-landscape:text-lg md:text-base lg:text-lg xl:text-xl">
      {/* <span
        className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand phone-landscape:size-9"
        aria-hidden
      >
      </span> */}
      <Layers2
        className="text-brand size-4 phone-landscape:size-[1.125rem] lg:size-5 xl:size-6"
        strokeWidth={2.25}
      />
      <span className="flex flex-wrap items-center gap-1.5">
        Conclua a tarefa
      </span>
    </p>
  );
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

function OpenTaskRouteCard({
  group,
  allTasks,
  bound,
  busy,
  myOperatorUserId,
  completeDeliverMut,
  completePickupMut,
}: {
  group: TaskRouteGroup;
  allTasks: OperatorMovimentTaskItem[];
  bound: boolean;
  busy: boolean;
  myOperatorUserId: string | null;
  completeDeliverMut: CompleteMutationHandlers;
  completePickupMut: CompleteMutationHandlers;
}) {
  const deliverOpen =
    group.deliverTask !== null &&
    canCompleteDeliver(group.deliverTask.type, group.deliverTask.status);
  const pickupOpen =
    group.pickupTask !== null &&
    canCompletePickup(group.pickupTask, myOperatorUserId);
  const isCombinedRoute = isCombinedRouteGroup(group, allTasks);
  const steps = buildOpenTaskSteps(group, myOperatorUserId, allTasks);
  const deliverCubeDisplay = group.deliverTask?.request.movementCube
    ? formatReplenishmentMovementCubeDisplay(
        group.deliverTask.request.movementCube,
      )
    : undefined;
  const isCritical = isCriticalPriority(group.priority);

  const activitySubtitle = resolveFlowActivitySubtitle(
    deliverOpen,
    pickupOpen,
    isCombinedRoute,
  );

  return (
    <DeliverFlowCard>
      <div className="px-5 py-4 sm:px-8 phone-landscape:flex phone-landscape:min-h-0 phone-landscape:flex-1 phone-landscape:flex-col phone-landscape:px-3 phone-landscape:py-2">
        {activitySubtitle ? (
          <DeliverFlowActivitySubtitle
            typography="large"
            start={
              <DeliverFlowMachineCubeHighlight
                machineName={group.machineName}
                assetNumber={group.machineAssetNumber}
                pillar={group.machinePillar}
                machineStreet={group.machineStreet}
                cube={deliverOpen ? deliverCubeDisplay : undefined}
                typography="large"
              />
            }
          >
            <span className="font-semibold normal-case text-zinc-700">
              {activitySubtitle}
            </span>
          </DeliverFlowActivitySubtitle>
        ) : null}
        <div className="w-full phone-landscape:flex phone-landscape:min-h-0 phone-landscape:flex-1">
          <DeliverThreeStepFlow
            steps={steps}
            cube={deliverCubeDisplay}
            activityTypography="large"
          />
        </div>
      </div>

      <DeliverFlowActionFooter isCritical={isCritical}>
        <div className="flex flex-col items-center gap-2">
          {deliverOpen && group.deliverTask
            ? (() => {
                const completing =
                  completeDeliverMut.isPending &&
                  completeDeliverMut.variables === group.deliverTask!.id;
                return (
                  <DeliverFlowAcceptButton
                    disabled={!bound || busy}
                    onClick={() =>
                      completeDeliverMut.mutate(group.deliverTask!.id)
                    }
                  >
                    {completing ? (
                      <>
                        <Loader2
                          className="size-5 shrink-0 animate-spin lg:size-6 xl:size-7"
                          aria-hidden
                        />
                        Concluindo…
                      </>
                    ) : (
                      <>
                        <Check className="size-5 shrink-0 lg:size-6 xl:size-7" aria-hidden />
                        Concluir entrega
                      </>
                    )}
                  </DeliverFlowAcceptButton>
                );
              })()
            : pickupOpen && group.pickupTask
              ? (() => {
                  const completing =
                    completePickupMut.isPending &&
                    completePickupMut.variables === group.pickupTask!.id;
                  return (
                    <DeliverFlowAcceptButton
                      disabled={!bound || busy}
                      onClick={() =>
                        completePickupMut.mutate(group.pickupTask!.id)
                      }
                    >
                      {completing ? (
                        <>
                          <Loader2
                            className="size-5 shrink-0 animate-spin lg:size-6 xl:size-7"
                            aria-hidden
                          />
                          Confirmando…
                        </>
                      ) : (
                        <>
                          <Check className="size-5 shrink-0 lg:size-6 xl:size-7" aria-hidden />
                          Confirmar entrega na expedição
                        </>
                      )}
                    </DeliverFlowAcceptButton>
                  );
                })()
              : null}
        </div>
      </DeliverFlowActionFooter>
    </DeliverFlowCard>
  );
}

export interface OpenTasksFlowSectionProps {
  /** Todas as tarefas atribuídas (abertas e concluídas) para agrupar rotas combinadas. */
  tasks: OperatorMovimentTaskItem[];
  myOperatorUserId: string | null;
  isLoading: boolean;
  bound: boolean;
  busy: boolean;
  completeDeliverMut: CompleteMutationHandlers;
  completePickupMut: CompleteMutationHandlers;
  emptyAction: ReactNode;
}

export function OpenTasksFlowSection({
  tasks,
  myOperatorUserId,
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
      canCompletePickup(group.pickupTask, myOperatorUserId);
    return deliverOpen || pickupOpen;
  });
  const hasOpenWork = groups.length > 0;

  return (
    <section
      className="phone-landscape:flex phone-landscape:min-h-0 phone-landscape:flex-1 phone-landscape:flex-col"
      aria-labelledby="open-tasks-flow-heading"
    >
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
        <ul className="m-0 flex list-none flex-col gap-5 p-0 phone-landscape:min-h-0 phone-landscape:flex-1">
          {groups.map((group) => (
            <li
              key={group.machineId}
              className="flex flex-col  phone-landscape:min-h-0 phone-landscape:flex-1 phone-landscape:justify-center"
            >
              <OpenActivityHeading />
              <OpenTaskRouteCard
                group={group}
                allTasks={tasks}
                bound={bound}
                busy={busy}
                myOperatorUserId={myOperatorUserId}
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

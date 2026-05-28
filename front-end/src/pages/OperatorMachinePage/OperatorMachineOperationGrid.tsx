import { useState } from 'react';
import { HorizontalActivityStepper } from '@/components/activity/HorizontalActivityStepper';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/card';
import type { OperatorMachineSupplyRequestListItem } from '@/types/operator-machine.types';
import type {
  DeliveryTaskListItem,
  PickupTaskListItem,
} from '@/types/machine-task.types';
import type {
  DeliveryFlowPhase,
  OperationTimelineMode,
  PickupFlowPhase,
} from './operator-machine-flow';
import {
  COMBINED_FLOW_STEPS,
  combinedFlowHeadline,
  combinedFlowStepStatusesFromTasks,
  DELIVERY_FLOW_STEPS,
  deliveryFlowHeadline,
  deliveryFlowStepStatusesFromTask,
  operationTimelineTitle,
  PICKUP_FLOW_STEPS,
  pickupFlowHeadline,
  pickupFlowStepStatusesFromTask,
  shouldShowSupplyPanel,
  supplyFlowHeadline,
} from './operator-machine-flow';
import { OperatorMachineOpenRequestDialog } from './OperatorMachineOpenRequestDialog';
import type { OperatorServiceSelection } from './OperatorMachineOpenRequestDialog';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ClipboardList,
  InfoIcon,
  Route,
} from 'lucide-react';
import AccordionLoader from '@/components/accordionLoader/accordion-loader';

export interface OperatorMachineOperationGridProps {
  openSupply: OperatorMachineSupplyRequestListItem | null;
  supplyLoading: boolean;
  supplyError: Error | null;
  operationTimelineMode: OperationTimelineMode;
  timelineDelivery: DeliveryTaskListItem | null;
  timelinePickup: PickupTaskListItem | null;
  pickupPhase: PickupFlowPhase;
  deliveryPhase: DeliveryFlowPhase;
  canPickup: boolean;
  canOpenRequestDialog: boolean;
  pickupBlockedMessage: string | null;
  serviceRequestSubmitPending: boolean;
  busy: boolean;
  apiReady: boolean;
  onSubmitServiceRequest: (
    selection: OperatorServiceSelection,
  ) => void | Promise<void>;
}

function TimelineSectionIcon({ mode }: { mode: OperationTimelineMode }) {
  if (mode === 'combined') {
    return <Route className="size-4 shrink-0 text-violet-700" aria-hidden />;
  }
  if (mode === 'delivery') {
    return (
      <ArrowUpRight
        className="size-4 shrink-0 rounded-full bg-green-200"
        aria-hidden
      />
    );
  }
  return (
    <ArrowDownLeft
      className="size-4 shrink-0 rounded-full bg-red-200"
      aria-hidden
    />
  );
}

export function OperatorMachineOperationGrid({
  openSupply,
  supplyLoading,
  supplyError,
  operationTimelineMode,
  timelineDelivery,
  timelinePickup,
  pickupPhase,
  deliveryPhase,
  canPickup,
  canOpenRequestDialog,
  pickupBlockedMessage,
  serviceRequestSubmitPending,
  busy,
  apiReady,
  onSubmitServiceRequest,
}: OperatorMachineOperationGridProps) {
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const showSupply = shouldShowSupplyPanel(openSupply);
  const showTimeline = operationTimelineMode !== null;

  const handleSubmit = async (selection: OperatorServiceSelection) => {
    try {
      await onSubmitServiceRequest(selection);
      setRequestDialogOpen(false);
    } catch {
      /* toast via mutation */
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Button
        type="button"
        className="w-full lg:col-span-2 hover:cursor-pointer"
        disabled={!apiReady || busy || !canOpenRequestDialog}
        onClick={() => setRequestDialogOpen(true)}
      >
        <ClipboardList className="size-4 shrink-0" aria-hidden />
        Abrir solicitação
      </Button>

      <OperatorMachineOpenRequestDialog
        open={requestDialogOpen}
        onClose={() => setRequestDialogOpen(false)}
        openSupply={openSupply}
        canPickup={canPickup}
        pickupBlockedMessage={pickupBlockedMessage}
        submitPending={serviceRequestSubmitPending}
        onSubmit={handleSubmit}
      />

      {showTimeline ? (
        <Card className="flex flex-col border border-zinc-200 p-0 shadow-sm lg:col-span-2">
          <div className="border-b border-zinc-100 px-4 py-3">
            <h3 className="m-0 flex items-center gap-2 text-sm font-semibold tracking-tight text-zinc-900">
              <TimelineSectionIcon mode={operationTimelineMode} />
              {operationTimelineTitle(operationTimelineMode)}
            </h3>
            {operationTimelineMode === 'combined' ? (
              <p className="mb-0 mt-1 text-xs text-zinc-500">
                Entrega preparada e retirada na mesma máquina — fluxo sugerido
                ao transporte.
              </p>
            ) : null}
          </div>
          <div className="flex flex-1 flex-col gap-4 p-4">
            {operationTimelineMode === 'combined' ? (
              <HorizontalActivityStepper
                steps={[...COMBINED_FLOW_STEPS]}
                statuses={combinedFlowStepStatusesFromTasks(
                  timelineDelivery,
                  timelinePickup,
                )}
                headline={combinedFlowHeadline(
                  timelineDelivery,
                  timelinePickup,
                )}
              />
            ) : null}

            {operationTimelineMode === 'delivery' ? (
              <HorizontalActivityStepper
                steps={[...DELIVERY_FLOW_STEPS]}
                statuses={deliveryFlowStepStatusesFromTask(timelineDelivery)}
                headline={deliveryFlowHeadline(deliveryPhase, timelineDelivery)}
              />
            ) : null}

            {operationTimelineMode === 'pickup' ? (
              <HorizontalActivityStepper
                steps={[...PICKUP_FLOW_STEPS]}
                statuses={pickupFlowStepStatusesFromTask(timelinePickup)}
                headline={pickupFlowHeadline(pickupPhase, timelinePickup)}
              />
            ) : null}
          </div>
        </Card>
      ) : null}

      {!showTimeline && !canPickup && pickupBlockedMessage ? (
        <p className="m-0 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700 lg:col-span-2">
          {pickupBlockedMessage}
        </p>
      ) : null}

      {showSupply ? (
        <Card className="flex flex-col border border-zinc-200 p-0 shadow-sm lg:col-span-2">
          <div className="border-b border-zinc-100 px-4 py-3">
            <h3 className="m-0 text-sm font-semibold tracking-tight text-zinc-900">
              Solicitação ao abastecimento
            </h3>
            <p className="mt-1 mb-0 text-xs leading-relaxed text-zinc-500">
              Aguardando o abastecimento registrar a próxima entrega.
            </p>
          </div>
          <div className="flex flex-1 flex-col gap-4 p-4">
            {supplyLoading ? (
              <div className="flex flex-1 items-center justify-center py-8">
                <AccordionLoader />
              </div>
            ) : supplyError ? (
              <p className="m-0 text-sm text-red-700">
                {supplyError.message || 'Erro ao carregar.'}
              </p>
            ) : (
              <p className="m-0 flex items-center gap-2 text-sm text-zinc-700">
                <InfoIcon
                  className="inline size-4 shrink-0 text-blue-500"
                  aria-hidden
                />
                {supplyFlowHeadline(openSupply)}
              </p>
            )}
          </div>
        </Card>
      ) : null}
    </div>
  );
}

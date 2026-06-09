import { useState } from 'react';
import { Button } from '@/components/ui/brand-button';
import { OperatorMachineOpenRequestDialog } from './OperatorMachineOpenRequestDialog';
import type { OperatorServiceSelection } from './OperatorMachineOpenRequestDialog';
import type { DeliveryTaskListItem } from '@/types/machine-task.types';
import type { OperatorMachineSupplyRequestListItem } from '@/types/operator-machine.types';
import { ClipboardList } from 'lucide-react';

export interface OperatorMachineOperationGridProps {
  openSupply: OperatorMachineSupplyRequestListItem | null;
  deliveryTasks: DeliveryTaskListItem[];
  canPickup: boolean;
  canOpenRequestDialog: boolean;
  pickupBlockedMessage: string | null;
  palletAtReceivingBlockedMessage: string | null;
  serviceRequestSubmitPending: boolean;
  busy: boolean;
  apiReady: boolean;
  onSubmitServiceRequest: (
    selection: OperatorServiceSelection,
  ) => void | Promise<void>;
}

export function OperatorMachineOperationGrid({
  openSupply,
  deliveryTasks,
  canPickup,
  canOpenRequestDialog,
  pickupBlockedMessage,
  palletAtReceivingBlockedMessage,
  serviceRequestSubmitPending,
  busy,
  apiReady,
  onSubmitServiceRequest,
}: OperatorMachineOperationGridProps) {
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);

  const handleSubmit = async (selection: OperatorServiceSelection) => {
    try {
      await onSubmitServiceRequest(selection);
      setRequestDialogOpen(false);
    } catch {
      /* toast via mutation */
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Button
        type="button"
        className="w-full hover:cursor-pointer"
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
        deliveryTasks={deliveryTasks}
        canPickup={canPickup}
        pickupBlockedMessage={pickupBlockedMessage}
        submitPending={serviceRequestSubmitPending}
        onSubmit={handleSubmit}
      />

      {palletAtReceivingBlockedMessage && canPickup ? (
        <p className="m-0 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          {palletAtReceivingBlockedMessage}
        </p>
      ) : !canPickup && pickupBlockedMessage ? (
        <p className="m-0 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
          {pickupBlockedMessage}
        </p>
      ) : null}
    </div>
  );
}

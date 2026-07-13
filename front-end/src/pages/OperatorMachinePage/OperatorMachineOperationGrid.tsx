import { useState } from 'react';
import { Button } from '@/components/ui/brand-button';
import { OperatorMachineOpenRequestDialog } from './OperatorMachineOpenRequestDialog';
import type { OperatorServiceSelection } from './OperatorMachineOpenRequestDialog';
import type { DeliveryTaskListItem } from '@/types/machine-task.types';
import type {
  MachineToolingListItem,
  OperatorMachineSupplyRequestListItem,
} from '@/types/operator-machine.types';
import { ClipboardList } from 'lucide-react';

export interface OperatorMachineOperationGridProps {
  openSupply: OperatorMachineSupplyRequestListItem | null;
  deliveryTasks: DeliveryTaskListItem[];
  toolings: MachineToolingListItem[];
  canPickup: boolean;
  canOpenRequestDialog: boolean;
  pickupBlockedMessage: string | null;
  serviceRequestSubmitPending: boolean;
  createToolingPending?: boolean;
  deleteToolingPendingId?: string | null;
  busy: boolean;
  apiReady: boolean;
  onCreateTooling: (name: string) => Promise<MachineToolingListItem>;
  onDeleteTooling: (toolingId: string) => Promise<void>;
  onSubmitServiceRequest: (
    selection: OperatorServiceSelection,
  ) => void | Promise<void>;
}

export function OperatorMachineOperationGrid({
  openSupply,
  deliveryTasks,
  toolings,
  canPickup,
  canOpenRequestDialog,
  pickupBlockedMessage,
  serviceRequestSubmitPending,
  createToolingPending = false,
  deleteToolingPendingId = null,
  busy,
  apiReady,
  onCreateTooling,
  onDeleteTooling,
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
        toolings={toolings}
        canPickup={canPickup}
        pickupBlockedMessage={pickupBlockedMessage}
        submitPending={serviceRequestSubmitPending}
        createToolingPending={createToolingPending}
        deleteToolingPendingId={deleteToolingPendingId}
        onCreateTooling={onCreateTooling}
        onDeleteTooling={onDeleteTooling}
        onSubmit={handleSubmit}
      />
    </div>
  );
}

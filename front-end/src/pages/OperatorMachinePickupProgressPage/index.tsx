import { OperatorMachinePickupProgressPageView } from './OperatorMachinePickupProgressPageView';
import { useOperatorMachinePickupProgressPage } from './useOperatorMachinePickupProgressPage';

export function OperatorMachinePickupProgressPage() {
  return <OperatorMachinePickupProgressPageView {...useOperatorMachinePickupProgressPage()} />;
}

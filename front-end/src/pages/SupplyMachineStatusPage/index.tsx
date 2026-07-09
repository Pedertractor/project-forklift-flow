import { SupplyMachineStatusPageView } from './SupplyMachineStatusPageView';
import { useSupplyMachineStatusPage } from './useSupplyMachineStatusPage';

export function SupplyMachineStatusPage() {
  return <SupplyMachineStatusPageView {...useSupplyMachineStatusPage()} />;
}

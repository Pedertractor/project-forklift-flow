import { OperatorMachinePageView } from './OperatorMachinePageView';
import { useOperatorMachinePage } from './useOperatorMachinePage';

export function OperatorMachinePage() {
  return <OperatorMachinePageView {...useOperatorMachinePage()} />;
}

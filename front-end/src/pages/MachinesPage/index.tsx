import { MachinesPageView } from './MachinesPageView';
import { useMachinesPage } from './useMachinesPage';

export function MachinesPage() {
  return <MachinesPageView {...useMachinesPage()} />;
}

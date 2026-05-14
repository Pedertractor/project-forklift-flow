import { TypeMachinesPageView } from './TypeMachinesPageView';
import { useTypeMachinesPage } from './useTypeMachinesPage';

export function TypeMachinesPage() {
  return <TypeMachinesPageView {...useTypeMachinesPage()} />;
}

import { SupplyPendingPreparationPageView } from './SupplyPendingPreparationPageView';
import { useSupplyPendingPreparationPage } from './useSupplyPendingPreparationPage';

export function SupplyPendingPreparationPage() {
  return <SupplyPendingPreparationPageView {...useSupplyPendingPreparationPage()} />;
}

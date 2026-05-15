import { OperatorMovimentEquipmentPageView } from './OperatorMovimentEquipmentPageView';
import { useOperatorMovimentEquipmentPage } from './useOperatorMovimentEquipmentPage';

export function OperatorMovimentEquipmentPage() {
  return <OperatorMovimentEquipmentPageView {...useOperatorMovimentEquipmentPage()} />;
}

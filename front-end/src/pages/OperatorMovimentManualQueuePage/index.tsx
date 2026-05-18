import { OperatorMovimentManualQueuePageView } from '../OperatorMovimentQueuePage/OperatorMovimentManualQueuePageView';
import { useOperatorMovimentManualQueuePage } from '../OperatorMovimentQueuePage/useOperatorMovimentManualQueuePage';

export function OperatorMovimentManualQueuePage() {
  return (
    <OperatorMovimentManualQueuePageView
      {...useOperatorMovimentManualQueuePage()}
    />
  );
}

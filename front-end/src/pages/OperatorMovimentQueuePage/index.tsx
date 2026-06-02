import { OperatorMovimentQueuePageView } from './OperatorMovimentQueuePageView';
import { useOperatorMovimentQueuePage } from './useOperatorMovimentQueuePage';

export function OperatorMovimentQueuePage() {
  return <OperatorMovimentQueuePageView {...useOperatorMovimentQueuePage()} />;
}

import { OperatorMovimentTasksPageView } from './OperatorMovimentTasksPageView';
import { useOperatorMovimentTasksPage } from './useOperatorMovimentTasksPage';

export function OperatorMovimentTasksPage() {
  return <OperatorMovimentTasksPageView {...useOperatorMovimentTasksPage()} />;
}

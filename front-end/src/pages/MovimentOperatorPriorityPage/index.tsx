import { MovimentOperatorPriorityPageView } from './MovimentOperatorPriorityPageView';
import { useMovimentOperatorPriorityPage } from './useMovimentOperatorPriorityPage';

export function MovimentOperatorPriorityPage() {
  const vm = useMovimentOperatorPriorityPage();
  return <MovimentOperatorPriorityPageView {...vm} />;
}

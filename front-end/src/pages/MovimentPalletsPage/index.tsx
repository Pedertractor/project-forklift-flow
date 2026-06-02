import { MovimentPalletsPageView } from './MovimentPalletsPageView';
import { useMovimentPalletsPage } from './useMovimentPalletsPage';

export function MovimentPalletsPage() {
  return <MovimentPalletsPageView {...useMovimentPalletsPage()} />;
}

import { ReplenishmentRequestsPageView } from './ReplenishmentRequestsPageView';
import { useReplenishmentRequestsPage } from './useReplenishmentRequestsPage';

export function ReplenishmentRequestsPage() {
  return <ReplenishmentRequestsPageView {...useReplenishmentRequestsPage()} />;
}

import { DashboardPageView } from './DashboardPageView';
import { useDashboardPage } from './useDashboardPage';

export function DashboardPage() {
  return <DashboardPageView {...useDashboardPage()} />;
}

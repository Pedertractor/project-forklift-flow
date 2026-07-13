import { DashboardTvMonitorView } from './DashboardTvMonitorView';
import { useDashboardTvMonitorPage } from './useDashboardTvMonitorPage';

export function DashboardTvMonitorPage() {
  const vm = useDashboardTvMonitorPage();
  return (
    <div className="h-full min-h-0">
      <DashboardTvMonitorView {...vm} />
    </div>
  );
}

import { Outlet, useLocation } from 'react-router-dom';

import { DashboardSegmentNav } from '@/components/dashboard/DashboardSegmentNav';
import { cn } from '@/lib/utils';

export function DashboardAreaLayout() {
  const { pathname } = useLocation();
  const isTvMonitor = pathname.includes('/dashboard/monitor');

  return (
    <div
      className={cn(
        'mx-auto flex w-full flex-1 flex-col',
        isTvMonitor
          ? 'h-full max-w-none gap-0 p-0'
          : 'max-w-[90rem] gap-4 px-4 py-6 sm:gap-6 sm:py-8 max-[800px]:px-3 max-[800px]:py-5',
      )}
    >
      {isTvMonitor ? null : <DashboardSegmentNav />}
      <Outlet />
    </div>
  );
}

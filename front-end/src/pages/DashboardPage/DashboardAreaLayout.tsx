import { Outlet } from 'react-router-dom';

import { DashboardSegmentNav } from '@/components/dashboard/DashboardSegmentNav';

export function DashboardAreaLayout() {
  return (
    <div className="mx-auto flex w-full max-w-[90rem] flex-1 flex-col gap-4 px-4 py-6 sm:gap-6 sm:py-8 max-[800px]:px-3 max-[800px]:py-5">
      <DashboardSegmentNav />
      <Outlet />
    </div>
  );
}

export function normalizeDashboardDate(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function dashboardDateToIso(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDashboardDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  if (!year || !month || !day) return isoDate;
  return new Date(year, month - 1, day).toLocaleDateString('pt-BR');
}

export function resolveDashboardQueryDates(dates: Date[]) {
  const start = dates[0] ?? new Date();
  const end = dates[dates.length - 1] ?? start;
  return {
    startDate: dashboardDateToIso(start),
    endDate: dashboardDateToIso(end),
  };
}

export function formatDashboardPeriodLabel(
  startIso: string,
  endIso: string | null | undefined,
): string {
  if (!endIso || startIso === endIso) {
    return formatDashboardDate(startIso);
  }
  return `${formatDashboardDate(startIso)} - ${formatDashboardDate(endIso)}`;
}

export function dashboardIncludesToday(dates: Date[]): boolean {
  const today = normalizeDashboardDate(new Date());
  const end = normalizeDashboardDate(
    dates[dates.length - 1] ?? dates[0] ?? today,
  );
  return end.getTime() >= today.getTime();
}

export function todayDashboardDates(): Date[] {
  const today = normalizeDashboardDate(new Date());
  return [today, today];
}

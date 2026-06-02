import { formatDate } from '@/utils/formatDate';

export interface DashboardPageViewModel {
  formattedToday: string;
}

export function useDashboardPage(): DashboardPageViewModel {
  const today = new Date().toISOString();
  return { formattedToday: formatDate(today) };
}

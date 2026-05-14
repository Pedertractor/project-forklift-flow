import { ENV } from '@/constants/env';
import { useAuthStore } from '@/store/auth.store';
import type { AppUnit } from '@/types/user.types';
import type { User } from '@/types/user.types';

function unitLabel(unit: AppUnit): string {
  return unit === 'pedertractor' ? 'PEDERTRACTOR' : 'TRACTOR';
}

export interface HomePageViewModel {
  user: User | null;
  unitLabel: (unit: AppUnit) => string;
  envApiUrl: string;
}

export function useHomePage(): HomePageViewModel {
  const user = useAuthStore((s) => s.user);
  return {
    user,
    unitLabel,
    envApiUrl: ENV.API_URL,
  };
}

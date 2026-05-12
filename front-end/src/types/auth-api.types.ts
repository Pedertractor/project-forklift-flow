import type { AppUnit, User } from '@/types/user.types';

export interface LoginApiUser {
  id: string;
  name: string;
  role: string;
  card: string;
  unit: 'PEDERTRACTOR' | 'TRACTOR';
  employeeId: number;
}

export interface LoginApiResponse {
  token: string;
  firstAccess: boolean;
  user: LoginApiUser;
}

function unitFromApi(unit: LoginApiUser['unit']): AppUnit {
  return unit === 'PEDERTRACTOR' ? 'pedertractor' : 'tractor';
}

export function mapLoginUserToAppUser(u: LoginApiUser): User {
  return {
    id: u.id,
    name: u.name,
    cardNumber: u.card,
    unit: unitFromApi(u.unit),
    role: u.role,
  };
}

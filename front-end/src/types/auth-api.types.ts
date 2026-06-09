import type { AppUnit, User } from '@/types/user.types';

export interface LoginApiUser {
  id: string;
  name: string;
  role: string;
  card: string;
  unit: 'PEDERTRACTOR' | 'TRACTOR';
  employeeId: number;
  sectorId?: string | null;
  sector?: { id: string; typeSector: string } | null;
  isOperating?: 'FORKLIFT' | 'PALLET_TRUCK' | null;
}

export interface LoginApiResponse {
  token: string;
  firstAccess: boolean;
  user: LoginApiUser;
}

/** Resposta de `GET /auth/me` (mesmo shape público do usuário + `firstAccess`). */
export interface AuthMeApiResponse extends LoginApiUser {
  firstAccess: boolean;
  /** Emitido quando a role no JWT está desatualizada em relação ao banco. */
  token?: string;
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
    sectorId: u.sectorId ?? null,
    sector: u.sector ?? null,
    isOperating: u.isOperating ?? null,
  };
}

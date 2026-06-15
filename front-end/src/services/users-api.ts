import { API_ENDPOINTS } from '@/constants/API_ENDPOINTS';
import { apiAuthFetch } from '@/lib/api';
import type { AppUnit } from '@/types/user.types';
import type { EmployeeInfoResponse } from '@/types/employee-api.types';
import type { UserListRow } from '@/types/users-admin.types';

function unitToApi(unit: AppUnit): 'PEDERTRACTOR' | 'TRACTOR' {
  return unit === 'pedertractor' ? 'PEDERTRACTOR' : 'TRACTOR';
}

export async function fetchUsersList(): Promise<UserListRow[]> {
  const res = await apiAuthFetch<{ users: UserListRow[] }>(API_ENDPOINTS.USERS.LIST, {
    method: 'GET',
  });
  return res?.users ?? [];
}

export async function fetchUserRolesEnum(): Promise<string[]> {
  const res = await apiAuthFetch<{ roles: string[] }>(API_ENDPOINTS.USERS.ROLES, {
    method: 'GET',
  });
  return res?.roles ?? [];
}

export async function fetchDefaultFirstPassword(): Promise<string> {
  const res = await apiAuthFetch<{ defaultPassword: string }>(
    API_ENDPOINTS.USERS.DEFAULT_PASSWORD,
    { method: 'GET' },
  );
  if (!res?.defaultPassword) {
    throw new Error('Senha padrão não disponível.');
  }
  return res.defaultPassword;
}

export async function fetchEmployeeInfoByCardAndUnit(
  card: string,
  unit: AppUnit,
): Promise<EmployeeInfoResponse> {
  const params = new URLSearchParams({
    card: card.trim(),
    unit: unitToApi(unit),
  });
  const path = `${API_ENDPOINTS.USERS.EMPLOYEE_INFO}?${params.toString()}`;
  const res = await apiAuthFetch<EmployeeInfoResponse>(path, { method: 'GET' });
  if (!res) {
    throw new Error('Resposta vazia da API de colaborador.');
  }
  return res;
}

export interface CreateUserApiResponse {
  id: string;
  name: string;
  role: string;
  card: string;
  unit: string;
  employeeId: number;
  sectorId: string | null;
}

export async function createUserRequest(input: {
  card: string;
  unit: AppUnit;
  role: string;
  sectorId?: string | null;
}): Promise<CreateUserApiResponse> {
  const body: {
    card: string;
    unit: 'PEDERTRACTOR' | 'TRACTOR';
    role: string;
    sectorId?: string;
  } = {
    card: input.card.trim(),
    unit: unitToApi(input.unit),
    role: input.role,
  };
  const sid = input.sectorId;
  if (typeof sid === 'string' && sid.trim() !== '') {
    body.sectorId = sid.trim();
  }
  const res = await apiAuthFetch<CreateUserApiResponse>(API_ENDPOINTS.USERS.LIST, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (!res) {
    throw new Error('Resposta vazia.');
  }
  return res;
}

export async function patchUserRoleRequest(
  userId: string,
  role: string,
): Promise<CreateUserApiResponse> {
  const res = await apiAuthFetch<CreateUserApiResponse>(API_ENDPOINTS.USERS.ROLE(userId), {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  });
  if (!res) {
    throw new Error('Resposta vazia.');
  }
  return res;
}

export async function patchUserSectorRequest(
  userId: string,
  sectorId: string | null,
): Promise<CreateUserApiResponse> {
  const res = await apiAuthFetch<CreateUserApiResponse>(API_ENDPOINTS.USERS.SECTOR(userId), {
    method: 'PATCH',
    body: JSON.stringify({
      sectorId:
        typeof sectorId === 'string' && sectorId.trim() === '' ? null : sectorId,
    }),
  });
  if (!res) {
    throw new Error('Resposta vazia.');
  }
  return res;
}

export async function postResetUserPasswordRequest(userId: string): Promise<void> {
  await apiAuthFetch(API_ENDPOINTS.USERS.RESET_PASSWORD(userId), {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

import { API_ENDPOINTS } from '@/constants/API_ENDPOINTS';
import { ENV } from '@/constants/env';
import { apiFetch } from '@/lib/api';
import type { LoginPayload } from '@/schemas/auth.schema';
import type { LoginApiResponse } from '@/types/auth-api.types';
import { mapLoginUserToAppUser } from '@/types/auth-api.types';
import type { User } from '@/types/user.types';

function unitToApi(unit: LoginPayload['unit']): 'PEDERTRACTOR' | 'TRACTOR' {
  return unit === 'pedertractor' ? 'PEDERTRACTOR' : 'TRACTOR';
}

export type LoginResult = { token: string | null; user: User };

/** Autentica na API (`VITE_API_URL` deve incluir o prefixo `/api`, ex.: `http://localhost:3131/api`). */
export async function loginWithPassword(payload: LoginPayload): Promise<LoginResult> {
  if (!ENV.API_URL) {
    throw new Error(
      'Defina VITE_API_URL no .env na raiz do projeto (ex.: http://localhost:3131/api) e reinicie o Vite.',
    );
  }

  const data = await apiFetch<LoginApiResponse>(API_ENDPOINTS.AUTH.LOGIN, {
    method: 'POST',
    body: JSON.stringify({
      card: payload.card.trim(),
      unit: unitToApi(payload.unit),
      password: payload.password,
    }),
  });

  return {
    token: data.token,
    user: mapLoginUserToAppUser(data.user),
  };
}

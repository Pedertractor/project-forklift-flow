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

/**
 * Autentica na API. Sem `VITE_API_URL`, retorna usuário demo local para exercitar o shell.
 */
export async function loginWithPassword(payload: LoginPayload): Promise<LoginResult> {
  if (!ENV.API_URL) {
    await new Promise((r) => setTimeout(r, 200));
    return {
      token: null,
      user: {
        id: 'local-demo',
        name: 'Usuário demo',
        cardNumber: payload.card.trim(),
        unit: payload.unit,
      },
    };
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

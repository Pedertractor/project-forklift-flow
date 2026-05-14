import { API_ENDPOINTS } from '@/constants/API_ENDPOINTS';
import { ENV } from '@/constants/env';
import { apiFetch, apiAuthFetch } from '@/lib/api';
import type { LoginPayload } from '@/schemas/auth.schema';
import type { LoginApiResponse } from '@/types/auth-api.types';
import { mapLoginUserToAppUser } from '@/types/auth-api.types';
import type { User } from '@/types/user.types';

function unitToApi(unit: LoginPayload['unit']): 'PEDERTRACTOR' | 'TRACTOR' {
  return unit === 'pedertractor' ? 'PEDERTRACTOR' : 'TRACTOR';
}

export type LoginResult = {
  token: string | null;
  user: User;
  /** Quando `true`, o usuário deve definir nova senha antes de usar o app (`POST /auth/password`). */
  requiresPasswordChange: boolean;
};

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
    requiresPasswordChange: data.firstAccess,
  };
}

/** Define nova senha (`POST /api/auth/password`). No primeiro acesso não envie `currentPassword`. */
export async function changeOwnPassword(input: {
  newPassword: string;
  currentPassword?: string;
}): Promise<string> {
  const body: { newPassword: string; currentPassword?: string } = {
    newPassword: input.newPassword,
  };
  if (input.currentPassword !== undefined && input.currentPassword !== '') {
    body.currentPassword = input.currentPassword;
  }
  const data = await apiAuthFetch<{ ok: boolean; token: string }>(API_ENDPOINTS.AUTH.PASSWORD, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (!data?.token) {
    throw new Error('Resposta sem token após alterar senha.');
  }
  return data.token;
}

import { API_ENDPOINTS } from '@/constants/API_ENDPOINTS';
import { ENV } from '@/constants/env';
import { apiFetch } from '@/lib/api';
import type { LoginPayload } from '@/schemas/auth.schema';
import type { User } from '@/types/user.types';

function unitToApi(unit: LoginPayload['unit']): 'PEDERTRACTOR' | 'TRACTOR' {
  return unit === 'pedertractor' ? 'PEDERTRACTOR' : 'TRACTOR';
}

/**
 * Autentica na API. Sem `VITE_API_URL`, retorna usuário demo local para exercitar o shell.
 */
export async function loginWithPassword(payload: LoginPayload): Promise<User> {
  if (!ENV.API_URL) {
    await new Promise((r) => setTimeout(r, 200));
    return {
      id: 'local-demo',
      name: 'Usuário demo',
      cardNumber: payload.card.trim(),
      unit: payload.unit,
    };
  }

  return apiFetch<User>(API_ENDPOINTS.AUTH.LOGIN, {
    method: 'POST',
    body: JSON.stringify({
      cardNumber: payload.card.trim(),
      unit: unitToApi(payload.unit),
      password: payload.password,
    }),
  });
}

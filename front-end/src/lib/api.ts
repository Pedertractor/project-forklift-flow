import { ENV } from '@/constants/env';
import { useAuthStore } from '@/store/auth.store';

async function readErrorMessage(response: Response): Promise<string> {
  const text = await response.text();
  if (!text) {
    return `Request failed: ${response.status}`;
  }
  try {
    const body = JSON.parse(text) as { error?: string };
    if (typeof body.error === 'string' && body.error.length > 0) {
      return body.error;
    }
  } catch {
    /* ignore */
  }
  return text.length > 200 ? `Request failed: ${response.status}` : text;
}

/** Base da API (ex.: `http://localhost:8080/api`). */
function apiBase(): string {
  const base = ENV.API_URL;
  return base.endsWith('/') ? base.slice(0, -1) : base;
}

/** Origem do servidor sem sufixo `/api` (para `/uploads/...`). */
export function apiServerOrigin(): string {
  const base = apiBase();
  return base.replace(/\/api\/?$/i, '') || base;
}

function resolveUrl(path: string): string {
  const base = apiBase();
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = resolveUrl(path);
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return response.json() as Promise<T>;
}

/**
 * Chamada autenticada (Bearer). `204` retorna `undefined`.
 * Não envia `Content-Type` em `body` `FormData` (multipart).
 */
export async function apiAuthFetch<T>(
  path: string,
  options?: RequestInit & { skipJsonContentType?: boolean },
): Promise<T | undefined> {
  const token = useAuthStore.getState().token;
  if (!token) {
    throw new Error('Sessão sem token. Faça login novamente com a API configurada.');
  }

  const url = resolveUrl(path);
  const isForm = typeof FormData !== 'undefined' && options?.body instanceof FormData;
  const headers: HeadersInit = {
    Authorization: `Bearer ${token}`,
    ...(options?.headers as Record<string, string>),
  };
  if (!isForm && !options?.skipJsonContentType) {
    (headers as Record<string, string>)['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  if (response.status === 204) {
    return undefined;
  }

  const text = await response.text();
  if (!text) {
    return undefined;
  }

  return JSON.parse(text) as T;
}

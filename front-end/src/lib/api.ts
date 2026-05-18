import { ENV } from '@/constants/env';
import { useAuthStore } from '@/store/auth.store';

async function readErrorMessage(response: Response): Promise<string> {
  const text = await response.text();
  if (!text) {
    return `Request failed: ${response.status}`;
  }
  try {
    const body = JSON.parse(text) as { error?: string; message?: string };
    if (typeof body.error === 'string' && body.error.length > 0) {
      return body.error;
    }
    if (typeof body.message === 'string' && body.message.length > 0) {
      return body.message;
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

/** Evita `fetch` pendente indefinidamente (multipart costuma ir para outro host / proxy). */
function signalWithOptionalTimeout(
  existing: AbortSignal | undefined,
  timeoutMs: number | undefined,
): AbortSignal | undefined {
  if (timeoutMs === undefined || timeoutMs <= 0) {
    return existing;
  }
  if (typeof AbortSignal === 'undefined' || typeof AbortSignal.timeout !== 'function') {
    return existing;
  }
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  if (!existing) {
    return timeoutSignal;
  }
  if (typeof AbortSignal.any === 'function') {
    return AbortSignal.any([existing, timeoutSignal]);
  }
  return existing;
}

/** Fastify rejeita `Content-Type: application/json` sem corpo (ex.: DELETE). */
function shouldSetJsonContentType(fetchInit: RequestInit, isForm: boolean): boolean {
  if (isForm) {
    return false;
  }
  const b = fetchInit.body;
  if (b === undefined || b === null) {
    return false;
  }
  if (typeof b === 'string' && b.length === 0) {
    return false;
  }
  return true;
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = resolveUrl(path);
  const { headers: optionHeaders, ...fetchInit } = options ?? {};
  const isForm =
    typeof FormData !== 'undefined' && fetchInit.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(optionHeaders && typeof optionHeaders === 'object' && !Array.isArray(optionHeaders)
      ? (optionHeaders as Record<string, string>)
      : {}),
  };
  if (shouldSetJsonContentType(fetchInit, isForm)) {
    headers['Content-Type'] = 'application/json';
  }
  const response = await fetch(url, {
    ...fetchInit,
    headers,
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
  options?: RequestInit & { skipJsonContentType?: boolean; timeoutMs?: number },
): Promise<T | undefined> {
  const token = useAuthStore.getState().token;
  if (!token) {
    throw new Error('Sessão sem token. Faça login novamente com a API configurada.');
  }

  const url = resolveUrl(path);
  const {
    skipJsonContentType = false,
    timeoutMs: timeoutMsOption,
    headers: optionHeaders,
    ...fetchInit
  } = (options ?? {}) as RequestInit & {
    skipJsonContentType?: boolean;
    timeoutMs?: number;
  };

  const isForm =
    typeof FormData !== 'undefined' && fetchInit.body instanceof FormData;
  /** Upload multipart: limite para não ficar preso em "Salvando…" se a rede/servidor não responder. */
  const timeoutMs = timeoutMsOption ?? (isForm ? 90_000 : undefined);
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    ...(optionHeaders && typeof optionHeaders === 'object' && !Array.isArray(optionHeaders)
      ? (optionHeaders as Record<string, string>)
      : {}),
  };
  if (!skipJsonContentType && shouldSetJsonContentType(fetchInit, isForm)) {
    headers['Content-Type'] = 'application/json';
  }

  const signal = signalWithOptionalTimeout(fetchInit.signal ?? undefined, timeoutMs);

  let response: Response;
  try {
    response = await fetch(url, {
      ...fetchInit,
      headers,
      ...(signal ? { signal } : {}),
    });
  } catch (e) {
    const abortedByTimeout =
      (e instanceof DOMException && e.name === 'AbortError') ||
      (e instanceof Error && e.name === 'AbortError');
    if (abortedByTimeout) {
      throw new Error(
        'Tempo esgotado ao enviar ou receber resposta da API. Verifique se o back-end está acessível, a URL em VITE_API_URL e a rede.',
        { cause: e },
      );
    }
    throw e;
  }

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

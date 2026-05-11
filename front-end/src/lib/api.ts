import { ENV } from '@/constants/env';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const base = ENV.API_URL;
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export { apiFetch };

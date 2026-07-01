function normalizeBaseUrl(url: string): string {
  return url.replace(/\/$/, '');
}

function resolveApiUrl(): string {
  /**
   * Com `vite dev`, usar `/api` (mesma origem + proxy). Assim o celular na rede
   * acessa `http://<ip-do-pc>:5173` e API/WS/uploads passam pelo Vite → back-end.
   * Evita `localhost:5010` no browser do celular (localhost = o próprio aparelho).
   */
  if (import.meta.env.DEV) {
    return '/api';
  }
  return normalizeBaseUrl(
    (import.meta.env.VITE_BASE_URL_API as string | undefined) ?? '',
  );
}

export const ENV = {
  API_URL: resolveApiUrl(),
  APP_ENV:
    (import.meta.env.VITE_APP_ENV as string | undefined) ?? 'development',
};

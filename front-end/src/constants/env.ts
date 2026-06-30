function normalizeBaseUrl(url: string): string {
  return url.replace(/\/$/, '');
}

export const ENV = {
  API_URL: normalizeBaseUrl(
    (import.meta.env.VITE_BASE_URL_API as string | undefined) ?? '',
  ),
  APP_ENV:
    (import.meta.env.VITE_APP_ENV as string | undefined) ?? 'development',
};

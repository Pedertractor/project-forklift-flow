/** Formata milissegundos como duração `hh:mm:ss` (ex.: `01:05:30`). */
export function formatDurationMs(ms: number | null | undefined): string {
  if (ms == null) return '-';

  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((part) => String(part).padStart(2, '0'))
    .join(':');
}

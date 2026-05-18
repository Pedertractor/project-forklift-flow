/** Texto curto em pt-BR para intervalo desde `isoDate` ate agora (valor >= 0). */
export function formatDurationSincePt(isoDate: string): string {
  const then = new Date(isoDate).getTime();
  if (!Number.isFinite(then)) {
    return '—';
  }
  const diffSec = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (diffSec < 60) {
    return `${diffSec} s`;
  }
  const min = Math.floor(diffSec / 60);
  if (min < 60) {
    return `${min} min`;
  }
  const hours = Math.floor(min / 60);
  if (hours < 48) {
    return `${hours} h`;
  }
  const days = Math.floor(hours / 24);
  return `${days} d`;
}

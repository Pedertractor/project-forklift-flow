export function formatDate(isoDate: string, locale = 'en-US'): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
  }).format(date);
}

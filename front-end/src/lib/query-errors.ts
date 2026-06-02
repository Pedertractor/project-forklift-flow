/** Erro do TanStack Query quando um fetch é cancelado por invalidate/refetch concorrente. */
export function isQueryCancellationError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return (
    error.name === 'CancelledError' ||
    error.message === 'CancelledError' ||
    /query was cancelled/i.test(error.message)
  );
}

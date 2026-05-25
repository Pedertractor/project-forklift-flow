import { toast } from '@/lib/toast';
import { isQueryCancellationError } from '@/lib/query-errors';

/** Mensagem de erro amigável para mutations (pt-BR). */
export function toastApiError(error: Error): void {
  if (isQueryCancellationError(error)) {
    return;
  }
  const msg = error.message.trim() !== '' ? error.message : 'Ocorreu um erro inesperado.';
  toast.error(msg);
}

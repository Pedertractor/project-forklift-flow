import { toast } from '@/lib/toast';

/** Mensagem de erro amigável para mutations (pt-BR). */
export function toastApiError(error: Error): void {
  const msg = error.message.trim() !== '' ? error.message : 'Ocorreu um erro inesperado.';
  toast.error(msg);
}

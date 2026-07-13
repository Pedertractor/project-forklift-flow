import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/brand-button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type SimpleModalProps = {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  /** Classes extras no painel (ex.: `max-w-2xl` para fluxos em etapas). */
  panelClassName?: string;
  showHeaderClose?: boolean;
  headerCloseDisabled?: boolean;
};

export function SimpleModal({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  panelClassName,
  showHeaderClose,
  headerCloseDisabled,
}: SimpleModalProps) {
  if (!open || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-zinc-900/40 backdrop-blur-[1px]"
        aria-label="Fechar"
        onClick={onClose}
      />
      <Card
        className={cn(
          'relative z-10 flex max-h-[min(90vh,40rem)] w-full max-w-lg flex-col overflow-hidden border border-zinc-200 p-0 shadow-xl',
          panelClassName,
        )}
      >
        <div className="shrink-0 border-b border-zinc-100 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="m-0 text-lg font-semibold tracking-tight text-zinc-900">
                {title}
              </h2>
              {description ? (
                <p className="mt-2 mb-0 text-sm text-zinc-600">{description}</p>
              ) : null}
            </div>
            {showHeaderClose ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="shrink-0"
                aria-label="Fechar"
                disabled={headerCloseDisabled}
                onClick={onClose}
              >
                <X className="size-5" aria-hidden />
              </Button>
            ) : null}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {children}
        </div>
        {footer ? (
          <div className="shrink-0 border-t border-zinc-100 bg-zinc-50/80 px-5 py-3">
            {footer}
          </div>
        ) : null}
      </Card>
    </div>,
    document.body,
  );
}

export function ModalActions({
  onCancel,
  submitLabel,
  onSubmit,
  disabled,
  danger,
}: {
  onCancel: () => void;
  submitLabel: string;
  onSubmit: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
      <Button
        type="button"
        variant="outline"
        className="w-full sm:w-auto"
        onClick={onCancel}
      >
        Cancelar
      </Button>
      <Button
        type="button"
        variant="default"
        disabled={disabled}
        onClick={onSubmit}
        className={
          danger
            ? 'w-full border-transparent bg-red-600 text-white hover:bg-red-700 sm:w-auto'
            : 'w-full sm:w-auto'
        }
      >
        {submitLabel}
      </Button>
    </div>
  );
}

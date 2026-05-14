import { Toaster as SonnerToaster } from 'sonner';

/**
 * Toasts globais (Sonner — padrão shadcn/ui).
 * Use `import { toast } from '@/lib/toast'` nos hooks.
 */
export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      richColors
      closeButton
      offset="1rem"
      duration={4800}
      toastOptions={{
        classNames: {
          toast:
            'group rounded-xl border font-sans shadow-lg backdrop-blur-[2px] [&_[data-button]]:rounded-lg',
          title: 'font-semibold',
          description: 'text-sm opacity-90',
        },
      }}
    />
  );
}

import { forwardRef, type ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export const Input = forwardRef<HTMLInputElement, ComponentProps<'input'>>(
  function Input({ className, type, ...props }, ref) {
    return (
      <input
        ref={ref}
        type={type}
        data-slot="input"
        className={cn(
          'h-[var(--control-height,2.5rem)] w-full min-w-0 rounded-xl border-2 border-zinc-200 bg-white px-4 py-2 text-sm font-medium leading-snug text-zinc-900 outline-none transition-colors placeholder:text-zinc-500 focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-brand/35 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-red-600 aria-invalid:ring-[3px] aria-invalid:ring-red-600/20',
          className,
        )}
        {...props}
      />
    );
  },
);

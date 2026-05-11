import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export function Card({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="card"
      className={cn(
        'overflow-hidden rounded-xl bg-white text-sm text-zinc-900 shadow-lg ring-1 ring-zinc-950/10',
        className,
      )}
      {...props}
    />
  );
}

import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export function Separator({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      role="separator"
      data-slot="separator"
      className={cn('bg-border shrink-0', className)}
      {...props}
    />
  );
}

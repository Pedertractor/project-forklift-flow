import * as React from 'react';

import { cn } from '@/lib/utils';

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'flex field-sizing-content min-h-16 w-full rounded-xl border-2 border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-900 transition-colors outline-none placeholder:text-zinc-500 focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-brand/35 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-red-600 aria-invalid:ring-[3px] aria-invalid:ring-red-600/20',
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };

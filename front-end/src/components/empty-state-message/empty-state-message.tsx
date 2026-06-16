import { Info } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  icon?: ReactNode;
  description?: string;
}

export function EmptyStateMessage({
  icon,
  title,
  description,
}: EmptyStateProps) {
  return (
    <div className="flex items-center justify-center py-4">
      <div className="flex flex-col items-center justify-center text-center">
        <div
          className="flex size-12 items-center justify-center rounded-lg bg-zinc-100 text-zinc-400"
          aria-hidden
        >
          {icon ?? <Info className="size-6" strokeWidth={2} />}
        </div>

        <p className="mt-3 font-medium text-zinc-600">{title}</p>

        {description && (
          <p className="mt-1 max-w-xs text-sm text-zinc-500">{description}</p>
        )}
      </div>
    </div>
  );
}

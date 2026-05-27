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
    <div className={`flex justify-center items-center`}>
      <div className="flex flex-col items-center justify-center text-center text-black">
        <div className="w-16 h-16 rounded-xl flex items-center justify-center bg-brand-light/70 ">
          {icon ?? <Info className="w-8 h-8" />}
        </div>

        <p className="font-semibold mt-4">{title}</p>

        {description && (
          <p className="text-sm text-muted-foreground max-w-xs">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

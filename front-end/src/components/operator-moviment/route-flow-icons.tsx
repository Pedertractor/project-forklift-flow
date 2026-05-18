import { cn } from '@/lib/utils';
import {
  RouteFlowStepDetails,
  type RouteFlowDetailItem,
} from '@/components/operator-moviment/route-flow-step-details';

export type RouteFlowStepId = 'receiving' | 'machine' | 'pallet' | 'expedition';

export function ReceivingIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden
    >
      <path
        d="M3 9l9-5 9 5v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9z"
        strokeLinejoin="round"
      />
      <path d="M9 22V12h6v10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function MachineIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden
    >
      <rect x="4" y="6" width="16" height="12" rx="2" />
      <path d="M8 6V4h8v2M12 12v3" strokeLinecap="round" />
    </svg>
  );
}

export function PalletIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden
    >
      <path d="M4 10h16v8H4z" strokeLinejoin="round" />
      <path d="M8 10V6h8v4M6 14h2M11 14h2M16 14h2" strokeLinecap="round" />
    </svg>
  );
}

export function ExpeditionIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden
    >
      <path d="M3 17h13l3-6H6l-2 6z" strokeLinejoin="round" />
      <circle cx="7" cy="19" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="17" cy="19" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function routeFlowStepIcon(id: RouteFlowStepId) {
  switch (id) {
    case 'receiving':
      return ReceivingIcon;
    case 'machine':
      return MachineIcon;
    case 'pallet':
      return PalletIcon;
    case 'expedition':
      return ExpeditionIcon;
  }
}

export function SuggestionFlowConnector({
  size = 'default',
}: {
  size?: 'default' | 'compact';
}) {
  const compact = size === 'compact';
  return (
    <div
      className={cn(
        'relative flex flex-1 items-center',
        /* Mesma altura do círculo: com items-start no pai, o topo alinha ao ícone e a linha fica no meio. */
        compact ? 'h-8 sm:h-9' : 'h-12 sm:h-14',
        compact
          ? 'mx-0 min-w-[0.625rem]'
          : 'mx-0.5 min-w-[1.25rem] sm:mx-1 sm:min-w-[1.75rem]',
      )}
    >
      <div
        className={cn(
          'w-full rounded-full bg-[#005fb8]/40',
          compact ? 'h-px' : 'h-0.5',
        )}
      />
      <div
        className={cn(
          'absolute right-0 top-1/2 size-0 -translate-y-1/2 border-y-transparent border-l-[#005fb8]/50',
          compact
            ? 'border-y-[3px] border-l-[5px]'
            : 'border-y-[5px] border-l-[7px]',
        )}
        aria-hidden
      />
    </div>
  );
}

export function SuggestionFlowStep({
  stepId,
  label,
  details,
  accent,
  size = 'default',
}: {
  stepId: RouteFlowStepId;
  label: string;
  details?: RouteFlowDetailItem[];
  accent?: 'start' | 'mid' | 'end';
  size?: 'default' | 'compact';
}) {
  const Icon = routeFlowStepIcon(stepId);
  const ring =
    accent === 'start'
      ? 'border-emerald-500/50 bg-emerald-50 text-emerald-700'
      : accent === 'end'
        ? 'border-sky-500/50 bg-sky-50 text-sky-700'
        : 'border-[#005fb8]/40 bg-[#005fb8]/[0.08] text-[#005fb8]';

  const compact = size === 'compact';

  return (
    <div
      className={cn(
        'flex flex-1 flex-col items-center text-center gap-2',
        compact
          ? 'min-w-[4.5rem] max-w-[6.5rem] sm:min-w-[5rem] sm:max-w-[7rem]'
          : 'min-w-[4.75rem] max-w-[11rem] sm:max-w-[12rem]',
      )}
    >
      <div
        className={cn(
          'flex items-center justify-center rounded-full border-2 shadow-sm',
          compact ? 'size-8 border sm:size-9' : 'size-12 sm:size-14',
          ring,
        )}
      >
        <Icon
          className={compact ? 'size-4 sm:size-[1.125rem]' : 'size-6 sm:size-7'}
        />
      </div>
      <p
        className={cn(
          'font-bold uppercase tracking-wide text-zinc-700',
          compact
            ? 'mt-1 text-[0.5625rem] leading-tight sm:text-[0.6rem]'
            : 'mt-2.5 text-[0.6875rem]',
        )}
      >
        {label}
      </p>
      {details && details.length > 0 ? (
        <RouteFlowStepDetails items={details} size={size} />
      ) : null}
    </div>
  );
}

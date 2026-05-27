import type { ReactNode } from 'react';
import {
  routeFlowStepIcon,
  type RouteFlowStepId,
} from '@/components/operator-moviment/route-flow-icons';
import type { RouteFlowDetailItem } from '@/components/operator-moviment/route-flow-step-details';
import { cn } from '@/lib/utils';
import { Box, Calendar, ChevronRight, MapPin, Truck } from 'lucide-react';

export interface DeliverFlowStepConfig {
  stepNumber: number;
  stepId: RouteFlowStepId;
  label: string;
  details: RouteFlowDetailItem[];
  theme: 'blue' | 'purple' | 'green';
}

const STEP_THEMES = {
  blue: {
    number: 'bg-blue-100 text-blue-800',
    ring: 'border-blue-500 text-blue-600 ring-blue-200',
    title: 'text-blue-800',
    cardAccent: 'border-l-blue-500',
    connector: 'border-blue-300',
    chevron: 'bg-blue-600',
  },
  purple: {
    number: 'bg-violet-100 text-violet-800',
    ring: 'border-violet-500 text-violet-600 ring-violet-200',
    title: 'text-violet-800',
    cardAccent: 'border-l-violet-500',
    connector: 'border-violet-300',
    chevron: 'bg-violet-600',
  },
  green: {
    number: 'bg-emerald-100 text-emerald-800',
    ring: 'border-emerald-500 text-emerald-600 ring-emerald-200',
    title: 'text-emerald-800',
    cardAccent: 'border-l-emerald-500',
    connector: 'border-emerald-300',
    chevron: 'bg-emerald-600',
  },
} as const;

function detailRowIconClass(kind: RouteFlowDetailItem['kind']): string {
  switch (kind) {
    case 'location':
      return 'text-brand';
    case 'prisma':
      return 'text-amber-600';
    case 'receiving':
      return 'text-emerald-600';
    case 'expedition':
      return 'text-sky-600';
  }
}

function DeliverFlowDetailRow({ item }: { item: RouteFlowDetailItem }) {
  const Icon = item.kind === 'prisma' ? Box : MapPin;
  return (
    <li className="flex items-start gap-2">
      <Icon
        className={cn('mt-0.5 size-4 shrink-0', detailRowIconClass(item.kind))}
        aria-hidden
      />
      <span className="min-w-0 flex-1 text-left text-sm leading-snug text-zinc-800">
        {item.text}
      </span>
    </li>
  );
}

function DeliverFlowDashedConnector({
  chevronClass,
  lineClass,
}: {
  chevronClass: string;
  lineClass: string;
}) {
  return (
    <div
      className={cn(
        'relative flex min-w-[2.5rem] max-w-[4rem] flex-1 items-center self-start',
        'pt-7 sm:pt-8',
      )}
      aria-hidden
    >
      <div className={cn('h-0 w-full border-t-2 border-dashed', lineClass)} />
      <div
        className={cn(
          'absolute left-1/2 top-1/2 flex size-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-white shadow-sm',
          chevronClass,
        )}
      >
        <ChevronRight className="size-4" strokeWidth={2.5} />
      </div>
    </div>
  );
}

function DeliverFlowStepColumn({ step }: { step: DeliverFlowStepConfig }) {
  const theme = STEP_THEMES[step.theme];
  const Icon = routeFlowStepIcon(step.stepId);
  const stepLabel = String(step.stepNumber).padStart(2, '0');

  return (
    <div className="flex w-[10.5rem] shrink-0 flex-col items-center sm:w-[11.5rem]">
      <span
        className={cn(
          'flex size-8 items-center justify-center rounded-full text-xs font-bold',
          theme.number,
        )}
      >
        {stepLabel}
      </span>

      <div
        className={cn(
          'mt-3 flex size-[4.25rem] items-center justify-center rounded-full border-[3px] bg-white ring-4 ring-offset-2 sm:size-[4.75rem]',
          theme.ring,
        )}
      >
        <Icon className="size-9 sm:size-10" />
      </div>

      <p
        className={cn(
          'mt-4 px-1 text-center text-sm font-bold leading-snug',
          theme.title,
        )}
      >
        {step.label}
      </p>

      <div
        className={cn(
          'mt-3 w-full rounded-lg border border-zinc-200/90 bg-white px-3 py-2.5 shadow-sm',
          'border-l-[5px]',
          theme.cardAccent,
        )}
      >
        <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
          {step.details.map((item, index) => (
            <DeliverFlowDetailRow key={`${item.kind}-${index}`} item={item} />
          ))}
        </ul>
      </div>
    </div>
  );
}

export function DeliverThreeStepFlow({
  steps,
}: {
  steps: DeliverFlowStepConfig[];
}) {
  return (
    <div className="w-full min-w-0 overflow-x-auto py-1 [-webkit-overflow-scrolling:touch]">
      <div className="flex min-w-max items-start justify-center gap-0 px-1">
        {steps.map((step, index) => (
          <div key={step.stepNumber} className="flex items-start">
            <DeliverFlowStepColumn step={step} />
            {index < steps.length - 1 ? (
              <DeliverFlowDashedConnector
                lineClass={STEP_THEMES[step.theme].connector}
                chevronClass={STEP_THEMES[step.theme].chevron}
              />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

export interface DeliverFlowCardHeaderProps {
  title: string;
  machineName: string;
  statusLabel: string | null;
  sinceLabel: string | null;
  isCritical: boolean;
  criticalBadge?: ReactNode;
}

export function DeliverFlowCardHeader({
  title,
  machineName,
  statusLabel,
  sinceLabel,
  isCritical,
  criticalBadge,
}: DeliverFlowCardHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-100/90 px-4 py-4 sm:px-6 sm:py-5">
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-brand">
            <Truck className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h3 className="m-0 text-lg font-bold leading-tight text-[#0a2d5c] sm:text-xl">
              {title}
            </h3>
            <p className="mt-0.5 text-base font-semibold text-zinc-800">
              {machineName}
            </p>
          </div>
        </div>
        {statusLabel || sinceLabel ? (
          <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-zinc-600">
            {statusLabel ? (
              <>
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-brand" aria-hidden />
                  Status:{' '}
                  <span className="font-medium text-zinc-800">
                    {statusLabel}
                  </span>
                </span>
                {sinceLabel ? (
                  <span className="hidden text-zinc-300 sm:inline" aria-hidden>
                    |
                  </span>
                ) : null}
              </>
            ) : null}
            {sinceLabel ? (
              <span className="inline-flex items-center gap-1.5">
                <Calendar
                  className="size-4 shrink-0 text-zinc-500"
                  aria-hidden
                />
                Desde {sinceLabel}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
      {isCritical
        ? (criticalBadge ?? (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-800">
              <svg
                className="size-4 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden
              >
                <path
                  d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Crítico
            </span>
          ))
        : null}
    </div>
  );
}

export function DeliverFlowCardFooter({ children }: { children: ReactNode }) {
  return (
    <div className="border-t border-zinc-100 bg-gradient-to-b from-white to-blue-50/40 px-4 py-5 sm:px-6">
      <div className="flex justify-center">{children}</div>
    </div>
  );
}

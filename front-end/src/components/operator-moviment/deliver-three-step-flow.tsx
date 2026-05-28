import type { ReactNode } from 'react';
import { routeFlowStepLucideIcon } from '@/components/operator-moviment/route-flow-icons';
import type { RouteFlowStepId } from '@/components/operator-moviment/route-flow-icons';
import {
  ROUTE_FLOW_DETAIL_META,
  type RouteFlowDetailItem,
} from '@/components/operator-moviment/route-flow-step-details';
import { cn } from '@/lib/utils';
import { AlertTriangle, MapPinned, Truck } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export const deliverFlowAcceptButtonClass =
  'h-12 min-w-[17rem] gap-2.5 rounded-full bg-brand px-10 text-base font-semibold text-white shadow-sm hover:bg-brand/80';

export function DeliverFlowCriticalBadge() {
  return (
    <span className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800">
      <AlertTriangle className="size-4 shrink-0 text-red-500" aria-hidden />
      Crítico
    </span>
  );
}

export function DeliverFlowDeferBanner({ children }: { children: ReactNode }) {
  return (
    <div className="border-b border-amber-200/80 bg-amber-100/60 px-4 py-2 text-center text-xs font-medium text-amber-950">
      {children}
    </div>
  );
}

export function DeliverFlowActionFooter({
  children,
  isCritical = false,
}: {
  children: ReactNode;
  isCritical?: boolean;
}) {
  return (
    <DeliverFlowCardFooter>
      <div className="flex items-center gap-2">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-brand text-white">
          <MapPinned className="size-5" aria-hidden />
        </span>
      </div>
      {children}
      {isCritical ? <DeliverFlowCriticalBadge /> : null}
    </DeliverFlowCardFooter>
  );
}

export function DeliverFlowAcceptButton({
  children,
  disabled,
  onClick,
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      className={deliverFlowAcceptButtonClass}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

export interface DeliverFlowStepConfig {
  stepNumber: number;
  stepId: RouteFlowStepId;
  label: string;
  details: RouteFlowDetailItem[];
  /** @deprecated Ignorado — layout monocromático do mockup. */
  theme?: 'blue' | 'purple' | 'green';
}

/** Altura mínima da área título — alinha o topo dos cards entre colunas. */
const STEP_TITLE_MIN_H = 'min-h-[2.75rem] sm:min-h-[3rem]';

/** Altura mínima dos cards de detalhe (2 linhas) — mesma altura em todos os passos. */
const STEP_DETAILS_MIN_H = 'min-h-[5.5rem] sm:min-h-[6rem]';

function FlowStepDotConnector() {
  return (
    <div
      className="relative flex w-10 shrink-0 items-center self-center sm:w-10"
      aria-hidden
    >
      <div className="h-0 w-full border-t border-dashed border-zinc-400" />
      <span className="absolute left-1/2 top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-zinc-900" />
    </div>
  );
}

function FlowStepDetailsCard({
  items,
  className,
}: {
  items: RouteFlowDetailItem[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex w-full flex-col justify-center overflow-hidden',
        STEP_DETAILS_MIN_H,
        className,
      )}
    >
      {items.map((item, index) => {
        const { Icon } = ROUTE_FLOW_DETAIL_META[item.kind];
        return (
          <div
            key={`${item.kind}-${index}`}
            className={cn(
              'flex flex-1 items-center gap-2.5 px-3.5 py-3',
              index > 0 && 'border-t border-zinc-200',
            )}
          >
            <Icon className="size-4 shrink-0 text-brand" aria-hidden />
            <span className="min-w-0 flex-1 text-left text-xs leading-snug text-zinc-800 ">
              {item.text}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function FlowStepColumn({ step }: { step: DeliverFlowStepConfig }) {
  const StepIcon = routeFlowStepLucideIcon(step.stepId);

  return (
    <div className="flex w-[9rem] shrink-0 flex-col sm:w-[10.5rem]">
      <div className="flex flex-col items-center">
        <span className="flex size-6 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-white">
          {step.stepNumber}
        </span>

        <div className="relative mt-3 flex size-14 items-center justify-center rounded-full bg-white sm:size-16">
          <span
            className="absolute inset-0 rounded-full ring-1 ring-zinc-300"
            aria-hidden
          />
          <span
            className="absolute inset-1 rounded-full ring-1 ring-zinc-200"
            aria-hidden
          />
          <StepIcon
            className="relative z-10 size-7 text-zinc-800 sm:size-8"
            strokeWidth={1.5}
            aria-hidden
          />
        </div>

        <p
          className={cn(
            'mt-4 flex w-full items-center justify-center px-1 text-center text-xs font-bold leading-snug text-zinc-900 sm:mt-5 sm:text-sm',
            STEP_TITLE_MIN_H,
          )}
        >
          {step.label}
        </p>
      </div>

      <FlowStepDetailsCard items={step.details} />
    </div>
  );
}

export function DeliverThreeStepFlow({
  steps,
}: {
  steps: DeliverFlowStepConfig[];
}) {
  return (
    <div className="w-full min-w-0 overflow-x-auto  [-webkit-overflow-scrolling:touch]">
      <div className="flex min-w-max items-stretch justify-center gap-6 px-2 sm:gap-10">
        {steps.map((step, index) => (
          <div key={step.stepNumber} className="flex items-stretch">
            <FlowStepColumn step={step} />
            {index < steps.length - 1 ? <FlowStepDotConnector /> : null}
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
  isCritical,
  criticalBadge,
}: DeliverFlowCardHeaderProps) {
  return (
    <div className="border-b border-zinc-200 px-5 py-5 sm:px-6 sm:py-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700">
            <Truck className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h3 className="m-0 text-lg font-bold leading-tight text-zinc-900 sm:text-xl">
              {title}
            </h3>
            <p className="mt-1 text-base font-normal text-zinc-800">
              {machineName}
            </p>
            {/* {statusLabel || sinceLabel ? (
              <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-zinc-600">
                {statusLabel ? (
                  <>
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="size-1.5 rounded-full bg-zinc-900"
                        aria-hidden
                      />
                      Status:{' '}
                      <span className="font-semibold text-zinc-900">
                        {statusLabel}
                      </span>
                    </span>
                  </>
                ) : null}
                {sinceLabel ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar
                      className="size-3.5 shrink-0 text-zinc-500"
                      aria-hidden
                    />
                    Desde {sinceLabel}
                  </span>
                ) : null}
              </p>
            ) : null} */}
          </div>
        </div>
        {isCritical ? (criticalBadge ?? <DeliverFlowCriticalBadge />) : null}
      </div>
    </div>
  );
}

export function DeliverFlowCardFooter({ children }: { children: ReactNode }) {
  return (
    <div className="border-t border-zinc-200 px-5 py-2 sm:px-6 ">
      <div className="flex justify-between">{children}</div>
    </div>
  );
}

export function DeliverFlowCard({
  deferBanner,
  children,
  className,
}: {
  deferBanner?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-md',
        className,
      )}
    >
      {deferBanner}
      {children}
    </div>
  );
}

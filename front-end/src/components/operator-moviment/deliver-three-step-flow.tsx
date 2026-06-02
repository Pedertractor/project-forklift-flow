import { Fragment, type ReactNode } from 'react';
import {
  ReceivingIcon,
  routeFlowStepLucideIcon,
} from '@/components/operator-moviment/route-flow-icons';
import type { RouteFlowStepId } from '@/components/operator-moviment/route-flow-icons';
import {
  ROUTE_FLOW_DETAIL_META,
  type RouteFlowDetailItem,
} from '@/components/operator-moviment/route-flow-step-details';
import { cn } from '@/lib/utils';
import { AlertTriangle, Box, MapPinned, Truck } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function DeliverFlowCriticalBadge({
  className,
}: {
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800',
        className,
      )}
    >
      <AlertTriangle className="size-4 shrink-0 text-red-500" aria-hidden />
      Crítico
    </span>
  );
}

export function DeliverFlowDeferBanner({ children }: { children: ReactNode }) {
  return (
    <div className="border-b border-amber-200/80 bg-amber-100/60 px-3 py-2 text-center text-xs font-medium leading-snug text-amber-950 md:px-4">
      {children}
    </div>
  );
}

export function DeliverFlowActivitySubtitle({
  children,
  start,
}: {
  children: ReactNode;
  /** Conteúdo alinhado ao início (ex.: nome da máquina). Com `start`, `children` fica centralizado na linha. */
  start?: ReactNode;
}) {
  if (start != null) {
    return (
      <div className="mb-4 flex w-full items-center justify-between gap-2 text-[11px] font-semibold uppercase leading-tight tracking-wide sm:text-xs sm:leading-normal sm:tracking-wider md:grid md:grid-cols-[1fr_auto_1fr] md:gap-0">
        <div className="min-w-0 shrink">{start}</div>
        <div className="shrink-0 md:justify-self-center">{children}</div>
        <div className="hidden md:block" aria-hidden />
      </div>
    );
  }

  return (
    <p className="mb-4 text-center text-xs font-semibold uppercase tracking-wider">
      {children}
    </p>
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
      <div className="grid w-full grid-cols-1 items-center gap-3 md:grid-cols-[1fr_auto_1fr] md:gap-2">
        <div className="hidden md:block" aria-hidden />
        <div className="flex min-w-0 flex-col items-center gap-2 justify-self-center">
          {children}
        </div>
        <div
          className={cn(
            'flex items-center justify-center md:justify-end',
            isCritical ? 'min-h-11' : 'hidden md:block',
          )}
        >
          {isCritical ? <DeliverFlowCriticalBadge /> : null}
        </div>
      </div>
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
  className?: string;
}) {
  return (
    <Button
      type="button"
      className={cn(
        'h-11 w-full min-w-0 max-w-full animate-pulse gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-white shadow-sm hover:cursor-pointer hover:bg-brand/80',
        'md:h-12 md:w-auto md:min-w-[17rem] md:max-w-none md:gap-2.5 md:px-10 md:text-base',
      )}
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

/** Colunas legíveis no fluxo horizontal (grid); trilhos flexíveis entre elas. */
function buildFlowGridColumns(stepCount: number): string {
  return Array.from({ length: stepCount }, (_, index) =>
    index === 0
      ? 'minmax(5.75rem, 1fr)'
      : 'minmax(0.5rem, 0.45fr) minmax(5.75rem, 1fr)',
  ).join(' ');
}

/** Centro vertical do anel de ícone (número + gap-2 + metade do ícone). */
const STEP_ICON_RING_CENTER_MT = 'mt-[3.75rem] sm:mt-16';

function FlowStepDotConnector({ gridColumn }: { gridColumn: number }) {
  return (
    <div
      className={cn(
        'relative w-full min-w-0 self-start',
        STEP_ICON_RING_CENTER_MT,
      )}
      style={{ gridColumn }}
      aria-hidden
    >
      <div className="absolute inset-x-0 top-1/2 h-0 -translate-y-1/2 border-t border-dashed border-zinc-400" />
      <span className="absolute left-1/2 top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-zinc-900" />
    </div>
  );
}

function FlowStepVerticalConnector() {
  return <div className="my-1 w-px min-h-4 flex-1 bg-zinc-500" aria-hidden />;
}

function FlowStepIconRing({
  stepId,
  size = 'default',
}: {
  stepId: RouteFlowStepId;
  size?: 'default' | 'compact';
}) {
  const StepIcon = routeFlowStepLucideIcon(stepId);
  const compact = size === 'compact';

  return (
    <div
      className={cn(
        'relative flex shrink-0 items-center justify-center rounded-full bg-white',
        compact ? 'size-12' : 'size-14 sm:size-16',
      )}
    >
      <span
        className="absolute inset-0 rounded-full ring-1 ring-zinc-300"
        aria-hidden
      />
      <span
        className="absolute inset-1 rounded-full ring-1 ring-zinc-200"
        aria-hidden
      />
      <StepIcon
        className={cn(
          'relative z-10 text-zinc-800',
          compact ? 'size-6' : 'size-7 sm:size-8',
        )}
        strokeWidth={1.5}
        aria-hidden
      />
    </div>
  );
}

function FlowStepDetailsCard({
  items,
  className,
  layout = 'row',
}: {
  items: RouteFlowDetailItem[];
  className?: string;
  /** `stacked` no fluxo horizontal: ícone acima do texto, com quebra de linha. */
  layout?: 'row' | 'stacked';
}) {
  const stacked = layout === 'stacked';

  return (
    <div
      className={cn(
        'flex w-full flex-col gap-1.5',
        stacked ? 'mt-1.5' : 'mt-1',
        className,
      )}
    >
      {items.map((item, index) => {
        const { Icon } = ROUTE_FLOW_DETAIL_META[item.kind];
        return (
          <div
            key={`${item.kind}-${index}`}
            className={cn(
              stacked
                ? 'flex flex-col items-center gap-1 rounded-lg bg-zinc-50/90 px-2 py-2 text-center'
                : 'flex items-start gap-2 rounded-lg bg-zinc-50/90 px-2.5 py-2',
              index > 0 && !stacked && 'border-t border-zinc-200',
            )}
          >
            <Icon
              className={cn(
                'shrink-0 text-brand',
                stacked ? 'size-4' : 'mt-0.5 size-4',
              )}
              aria-hidden
            />
            <span
              className={cn(
                'w-full text-xs leading-snug text-zinc-800 wrap-break-word',
                stacked ? 'text-center' : 'min-w-0 flex-1 text-left',
              )}
            >
              {item.text}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function FlowStepColumn({
  step,
  gridColumn,
  cube,
}: {
  step: DeliverFlowStepConfig;
  gridColumn?: number;
  detailLayout?: 'row' | 'stacked';
  cube?: string;
}) {
  return (
    <div
      className="flex min-w-0 flex-col"
      style={gridColumn != null ? { gridColumn } : undefined}
    >
      <div className="flex flex-col items-center gap-2">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-white">
          {step.stepNumber}
        </span>

        <FlowStepIconRing stepId={step.stepId} />

        <p className="m-0 w-full px-1 text-center text-xs font-semibold leading-snug wrap-break-word text-zinc-900 sm:text-sm">
          {step.label}
        </p>
        {step.stepId === 'receiving' && cube ? (
          <>
            <div className="flex gap-1 items-center">
              <Box className="size-4 text-brand" aria-hidden />
              <p className="">
                <span className="font-semibold text-xl tracking-widest">
                  {cube}
                </span>
              </p>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

function FlowStepVerticalRow({
  step,
  isLast,
  cube,
}: {
  step: DeliverFlowStepConfig;
  isLast: boolean;
  cube?: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex w-8 shrink-0 flex-col items-center">
        <span
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-sm font-bold text-white"
          aria-label={`Etapa ${step.stepNumber}`}
        >
          {step.stepNumber}
        </span>
        {!isLast ? <FlowStepVerticalConnector /> : null}
      </div>

      <div className={cn('min-w-0 flex-1', !isLast && 'pb-4 md:pb-5')}>
        <div className="flex min-w-0 flex-col items-start gap-2">
          <FlowStepIconRing stepId={step.stepId} size="compact" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold leading-snug text-zinc-900">
              {step.label}
            </p>
            {step.stepId === 'receiving' && cube ? (
              <div className="mt-1 flex items-center gap-1">
                <Box className="size-4 text-brand" aria-hidden />
                <span className="font-semibold text-xl tracking-widest">
                  {cube}
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function DeliverThreeStepFlowVertical({
  steps,
  cube,
}: {
  steps: DeliverFlowStepConfig[];
  cube?: string;
}) {
  return (
    <ol className="m-0 list-none space-y-0 p-0">
      {steps.map((step, index) => (
        <li key={step.stepNumber}>
          <FlowStepVerticalRow
            step={step}
            isLast={index === steps.length - 1}
            cube={cube}
          />
        </li>
      ))}
    </ol>
  );
}

function DeliverThreeStepFlowHorizontal({
  steps,
  cube,
}: {
  steps: DeliverFlowStepConfig[];
  cube?: string;
}) {
  const gridColumns = buildFlowGridColumns(steps.length);

  return (
    <div className="w-full min-w-0 px-1 sm:px-2">
      <div
        className="grid w-full min-w-0 list-none gap-y-3"
        style={{ gridTemplateColumns: gridColumns }}
      >
        {steps.map((step, index) => {
          const circleColumn = index * 2 + 1;

          return (
            <Fragment key={step.stepNumber}>
              {index > 0 ? (
                <FlowStepDotConnector gridColumn={index * 2} />
              ) : null}
              <FlowStepColumn
                step={step}
                gridColumn={circleColumn}
                detailLayout="stacked"
                cube={cube}
              />
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

export function DeliverThreeStepFlow({
  steps,
  cube,
}: {
  steps: DeliverFlowStepConfig[];
  cube?: string;
}) {
  return (
    <>
      <div className="md:hidden">
        <DeliverThreeStepFlowVertical steps={steps} cube={cube} />
      </div>
      <div className="hidden md:block">
        <DeliverThreeStepFlowHorizontal steps={steps} cube={cube} />
      </div>
    </>
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
    <div className="border-t border-zinc-200 px-3 py-3 md:px-5 md:py-2 lg:px-6">
      <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-2">
        {children}
      </div>
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
        'min-w-0 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-md md:rounded-2xl',
        className,
      )}
    >
      {deferBanner}
      {children}
    </div>
  );
}

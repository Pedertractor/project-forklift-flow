import { Fragment, type CSSProperties, type ReactNode } from 'react';
import { routeFlowStepLucideIcon } from '@/components/operator-moviment/route-flow-icons';
import type { RouteFlowStepId } from '@/components/operator-moviment/route-flow-icons';
import { type RouteFlowDetailItem } from '@/components/operator-moviment/route-flow-step-details';
import { cn } from '@/lib/utils';
import { AlertTriangle, Box, Truck } from 'lucide-react';
import { Button } from '@/components/ui/brand-button';

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
    <div className="border-b border-amber-200/80 bg-amber-100/60 px-3 py-2 text-center text-xs font-medium leading-snug text-amber-950 phone-landscape:shrink-0 phone-landscape:px-2 phone-landscape:py-0.5 phone-landscape:text-[10px] phone-landscape:leading-tight md:px-4">
      {children}
    </div>
  );
}

export function DeliverFlowActivitySubtitle({
  children,
  start,
  end,
}: {
  children: ReactNode;
  /** Conteúdo alinhado ao início (ex.: nome da máquina). Com `start`, `children` fica centralizado na linha. */
  start?: ReactNode;
  /** Conteúdo alinhado ao fim (ex.: horário da solicitação). */
  end?: ReactNode;
}) {
  if (start != null) {
    return (
      <div className="mb-4 grid w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-2 text-[11px] font-semibold uppercase leading-tight tracking-wide phone-landscape:mb-1.5 phone-landscape:shrink-0 phone-landscape:gap-x-1 phone-landscape:text-[13px] sm:text-xs sm:leading-normal sm:tracking-wider">
        <div className="min-w-0 justify-self-start">{start}</div>
        <div className="shrink-0 justify-self-center px-0.5">{children}</div>
        <div className="min-w-0 justify-self-end text-right">{end ?? null}</div>
      </div>
    );
  }

  return (
    <p className="mb-4 text-center text-xs font-semibold uppercase tracking-wider phone-landscape:text-sm">
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
      <div className="grid w-full grid-cols-1 items-center gap-2 phone-landscape:grid-cols-[1fr_auto_1fr] phone-landscape:gap-1 md:grid-cols-[1fr_auto_1fr] md:gap-2">
        <div
          className="hidden phone-landscape:block md:block"
          aria-hidden
        />
        <div className="flex min-w-0 flex-col items-center gap-2 justify-self-center">
          {children}
        </div>
        <div
          className={cn(
            'flex items-center justify-end justify-self-end',
            isCritical
              ? 'min-h-0'
              : 'hidden phone-landscape:block md:block',
          )}
        >
          {isCritical ? <DeliverFlowCriticalBadge /> : null}
        </div>
      </div>
    </DeliverFlowCardFooter>
  );
}

export type DeliverFlowButtonIntent = 'accept' | 'complete';

const deliverFlowButtonIntentClass: Record<DeliverFlowButtonIntent, string> = {
  accept:
    'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 focus-visible:ring-emerald-600/30',
  complete:
    'bg-brand text-white shadow-sm hover:bg-brand/80 focus-visible:ring-brand/25',
};

export function DeliverFlowAcceptButton({
  children,
  disabled,
  onClick,
  intent = 'complete',
  className,
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick: () => void;
  /** `accept` = aceitar sugestão (verde); `complete` = concluir tarefa (azul marca). */
  intent?: DeliverFlowButtonIntent;
  className?: string;
}) {
  return (
    <Button
      type="button"
      className={cn(
        'h-11 w-full min-w-0 max-w-full animate-pulse gap-2 rounded-lg px-4 text-sm font-semibold hover:cursor-pointer focus-visible:outline-none focus-visible:ring-[3px]',
        deliverFlowButtonIntentClass[intent],
        'phone-landscape:h-9 phone-landscape:gap-1.5 phone-landscape:px-5 phone-landscape:text-sm',
        'md:h-12 md:w-auto md:min-w-[17rem] md:max-w-none md:gap-2.5 md:px-10 md:text-base',
        className,
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
function buildFlowGridColumns(
  stepCount: number,
  compact = false,
  fluid = false,
): string {
  if (fluid) {
    return Array.from({ length: stepCount }, (_, index) =>
      index === 0 ? 'minmax(0, 1fr)' : 'minmax(0.1rem, 0.12fr) minmax(0, 1fr)',
    ).join(' ');
  }

  const stepMin = compact ? '3.25rem' : '5.75rem';
  const railMin = compact ? '0.2rem' : '0.5rem';
  const railMax = compact ? '0.2fr' : '0.45fr';

  return Array.from({ length: stepCount }, (_, index) =>
    index === 0
      ? `minmax(${stepMin}, 1fr)`
      : `minmax(${railMin}, ${railMax}) minmax(${stepMin}, 1fr)`,
  ).join(' ');
}

/** Centro vertical do anel de ícone (número + gap + metade do ícone). */
const STEP_ICON_RING_CENTER_MT = 'mt-[3.75rem] sm:mt-16';
const STEP_ICON_RING_CENTER_MT_COMPACT = 'mt-[2.375rem]';

type FlowStepSize = 'default' | 'compact' | 'micro';

interface LandscapeFlowMetrics {
  ringCqh: number;
  ringCqw: number;
  ringMaxRem: number;
  iconRatio: number;
  badgeCqh: number;
  badgeCqw: number;
  badgeMaxRem: number;
  labelCqh: number;
  labelCqw: number;
  labelMaxRem: number;
  gapCqh: number;
  gapCqw: number;
  cubeIconCqh: number;
  cubeIconCqw: number;
  cubeTextCqh: number;
  cubeTextCqw: number;
}

function landscapeFlowMetrics(stepCount: number): LandscapeFlowMetrics {
  if (stepCount <= 2) {
    return {
      ringCqh: 46,
      ringCqw: 21,
      ringMaxRem: 5,
      iconRatio: 0.72,
      badgeCqh: 12,
      badgeCqw: 6,
      badgeMaxRem: 1.5,
      labelCqh: 10,
      labelCqw: 5.2,
      labelMaxRem: 0.9375,
      gapCqh: 6,
      gapCqw: 3,
      cubeIconCqh: 9,
      cubeIconCqw: 4.5,
      cubeTextCqh: 8.5,
      cubeTextCqw: 4.2,
    };
  }

  if (stepCount === 3) {
    return {
      ringCqh: 40,
      ringCqw: 18,
      ringMaxRem: 4.5,
      iconRatio: 0.72,
      badgeCqh: 11,
      badgeCqw: 5.5,
      badgeMaxRem: 1.375,
      labelCqh: 9.5,
      labelCqw: 4.8,
      labelMaxRem: 0.875,
      gapCqh: 5,
      gapCqw: 2.5,
      cubeIconCqh: 8,
      cubeIconCqw: 4,
      cubeTextCqh: 7.5,
      cubeTextCqw: 3.8,
    };
  }

  return {
    ringCqh: 35,
    ringCqw: 14,
    ringMaxRem: 4,
    iconRatio: 0.72,
    badgeCqh: 10,
    badgeCqw: 5,
    badgeMaxRem: 1.25,
    labelCqh: 9,
    labelCqw: 4.5,
    labelMaxRem: 0.8125,
    gapCqh: 4.5,
    gapCqw: 2.2,
    cubeIconCqh: 7.5,
    cubeIconCqw: 3.8,
    cubeTextCqh: 7,
    cubeTextCqw: 3.5,
  };
}

function cqClamp(
  minRem: number,
  cqh: number,
  cqw: number,
  maxRem: number,
): string {
  return `clamp(${minRem}rem, min(${cqh}cqh, ${cqw}cqw), ${maxRem}rem)`;
}

function landscapeRingStyle(stepCount: number): CSSProperties {
  const m = landscapeFlowMetrics(stepCount);
  const size = cqClamp(2.75, m.ringCqh, m.ringCqw, m.ringMaxRem);
  return { width: size, height: size };
}

function landscapeIconStyle(stepCount: number): CSSProperties {
  const m = landscapeFlowMetrics(stepCount);
  const size = cqClamp(
    1.5,
    +(m.ringCqh * m.iconRatio).toFixed(1),
    +(m.ringCqw * m.iconRatio).toFixed(1),
    +(m.ringMaxRem * m.iconRatio).toFixed(2),
  );
  return { width: size, height: size };
}

function landscapeBadgeStyle(stepCount: number): CSSProperties {
  const m = landscapeFlowMetrics(stepCount);
  const size = cqClamp(1, m.badgeCqh, m.badgeCqw, m.badgeMaxRem);
  return {
    width: size,
    height: size,
    display: 'inline-flex',
    aspectRatio: '1',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '9999px',
    lineHeight: 1,
    fontSize: cqClamp(
      0.5,
      +(m.badgeCqh * 0.36).toFixed(1),
      +(m.badgeCqw * 0.36).toFixed(1),
      0.6875,
    ),
  };
}

function landscapeLabelStyle(stepCount: number): CSSProperties {
  const m = landscapeFlowMetrics(stepCount);
  return {
    fontSize: cqClamp(0.6875, m.labelCqh, m.labelCqw, m.labelMaxRem),
  };
}

function landscapeGapStyle(stepCount: number): CSSProperties {
  const m = landscapeFlowMetrics(stepCount);
  return { gap: cqClamp(0.2, m.gapCqh, m.gapCqw, 0.625) };
}

function landscapeCubeIconStyle(stepCount: number): CSSProperties {
  const m = landscapeFlowMetrics(stepCount);
  const size = cqClamp(0.75, m.cubeIconCqh, m.cubeIconCqw, 1.125);
  return { width: size, height: size };
}

function landscapeCubeTextStyle(stepCount: number): CSSProperties {
  const m = landscapeFlowMetrics(stepCount);
  return {
    fontSize: cqClamp(0.6875, m.cubeTextCqh, m.cubeTextCqw, 1),
  };
}

function FlowStepDotConnector({
  gridColumn,
  size = 'default',
  fillHeight = false,
}: {
  gridColumn: number;
  size?: FlowStepSize;
  fillHeight?: boolean;
}) {
  return (
    <div
      className={cn(
        'relative w-full min-w-0',
        fillHeight
          ? 'self-center'
          : cn(
              'self-start',
              size === 'micro'
                ? STEP_ICON_RING_CENTER_MT_COMPACT
                : STEP_ICON_RING_CENTER_MT,
            ),
      )}
      style={{ gridColumn }}
      aria-hidden
    >
      <div className="absolute inset-x-0 top-1/2 h-0 -translate-y-1/2 border-t border-dashed border-zinc-400" />
      <span className="absolute left-1/2 top-1/2 size-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-zinc-900" />
    </div>
  );
}

function FlowStepVerticalConnector() {
  return <div className="my-1 w-px min-h-4 flex-1 bg-zinc-500" aria-hidden />;
}

function FlowStepIconRing({
  stepId,
  size = 'default',
  fillHeight = false,
  stepCount = 3,
}: {
  stepId: RouteFlowStepId;
  size?: FlowStepSize;
  fillHeight?: boolean;
  stepCount?: number;
}) {
  const StepIcon = routeFlowStepLucideIcon(stepId);
  const micro = size === 'micro';
  const landscape = micro && fillHeight;

  return (
    <div
      className={cn(
        'relative flex shrink-0 items-center justify-center rounded-full bg-white',
        !landscape && size === 'compact' && 'size-12',
        !landscape && micro && !fillHeight && 'size-9',
        !landscape && size === 'default' && 'size-14 sm:size-16',
      )}
      style={landscape ? landscapeRingStyle(stepCount) : undefined}
    >
      <span
        className="absolute inset-0 rounded-full ring-1 ring-zinc-300"
        aria-hidden
      />
      <span
        className={cn(
          'absolute rounded-full ring-1 ring-zinc-200',
          micro ? 'inset-0.5' : 'inset-1',
        )}
        aria-hidden
      />
      <StepIcon
        className={cn(
          'relative z-10 text-zinc-800',
          !landscape && size === 'compact' && 'size-6',
          !landscape && micro && !fillHeight && 'size-4',
          !landscape && size === 'default' && 'size-7 sm:size-8',
        )}
        style={landscape ? landscapeIconStyle(stepCount) : undefined}
        strokeWidth={1.5}
        aria-hidden
      />
    </div>
  );
}

function FlowStepColumn({
  step,
  gridColumn,
  cube,
  size = 'default',
  fillHeight = false,
  stepCount = 3,
}: {
  step: DeliverFlowStepConfig;
  gridColumn?: number;
  detailLayout?: 'row' | 'stacked';
  cube?: string;
  size?: FlowStepSize;
  fillHeight?: boolean;
  stepCount?: number;
}) {
  const micro = size === 'micro';
  const landscape = micro && fillHeight;

  return (
    <div
      className="flex min-h-0 min-w-0 flex-col justify-center"
      style={gridColumn != null ? { gridColumn } : undefined}
    >
      <div
        className={cn(
          'flex flex-col items-center',
          micro && !fillHeight && 'gap-0.5',
          size === 'compact' && !fillHeight && 'gap-1.5',
          !micro && !landscape && size !== 'compact' && 'gap-2',
        )}
        style={landscape ? landscapeGapStyle(stepCount) : undefined}
      >
        <span
          className={cn(
            'bg-zinc-900 font-bold text-white',
            !landscape && 'flex shrink-0 items-center justify-center rounded-full',
            !landscape && micro && !fillHeight && 'flex size-4 text-[10px]',
            !landscape && size === 'compact' && !fillHeight && 'flex size-6 text-xs',
            !landscape && size === 'default' && 'flex size-6 text-xs',
          )}
          style={landscape ? landscapeBadgeStyle(stepCount) : undefined}
        >
          {step.stepNumber}
        </span>

        <FlowStepIconRing
          stepId={step.stepId}
          size={size}
          fillHeight={fillHeight}
          stepCount={stepCount}
        />

        <p
          className={cn(
            'm-0 w-full px-0.5 text-center font-semibold leading-tight wrap-break-word text-zinc-900',
            landscape && 'line-clamp-4',
            micro && !fillHeight && 'line-clamp-4 text-xs leading-snug',
            size === 'compact' && !fillHeight && 'text-xs leading-snug phone-landscape:text-sm',
            size === 'default' && 'px-1 text-xs leading-snug sm:text-sm',
          )}
          style={landscape ? landscapeLabelStyle(stepCount) : undefined}
        >
          {step.label}
        </p>
        {step.stepId === 'receiving' && cube ? (
          <div className="flex items-center gap-0.5">
            <Box
              className={cn(
                'text-brand',
                !landscape && micro && !fillHeight && 'size-3',
                !landscape && !micro && 'size-4',
              )}
              style={landscape ? landscapeCubeIconStyle(stepCount) : undefined}
              aria-hidden
            />
            <span
              className={cn(
                'font-semibold tracking-widest',
                !landscape && micro && !fillHeight && 'text-xs',
                !landscape && !micro && 'text-xl',
              )}
              style={landscape ? landscapeCubeTextStyle(stepCount) : undefined}
            >
              {cube}
            </span>
          </div>
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
  size = 'default',
  fillHeight = false,
}: {
  steps: DeliverFlowStepConfig[];
  cube?: string;
  size?: FlowStepSize;
  fillHeight?: boolean;
}) {
  const micro = size === 'micro';
  const gridColumns = buildFlowGridColumns(steps.length, micro, fillHeight);

  return (
    <div
      className={cn(
        'min-h-0 w-full min-w-0',
        fillHeight ? 'h-full px-0' : micro ? 'px-0' : 'px-1 sm:px-2',
      )}
    >
      <div
        className={cn(
          'h-full w-full min-w-0 list-none',
          fillHeight ? 'items-center' : 'grid',
          !fillHeight && (micro ? 'gap-y-1' : 'gap-y-3'),
        )}
        style={
          fillHeight
            ? {
                display: 'grid',
                gridTemplateColumns: gridColumns,
                alignItems: 'center',
              }
            : { gridTemplateColumns: gridColumns }
        }
      >
        {steps.map((step, index) => {
          const circleColumn = index * 2 + 1;

          return (
            <Fragment key={step.stepNumber}>
              {index > 0 ? (
                <FlowStepDotConnector
                  gridColumn={index * 2}
                  size={size}
                  fillHeight={fillHeight}
                />
              ) : null}
              <FlowStepColumn
                step={step}
                gridColumn={circleColumn}
                detailLayout="stacked"
                cube={cube}
                size={size}
                fillHeight={fillHeight}
                stepCount={steps.length}
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
  landscapeFillHeight = true,
}: {
  steps: DeliverFlowStepConfig[];
  cube?: string;
  /** Em paisagem no mobile: `true` preenche a área disponível (tela com um card); `false` mantém altura compacta (listas). */
  landscapeFillHeight?: boolean;
}) {
  return (
    <>
      <div className="phone-landscape:hidden md:hidden">
        <DeliverThreeStepFlowVertical steps={steps} cube={cube} />
      </div>
      <div
        className={cn(
          'hidden w-full phone-landscape:block',
          landscapeFillHeight &&
            'deliver-flow-landscape-container min-h-0 phone-landscape:flex',
        )}
      >
        <DeliverThreeStepFlowHorizontal
          steps={steps}
          cube={cube}
          size={landscapeFillHeight ? 'micro' : 'compact'}
          fillHeight={landscapeFillHeight}
        />
      </div>
      <div className="hidden phone-landscape:hidden md:block">
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
    <div className="border-t border-zinc-200 px-3 py-3 phone-landscape:shrink-0 phone-landscape:px-2 phone-landscape:py-1 md:px-5 md:py-2 lg:px-6">
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
        'min-w-0 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-md deliver-flow-card-landscape phone-landscape:flex phone-landscape:min-h-0 phone-landscape:flex-1 phone-landscape:flex-col phone-landscape:rounded-lg phone-landscape:shadow-sm md:rounded-2xl',
        className,
      )}
    >
      {deferBanner}
      {children}
    </div>
  );
}

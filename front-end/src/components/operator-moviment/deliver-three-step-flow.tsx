import { Fragment, type CSSProperties, type ReactNode } from 'react';
import { routeFlowStepLucideIcon } from '@/components/operator-moviment/route-flow-icons';
import type { RouteFlowStepId } from '@/components/operator-moviment/route-flow-icons';
import { type RouteFlowDetailItem } from '@/components/operator-moviment/route-flow-step-details';
import { cn } from '@/lib/utils';
import { formatMachineMetaLine } from '@/utils/machine-display';
import { AlertTriangle, Box, Road, Truck } from 'lucide-react';
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
  typography = 'default',
}: {
  children: ReactNode;
  /** Conteúdo alinhado ao início (ex.: nome da máquina). Com `start`, `children` fica centralizado na linha. */
  start?: ReactNode;
  /** Conteúdo alinhado ao fim (ex.: horário da solicitação). */
  end?: ReactNode;
  typography?: ActivityTypography;
}) {
  const large = typography === 'large';

  if (start != null) {
    return (
      <div
        className={cn(
          'mb-4 grid w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-2 font-normal uppercase leading-tight tracking-wide phone-landscape:mb-1.5 phone-landscape:shrink-0 phone-landscape:gap-x-1 sm:leading-normal sm:tracking-wider',
          large
            ? 'text-xs phone-landscape:text-base lg:text-base xl:text-lg'
            : 'text-[11px] phone-landscape:text-sm sm:text-xs lg:text-sm xl:text-base',
        )}
      >
        <div className="min-w-0 justify-self-start">{start}</div>
        <div className="shrink-0 justify-self-center px-0.5">{children}</div>
        <div className="min-w-0 justify-self-end text-right">{end ?? null}</div>
      </div>
    );
  }

  return (
    <p className="mb-4 text-center text-xs font-semibold uppercase tracking-wider text-zinc-700 phone-landscape:text-sm">
      {children}
    </p>
  );
}

export function DeliverFlowMachineCubeHighlight({
  machineName,
  assetNumber,
  pillar,
  machineStreet,
  cube,
  typography = 'default',
}: {
  machineName?: string;
  assetNumber?: string | null;
  pillar?: string | null;
  machineStreet?: {
    name: string;
    machineStreetColor: string;
  } | null;
  cube?: string;
  typography?: ActivityTypography;
}) {
  const large = typography === 'large';
  const streetName = machineStreet?.name?.trim();
  const streetColor = machineStreet?.machineStreetColor?.trim();

  if (
    !machineName &&
    !cube &&
    !streetName &&
    !formatMachineMetaLine({ assetNumber, pillar })
  ) {
    return null;
  }

  const machineMeta = formatMachineMetaLine({ assetNumber, pillar });

  return (
    <div
      className={cn(
        'inline-flex min-w-0 max-w-full flex-col items-start gap-0.5',
        large
          ? 'text-sm phone-landscape:text-base md:text-xl lg:text-2xl xl:text-3xl'
          : 'text-sm phone-landscape:text-base md:text-xl lg:text-2xl xl:text-3xl',
      )}
    >
      {streetName ? (
        <span
          className={cn(
            'inline-flex max-w-full items-center gap-1 font-semibold normal-case tracking-normal',
            large
              ? 'text-[0.7rem] phone-landscape:text-xs md:text-sm'
              : 'text-[0.7rem] phone-landscape:text-xs md:text-sm',
          )}
          style={streetColor ? { color: streetColor } : undefined}
        >
          <Road
            strokeWidth={2.5}
            className={cn(
              'shrink-0',
              large
                ? 'size-3.5 phone-landscape:size-4 md:size-4'
                : 'size-3.5 phone-landscape:size-4 md:size-4',
            )}
            aria-hidden
          />
          <span className="truncate">{streetName}</span>
        </span>
      ) : null}
      <div className="inline-flex min-w-0 max-w-full flex-wrap items-center gap-x-1.5 gap-y-0.5">
        {machineName ? (
          <span className="truncate font-bold uppercase tracking-wide text-brand">
            {machineName}
          </span>
        ) : null}
        {cube ? (
          <>
            {machineName ? (
              <span className="shrink-0 font-normal text-zinc-400" aria-hidden>
                -
              </span>
            ) : null}
            <div className="inline-flex items-center gap-1 rounded-lg border border-brand/35 bg-brand/15 px-1.5 py-0.5 font-bold text-brand shadow-sm phone-landscape:px-1 md:gap-1.5 md:px-2 md:py-0.5">
              <Box
                strokeWidth={2.75}
                className={cn(
                  'shrink-0 text-brand',
                  large
                    ? 'size-3.5 phone-landscape:size-4 md:size-5 lg:size-6 xl:size-7'
                    : 'size-3.5 phone-landscape:size-4 md:size-5 lg:size-6 xl:size-7',
                )}
                aria-hidden
              />
              <span className="tracking-widest">{cube}</span>
            </div>
          </>
        ) : null}
      </div>
      {machineMeta ? (
        <span
          className={cn(
            'max-w-full truncate font-medium normal-case tracking-normal text-zinc-500',
            large
              ? 'text-[0.65rem] phone-landscape:text-xs md:text-sm'
              : 'text-[0.65rem] phone-landscape:text-xs md:text-sm',
          )}
        >
          {machineMeta}
        </span>
      ) : null}
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
      <div className="grid w-full grid-cols-1 items-center gap-2 phone-landscape:grid-cols-[1fr_auto_1fr] phone-landscape:gap-1 md:grid-cols-[1fr_auto_1fr] md:gap-2">
        <div className="hidden phone-landscape:block md:block" aria-hidden />
        <div className="flex min-w-0 flex-col items-center gap-2 justify-self-center">
          {children}
        </div>
        <div
          className={cn(
            'flex items-center justify-end justify-self-end',
            isCritical ? 'min-h-0' : 'hidden phone-landscape:block md:block',
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
    'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 focus-visible:ring-emerald-600/30',
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
  /** `accept` = aceitar sugestão (verde); `complete` = concluir tarefa (verde). */
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
        'lg:h-14 lg:min-w-80 lg:gap-3 lg:px-12 lg:text-lg xl:h-16 xl:text-xl',
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

export type ActivityTypography = 'default' | 'large';

const LANDSCAPE_LARGE_LABEL_SCALE = 1.35;
/** Anéis de ícone menores quando só o texto está em `large` (tela Conclua a tarefa). */
const LANDSCAPE_LARGE_RING_SCALE = 0.82;

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

function landscapeFlowMetricsBase(stepCount: number): LandscapeFlowMetrics {
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
      labelMaxRem: 1.125,
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
      labelCqh: 11.5,
      labelCqw: 5.8,
      labelMaxRem: 1.0625,
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
    labelCqh: 10.5,
    labelCqw: 5.4,
    labelMaxRem: 1,
    gapCqh: 4.5,
    gapCqw: 2.2,
    cubeIconCqh: 7.5,
    cubeIconCqw: 3.8,
    cubeTextCqh: 7,
    cubeTextCqw: 3.5,
  };
}

function landscapeFlowMetrics(
  stepCount: number,
  typography: ActivityTypography = 'default',
): LandscapeFlowMetrics {
  const base = landscapeFlowMetricsBase(stepCount);
  if (typography === 'default') {
    return base;
  }

  const labelScale = LANDSCAPE_LARGE_LABEL_SCALE;
  const ringScale = LANDSCAPE_LARGE_RING_SCALE;
  return {
    ringCqh: base.ringCqh * ringScale,
    ringCqw: base.ringCqw * ringScale,
    ringMaxRem: base.ringMaxRem * ringScale,
    iconRatio: base.iconRatio,
    badgeCqh: base.badgeCqh,
    badgeCqw: base.badgeCqw,
    badgeMaxRem: base.badgeMaxRem,
    labelCqh: base.labelCqh * labelScale,
    labelCqw: base.labelCqw * labelScale,
    labelMaxRem: base.labelMaxRem * labelScale,
    gapCqh: base.gapCqh,
    gapCqw: base.gapCqw,
    cubeIconCqh: base.cubeIconCqh * labelScale,
    cubeIconCqw: base.cubeIconCqw * labelScale,
    cubeTextCqh: base.cubeTextCqh * labelScale,
    cubeTextCqw: base.cubeTextCqw * labelScale,
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

function landscapeRingStyle(
  stepCount: number,
  typography: ActivityTypography = 'default',
): CSSProperties {
  const m = landscapeFlowMetrics(stepCount, typography);
  const minRem = typography === 'large' ? 2.125 : 2.75;
  const size = cqClamp(minRem, m.ringCqh, m.ringCqw, m.ringMaxRem);
  return { width: size, height: size };
}

function landscapeIconStyle(
  stepCount: number,
  typography: ActivityTypography = 'default',
): CSSProperties {
  const m = landscapeFlowMetrics(stepCount, typography);
  const minRem = typography === 'large' ? 1.125 : 1.5;
  const size = cqClamp(
    minRem,
    +(m.ringCqh * m.iconRatio).toFixed(1),
    +(m.ringCqw * m.iconRatio).toFixed(1),
    +(m.ringMaxRem * m.iconRatio).toFixed(2),
  );
  return { width: size, height: size };
}

function landscapeBadgeStyle(
  stepCount: number,
  typography: ActivityTypography = 'default',
): CSSProperties {
  const m = landscapeFlowMetrics(stepCount, typography);
  const badgeFontMax = typography === 'large' ? 0.9375 : 0.6875;
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
      badgeFontMax,
    ),
  };
}

function landscapeLabelStyle(
  stepCount: number,
  typography: ActivityTypography = 'default',
): CSSProperties {
  const m = landscapeFlowMetrics(stepCount, typography);
  const minRem = typography === 'large' ? 0.8125 : 0.6875;
  return {
    fontSize: cqClamp(minRem, m.labelCqh, m.labelCqw, m.labelMaxRem),
  };
}

function landscapeGapStyle(
  stepCount: number,
  typography: ActivityTypography = 'default',
): CSSProperties {
  const m = landscapeFlowMetrics(stepCount, typography);
  return { gap: cqClamp(0.2, m.gapCqh, m.gapCqw, 0.625) };
}

function landscapeCubeIconStyle(
  stepCount: number,
  typography: ActivityTypography = 'default',
): CSSProperties {
  const m = landscapeFlowMetrics(stepCount, typography);
  const size = cqClamp(0.75, m.cubeIconCqh, m.cubeIconCqw, 1.125);
  return { width: size, height: size };
}

function landscapeCubeTextStyle(
  stepCount: number,
  typography: ActivityTypography = 'default',
): CSSProperties {
  const m = landscapeFlowMetrics(stepCount, typography);
  const maxRem = typography === 'large' ? 1.25 : 1;
  return {
    fontSize: cqClamp(0.6875, m.cubeTextCqh, m.cubeTextCqw, maxRem),
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
        'relative w-full min-w-0 self-start',
        size === 'micro' || fillHeight
          ? STEP_ICON_RING_CENTER_MT_COMPACT
          : STEP_ICON_RING_CENTER_MT,
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
  activityTypography = 'default',
}: {
  stepId: RouteFlowStepId;
  size?: FlowStepSize;
  fillHeight?: boolean;
  stepCount?: number;
  activityTypography?: ActivityTypography;
}) {
  const StepIcon = routeFlowStepLucideIcon(stepId);
  const micro = size === 'micro';
  const landscape = micro && fillHeight;

  return (
    <div
      className={cn(
        'relative flex shrink-0 items-center justify-center rounded-full bg-white',
        !landscape && size === 'compact' && 'size-12 phone-landscape:size-14',
        !landscape && micro && !fillHeight && 'size-9 phone-landscape:size-11',
        !landscape &&
          size === 'default' &&
          'size-14 sm:size-16 lg:size-20 xl:size-24',
      )}
      style={
        landscape
          ? landscapeRingStyle(stepCount, activityTypography)
          : undefined
      }
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
          !landscape && size === 'compact' && 'size-6 phone-landscape:size-7',
          !landscape && micro && !fillHeight && 'size-4 phone-landscape:size-5',
          !landscape &&
            size === 'default' &&
            'size-7 sm:size-8 lg:size-10 xl:size-12',
        )}
        style={
          landscape
            ? landscapeIconStyle(stepCount, activityTypography)
            : undefined
        }
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
  activityTypography = 'default',
}: {
  step: DeliverFlowStepConfig;
  gridColumn?: number;
  detailLayout?: 'row' | 'stacked';
  cube?: string;
  size?: FlowStepSize;
  fillHeight?: boolean;
  stepCount?: number;
  activityTypography?: ActivityTypography;
}) {
  const micro = size === 'micro';
  const landscape = micro && fillHeight;

  return (
    <div
      className="flex min-h-0 min-w-0 flex-col justify-start"
      style={gridColumn != null ? { gridColumn } : undefined}
    >
      <div
        className={cn(
          'flex flex-col items-center',
          micro && !fillHeight && 'gap-0.5',
          size === 'compact' && !fillHeight && 'gap-1.5',
          !micro && !landscape && size !== 'compact' && 'gap-2',
        )}
        style={
          landscape
            ? landscapeGapStyle(stepCount, activityTypography)
            : undefined
        }
      >
        <span
          className={cn(
            'bg-zinc-900 font-bold text-white',
            !landscape &&
              'flex shrink-0 items-center justify-center rounded-full',
            !landscape &&
              micro &&
              !fillHeight &&
              'flex size-4 text-[10px] phone-landscape:size-5 phone-landscape:text-xs',
            !landscape &&
              size === 'compact' &&
              !fillHeight &&
              'flex size-6 text-xs phone-landscape:size-7 phone-landscape:text-sm',
            !landscape &&
              size === 'default' &&
              'flex size-6 text-xs lg:size-8 lg:text-base xl:size-9 xl:text-lg',
          )}
          style={
            landscape
              ? landscapeBadgeStyle(stepCount, activityTypography)
              : undefined
          }
        >
          {step.stepNumber}
        </span>

        <FlowStepIconRing
          stepId={step.stepId}
          size={size}
          fillHeight={fillHeight}
          stepCount={stepCount}
          activityTypography={activityTypography}
        />

        <p
          className={cn(
            'm-0 w-full px-0.5 text-center font-semibold leading-tight wrap-break-word text-zinc-800',
            landscape && 'line-clamp-4',
            micro &&
              !fillHeight &&
              'line-clamp-4 text-xs leading-snug phone-landscape:text-base',
            size === 'compact' &&
              !fillHeight &&
              'text-xs leading-snug phone-landscape:text-base phone-landscape:leading-snug',
            size === 'default' &&
              'px-1 text-xs leading-snug sm:text-sm lg:text-lg xl:text-xl',
          )}
          style={
            landscape
              ? landscapeLabelStyle(stepCount, activityTypography)
              : undefined
          }
        >
          {step.label}
        </p>
        {step.stepId === 'receiving' && cube ? (
          <div className="flex items-center gap-0.5">
            <Box
              className={cn(
                'text-brand',
                !landscape && micro && !fillHeight && 'size-3',
                !landscape && !micro && 'size-4 lg:size-5 xl:size-6',
              )}
              style={
                landscape
                  ? landscapeCubeIconStyle(stepCount, activityTypography)
                  : undefined
              }
              aria-hidden
            />
            <span
              className={cn(
                'font-bold tracking-widest text-brand',
                !landscape &&
                  micro &&
                  !fillHeight &&
                  'text-xs phone-landscape:text-sm',
                !landscape && !micro && 'text-xl lg:text-2xl xl:text-3xl',
              )}
              style={
                landscape
                  ? landscapeCubeTextStyle(stepCount, activityTypography)
                  : undefined
              }
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
  activityTypography = 'default',
}: {
  step: DeliverFlowStepConfig;
  isLast: boolean;
  cube?: string;
  activityTypography?: ActivityTypography;
}) {
  const large = activityTypography === 'large';

  return (
    <div className="flex gap-3">
      <div className="flex w-8 shrink-0 flex-col items-center">
        <span
          className={cn(
            'flex shrink-0 items-center justify-center rounded-full bg-zinc-900 font-bold text-white',
            large ? 'size-9 text-base' : 'size-8 text-sm',
          )}
          aria-label={`Etapa ${step.stepNumber}`}
        >
          {step.stepNumber}
        </span>
        {!isLast ? <FlowStepVerticalConnector /> : null}
      </div>

      <div className={cn('min-w-0 flex-1', !isLast && 'pb-4 md:pb-5')}>
        <div className="flex min-w-0 flex-col items-start gap-2">
          <FlowStepIconRing
            stepId={step.stepId}
            size={large ? 'micro' : 'compact'}
            fillHeight={false}
          />
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                'font-semibold leading-snug text-zinc-800',
                large ? 'text-base' : 'text-sm',
              )}
            >
              {step.label}
            </p>
            {step.stepId === 'receiving' && cube ? (
              <div className="mt-1 flex items-center gap-1">
                <Box
                  className={cn('text-brand', large ? 'size-5' : 'size-4')}
                  aria-hidden
                />
                <span
                  className={cn(
                    'font-bold tracking-widest text-brand',
                    large ? 'text-2xl' : 'text-xl',
                  )}
                >
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
  activityTypography = 'default',
}: {
  steps: DeliverFlowStepConfig[];
  cube?: string;
  activityTypography?: ActivityTypography;
}) {
  return (
    <ol className="m-0 list-none space-y-0 p-0">
      {steps.map((step, index) => (
        <li key={step.stepNumber}>
          <FlowStepVerticalRow
            step={step}
            isLast={index === steps.length - 1}
            cube={cube}
            activityTypography={activityTypography}
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
  activityTypography = 'default',
}: {
  steps: DeliverFlowStepConfig[];
  cube?: string;
  size?: FlowStepSize;
  fillHeight?: boolean;
  activityTypography?: ActivityTypography;
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
          'grid h-full w-full min-w-0 list-none items-start',
          !fillHeight && (micro ? 'gap-y-1' : 'gap-y-3'),
        )}
        style={{
          gridTemplateColumns: gridColumns,
        }}
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
                activityTypography={activityTypography}
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
  activityTypography = 'default',
}: {
  steps: DeliverFlowStepConfig[];
  cube?: string;
  /** Em paisagem no mobile: `true` preenche a área disponível (tela com um card); `false` mantém altura compacta (listas). */
  landscapeFillHeight?: boolean;
  /** Tipografia maior nas etapas (ex.: tela "Conclua a tarefa"). */
  activityTypography?: ActivityTypography;
}) {
  return (
    <>
      <div className="phone-landscape:hidden md:hidden">
        <DeliverThreeStepFlowVertical
          steps={steps}
          cube={cube}
          activityTypography={activityTypography}
        />
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
          activityTypography={activityTypography}
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

import { cn } from '@/lib/utils';
import { ForkliftCircleLoader } from '../forklift-loader/forklift-circle-loader';
import { CheckIcon, InfoIcon } from 'lucide-react';

export type FlowStepStatus = 'pending' | 'active' | 'done';

export interface FlowStepDefinition {
  key: string;
  title: string;
}

export interface HorizontalActivityStepperProps {
  steps: FlowStepDefinition[];
  statuses: FlowStepStatus[];
  headline?: string;
  /** Se omitido, calcula a partir de `statuses` (etapa ativa = fração concluída). */
  progressPct?: number;
  className?: string;
  /** Versão compacta (monitor TV). */
  compact?: boolean;
  /** Textos para fundo escuro. */
  dark?: boolean;
}

/** Alinha a barra com o círculo ativo: etapa 1/3 → 33%, 2/3 → 67%, concluído → 100%. */
export function progressPctFromFlowStepStatuses(
  statuses: FlowStepStatus[],
): number {
  const n = statuses.length;
  if (n === 0) return 0;
  if (statuses.every((s) => s === 'done')) return 100;
  const activeIdx = statuses.findIndex((s) => s === 'active');
  if (activeIdx >= 0) {
    return Math.round(((activeIdx + 1) / n) * 100);
  }
  const doneCount = statuses.filter((s) => s === 'done').length;
  return Math.round((doneCount / n) * 100);
}

/** Etapas em que o indicador ativo usa o vídeo da empilhadeira (por título). */
export const FORKLIFT_LOADER_STEP_TITLES = [
  'Retirada em curso',
  'A caminho...',
  'A caminho',
  'Transporte a caminho',
  'Movimentação de empilhadeira em andamento',
  'Movimento em curso',
  'Retirada',
] as const;

/** Chaves dos passos no fluxo da máquina (`operator-machine-flow`). */
export const FORKLIFT_LOADER_STEP_KEYS = [
  'on-the-way',
  'transporting',
  'removing',
  'pickup',
] as const;

export function stepTitleShowsForkliftLoader(title: string): boolean {
  return (FORKLIFT_LOADER_STEP_TITLES as readonly string[]).includes(title);
}

export function stepShowsForkliftLoader(step: FlowStepDefinition): boolean {
  return (
    stepTitleShowsForkliftLoader(step.title) ||
    (FORKLIFT_LOADER_STEP_KEYS as readonly string[]).includes(step.key)
  );
}

type StepConnectorVariant = 'done' | 'pending' | 'flowing';

/** Colunas: círculo | trilho flex | círculo | trilho | … */
function buildTrackGridColumns(
  stepCount: number,
  options?: { wideTracks?: boolean; compact?: boolean },
): string {
  const trackMin = options?.compact
    ? '0.35rem'
    : options?.wideTracks
      ? '1.5rem'
      : '0.5rem';
  return Array.from({ length: stepCount }, (_, index) =>
    index === 0 ? 'auto' : `minmax(${trackMin}, 1fr) auto`,
  ).join(' ');
}

function connectorBetweenSteps(
  stepIndex: number,
  statuses: FlowStepStatus[],
): StepConnectorVariant {
  const prev = statuses[stepIndex - 1] ?? 'pending';
  const curr = statuses[stepIndex] ?? 'pending';
  /** Pulso só entre a última etapa concluída e a etapa em curso. */
  if (prev === 'done' && curr === 'active') {
    return 'flowing';
  }
  if (prev === 'done') {
    return 'done';
  }
  return 'pending';
}

function StepConnectorLine({
  variant,
  dark = false,
}: {
  variant: StepConnectorVariant;
  dark?: boolean;
}) {
  if (variant === 'done') {
    return (
      <span
        className="block h-1 w-full rounded-full bg-emerald-400"
        aria-hidden
      />
    );
  }

  if (variant === 'pending') {
    return (
      <span
        className={cn(
          'block h-1 w-full rounded-full',
          dark ? 'bg-zinc-700' : 'bg-zinc-200',
        )}
        aria-hidden
      />
    );
  }

  return (
    <span
      className={cn(
        'relative block h-1 w-full overflow-hidden rounded-full',
        dark ? 'bg-zinc-700' : 'bg-zinc-200',
      )}
      aria-hidden
    >
      <span
        className="absolute inset-y-0 left-0 w-1/3 rounded-full"
        style={{
          background:
            'linear-gradient(90deg, rgba(0,95,184,0.25), #005fb8, rgba(0,95,184,0.85))',
          boxShadow: '0 0 8px rgba(0,95,184,0.45)',
          animation: 'forklift-step-connector-flow 2.8s linear infinite',
        }}
      />
    </span>
  );
}

function StepCircle({
  index,
  status,
  step,
  compact = false,
  dark = false,
}: {
  index: number;
  status: FlowStepStatus;
  step: FlowStepDefinition;
  compact?: boolean;
  dark?: boolean;
}) {
  const done = status === 'done';
  const active = status === 'active';

  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full border-2 font-bold',
        compact ? 'size-8 text-[9px]' : 'size-15 text-[10px]',
        done
          ? 'border-emerald-500 bg-emerald-500 text-white'
          : active
            ? 'border-brand bg-brand/10 text-brand'
            : dark
              ? 'border-zinc-600 text-zinc-500'
              : 'border-zinc-200 text-zinc-400',
      )}
      aria-hidden
    >
      {done ? (
        <CheckIcon className={compact ? 'size-4' : 'size-8'} />
      ) : active && stepShowsForkliftLoader(step) ? (
        <ForkliftCircleLoader />
      ) : (
        index + 1
      )}
    </span>
  );
}

export function HorizontalActivityStepper({
  steps,
  statuses,
  headline,
  className,
  compact = false,
  dark = false,
}: HorizontalActivityStepperProps) {
  if (steps.length !== statuses.length) {
    return null;
  }

  const longFlow = steps.length >= 5;
  const gridColumns = buildTrackGridColumns(steps.length, {
    wideTracks: longFlow && !compact,
    compact,
  });
  /** Só força largura mínima fora do modo compacto (TV) — evita scroll horizontal. */
  const gridMinWidth =
    longFlow && !compact ? `${steps.length * 5.25}rem` : undefined;

  return (
    <div className={cn('w-full min-w-0 overflow-hidden', className)}>
      {/* Keyframes locais: não dependem de prefers-reduced-motion do globals.css */}
      <style>{`
        @keyframes forklift-step-connector-flow {
          0% { transform: translateX(-100%); opacity: 0.55; }
          12% { opacity: 1; }
          88% { opacity: 1; }
          100% { transform: translateX(350%); opacity: 0.55; }
        }
      `}</style>
      {headline ? (
        <p
          className={cn(
            'text-left leading-relaxed',
            compact ? 'mb-1.5 text-[11px]' : 'mb-3 text-sm',
            dark ? 'text-zinc-400' : 'text-zinc-600',
          )}
        >
          <InfoIcon
            className={cn(
              'inline shrink-0 text-blue-500',
              compact ? 'size-3' : 'size-4',
            )}
            aria-hidden
          />{' '}
          {headline}
        </p>
      ) : null}
      <div
        className={cn(
          'w-full min-w-0',
          compact ? 'mt-2' : 'mt-4',
          longFlow && !compact && 'overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]',
        )}
      >
        <ol
          className={cn(
            'grid w-full min-w-0 list-none p-0',
            compact ? 'gap-y-1' : 'gap-y-2',
          )}
          style={{
            gridTemplateColumns: gridColumns,
            ...(gridMinWidth ? { minWidth: gridMinWidth } : {}),
          }}
        >
          {steps.map((step, index) => {
            const status = statuses[index] ?? 'pending';
            const done = status === 'done';
            const active = status === 'active';
            const circleColumn = index * 2 + 1;

            return (
              <li
                key={step.key}
                className="contents"
                aria-current={active ? 'step' : undefined}
              >
                {index > 0 ? (
                  <div
                    className="flex w-full min-w-0 items-center self-center px-0.5"
                    style={{ gridColumn: index * 2, gridRow: 1 }}
                    aria-hidden
                  >
                    <StepConnectorLine
                      variant={connectorBetweenSteps(index, statuses)}
                      dark={dark}
                    />
                  </div>
                ) : null}
                <div
                  className="flex justify-center justify-self-center"
                  style={{ gridColumn: circleColumn, gridRow: 1 }}
                >
                  <StepCircle
                    index={index}
                    status={status}
                    step={step}
                    compact={compact}
                    dark={dark}
                  />
                </div>
                <p
                  className={cn(
                    'm-0 min-w-0 max-w-full justify-self-center px-0.5 text-center font-medium break-words',
                    compact
                      ? 'text-[11px] leading-tight sm:text-xs'
                      : 'text-[10px] leading-snug sm:text-[11px]',
                    done
                      ? dark
                        ? 'text-emerald-400'
                        : 'text-emerald-800'
                      : active
                        ? 'text-brand'
                        : dark
                          ? 'text-zinc-500'
                          : 'text-zinc-400',
                  )}
                  style={{ gridColumn: circleColumn, gridRow: 2 }}
                >
                  {step.title}
                </p>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

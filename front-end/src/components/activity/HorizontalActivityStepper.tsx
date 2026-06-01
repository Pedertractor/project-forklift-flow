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
  'Transporte a caminho',
  'Movimentação de empilhadeira em andamento',
  'Movimento em curso',
] as const;

/** Chaves dos passos no fluxo da máquina (`operator-machine-flow`). */
export const FORKLIFT_LOADER_STEP_KEYS = [
  'deliver',
  'removing',
  'pickup',
  'transporting',
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
function buildTrackGridColumns(stepCount: number): string {
  return Array.from({ length: stepCount }, (_, index) =>
    index === 0 ? 'auto' : 'minmax(0.5rem, 1fr) auto',
  ).join(' ');
}

function connectorBetweenSteps(
  stepIndex: number,
  statuses: FlowStepStatus[],
): StepConnectorVariant {
  const prev = statuses[stepIndex - 1] ?? 'pending';
  if (prev === 'done') {
    return 'done';
  }
  if (prev === 'active') {
    return 'flowing';
  }
  return 'pending';
}

function StepConnectorLine({ variant }: { variant: StepConnectorVariant }) {
  if (variant === 'done') {
    return (
      <span
        className="block h-0.5 w-full rounded-full bg-emerald-400"
        aria-hidden
      />
    );
  }

  if (variant === 'pending') {
    return (
      <span
        className="block h-0.5 w-full rounded-full bg-zinc-200"
        aria-hidden
      />
    );
  }

  return (
    <span
      className="relative block h-0.5 w-full overflow-hidden rounded-full bg-zinc-200"
      aria-hidden
    >
      <span className="absolute inset-y-0 left-0 w-[28%] min-w-5 max-w-14 rounded-full bg-linear-to-r from-brand/40 via-brand to-brand/70 shadow-[0_0_6px_rgba(0,95,184,0.35)] animate-step-connector-flow" />
    </span>
  );
}

function StepCircle({
  index,
  status,
  step,
}: {
  index: number;
  status: FlowStepStatus;
  step: FlowStepDefinition;
}) {
  const done = status === 'done';
  const active = status === 'active';

  return (
    <span
      className={cn(
        'flex size-15 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-bold',
        done
          ? 'border-emerald-500 bg-emerald-500 text-white'
          : active
            ? 'border-brand bg-brand/10 text-brand'
            : 'border-zinc-200 bg-zinc-50 text-zinc-400',
      )}
      aria-hidden
    >
      {done ? (
        <CheckIcon className="size-8" />
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
}: HorizontalActivityStepperProps) {
  if (steps.length !== statuses.length) {
    return null;
  }

  const gridColumns = buildTrackGridColumns(steps.length);

  return (
    <div className={cn('w-full', className)}>
      {headline ? (
        <p className="mb-3 text-left text-sm leading-relaxed text-zinc-600">
          <InfoIcon
            className="inline size-4 shrink-0 text-blue-500"
            aria-hidden
          />{' '}
          {headline}
        </p>
      ) : null}
      <div className="mt-4 w-full min-w-0">
        <ol
          className="grid w-full min-w-0 list-none gap-y-2 p-0"
          style={{ gridTemplateColumns: gridColumns }}
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
                    className="flex items-center self-center"
                    style={{ gridColumn: index * 2, gridRow: 1 }}
                    aria-hidden
                  >
                    <StepConnectorLine
                      variant={connectorBetweenSteps(index, statuses)}
                    />
                  </div>
                ) : null}
                <div
                  className="flex justify-center justify-self-center"
                  style={{ gridColumn: circleColumn, gridRow: 1 }}
                >
                  <StepCircle index={index} status={status} step={step} />
                </div>
                <p
                  className={cn(
                    'm-0 min-w-0 max-w-full justify-self-center px-0.5 text-center text-[10px] leading-snug font-medium break-words sm:text-[11px]',
                    done
                      ? 'text-emerald-800'
                      : active
                        ? 'text-brand'
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

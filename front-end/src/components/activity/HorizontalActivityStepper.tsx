import { cn } from '@/lib/utils';

export type FlowStepStatus = 'pending' | 'active' | 'done';

export interface FlowStepDefinition {
  key: string;
  title: string;
}

export interface HorizontalActivityStepperProps {
  steps: FlowStepDefinition[];
  statuses: FlowStepStatus[];
  headline?: string;
  progressPct?: number;
  className?: string;
}

export function HorizontalActivityStepper({
  steps,
  statuses,
  headline,
  progressPct,
  className,
}: HorizontalActivityStepperProps) {
  if (steps.length !== statuses.length) {
    return null;
  }

  const pct =
    progressPct ??
    Math.round(
      (statuses.filter((s) => s === 'done').length / statuses.length) * 100,
    );

  return (
    <div className={cn('w-full', className)}>
      {headline ? (
        <p className="mb-3 text-left text-sm leading-relaxed text-zinc-600">
          {headline}
        </p>
      ) : null}
      <div
        className="h-1.5 overflow-hidden rounded-full bg-zinc-100"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-[#005fb8] transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-4 -mx-1 overflow-x-auto pb-1">
        <ol className="flex min-w-[32rem] list-none gap-0 p-0">
          {steps.map((step, index) => {
            const status = statuses[index] ?? 'pending';
            const done = status === 'done';
            const active = status === 'active';
            const isLast = index === steps.length - 1;
            return (
              <li
                key={step.key}
                className={cn('flex min-w-0 flex-1 flex-col items-center', !isLast && 'pr-0')}
              >
                <div className="flex w-full items-center">
                  {index > 0 ? (
                    <span
                      className={cn(
                        'h-0.5 min-w-2 flex-1',
                        statuses[index - 1] === 'done' ? 'bg-emerald-400' : 'bg-zinc-200',
                      )}
                      aria-hidden
                    />
                  ) : (
                    <span className="min-w-2 flex-1" aria-hidden />
                  )}
                  <span
                    className={cn(
                      'flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-bold',
                      done
                        ? 'border-emerald-500 bg-emerald-500 text-white'
                        : active
                          ? 'border-[#005fb8] bg-[#005fb8]/10 text-[#005fb8]'
                          : 'border-zinc-200 bg-zinc-50 text-zinc-400',
                    )}
                    aria-hidden
                  >
                    {done ? '✓' : active ? '●' : index + 1}
                  </span>
                  {!isLast ? (
                    <span
                      className={cn(
                        'h-0.5 min-w-2 flex-1',
                        done ? 'bg-emerald-400' : 'bg-zinc-200',
                      )}
                      aria-hidden
                    />
                  ) : (
                    <span className="min-w-2 flex-1" aria-hidden />
                  )}
                </div>
                <p
                  className={cn(
                    'mt-2 w-full px-1 text-center text-[11px] leading-snug font-medium',
                    done
                      ? 'text-emerald-800'
                      : active
                        ? 'text-[#005fb8]'
                        : 'text-zinc-400',
                  )}
                >
                  {step.title}
                </p>
              </li>
            );
          })}
        </ol>
      </div>
      <p className="mt-2 text-left text-[11px] text-zinc-500">
        Atualização automática enquanto o fluxo estiver em andamento.
      </p>
    </div>
  );
}


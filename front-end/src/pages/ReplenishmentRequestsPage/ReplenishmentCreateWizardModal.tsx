import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/brand-button';
import { SimpleModal } from '@/components/crud/SimpleModal';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MachineOperationSelectGrid } from '@/components/machines/MachineOperationSelectGrid';
import { cn } from '@/lib/utils';
import type { MachineListItem } from '@/types/machine.types';
import type { PriorityLevelValue } from '@/types/replenishment-request.types';
import type { ReplenishmentMovimentType } from '@/types/replenishment-moviment.types';
import {
  movimentTypePublicIconPath,
  replenishmentMovimentTypeLabel,
} from '@/utils/operator-moviment-display';
import { priorityLevelLabel } from '@/utils/replenishment-labels';
import { AlertTriangle, Box, ChevronLeft, ChevronRight } from 'lucide-react';

const TOTAL_STEPS = 4;

const PRISMA_CODE_PREFIX = 'A';

function prismaCodeNumberPart(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const withoutPrefix = trimmed.replace(/^A[-\s]?/i, '');
  return withoutPrefix.replace(/\D/g, '');
}

function prismaCodeFromNumberPart(num: string): string {
  const digits = num.replace(/\D/g, '');
  return digits ? `${PRISMA_CODE_PREFIX}${digits}` : '';
}

const STEP_LABELS = [
  'Máquina de destino',
  'Código do prisma',
  'Tipo de movimentação',
  'Prioridade',
] as const;

const selectCardBase =
  'flex w-full flex-col items-stretch gap-3 rounded-2xl border-2 bg-white p-4 text-left outline-none transition-all focus-visible:ring-[3px] focus-visible:ring-brand/25 disabled:cursor-not-allowed disabled:opacity-60';

const selectCardIdle = 'border-zinc-200 hover:border-zinc-300 hover:shadow-sm';
const selectCardSelected =
  'border-brand bg-gradient-to-br from-brand/[0.08] to-white shadow-sm ring-2 ring-brand/20';

const MOVEMENT_OPTIONS: {
  value: ReplenishmentMovimentType;
  description: string;
}[] = [
  {
    value: 'FORKLIFT',
    description: 'Somente empilhadeira atende este pedido.',
  },
  {
    value: 'ANY',
    description:
      'Empilhadeirista ou transpaleteirista pode aceitar na fila de transporte.',
  },
];

const PRIORITY_OPTIONS: {
  value: PriorityLevelValue;
  hint: string;
  accent: string;
  selectedRing: string;
}[] = [
  {
    value: 'NORMAL',
    hint: 'Fluxo padrão do setor',
    accent: 'text-emerald-700',
    selectedRing: 'border-emerald-400 ring-emerald-500/20',
  },
  {
    value: 'HIGH',
    hint: 'Antecipar na fila quando possível',
    accent: 'text-amber-700',
    selectedRing: 'border-amber-400 ring-amber-500/20',
  },
  {
    value: 'VERY_HIGH',
    hint: 'Máxima urgência operacional',
    accent: 'text-red-700',
    selectedRing: 'border-red-400 ring-red-500/20',
  },
];

function WizardProgressBar({ step }: { step: number }) {
  const pct = Math.round((step / TOTAL_STEPS) * 100);
  return (
    <div className="mb-5 space-y-2">
      <div className="flex items-center justify-between gap-2 text-xs font-medium text-zinc-600">
        <span>
          Etapa {step} de {TOTAL_STEPS}
        </span>
        <span className="text-zinc-500">{STEP_LABELS[step - 1]}</span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-zinc-100"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progresso da nova solicitação"
      >
        <div
          className="h-full rounded-full bg-brand transition-[width] duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export interface ReplenishmentCreateWizardModalProps {
  open: boolean;
  busy: boolean;
  machinesEmpty: boolean;
  machines: MachineListItem[];
  destinationId: string;
  setDestinationId: (id: string) => void;
  movementCube: string;
  setMovementCube: (value: string) => void;
  typeMovimentPallet: ReplenishmentMovimentType;
  setTypeMovimentPallet: (value: ReplenishmentMovimentType) => void;
  priorityLevel?: PriorityLevelValue;
  setPriorityLevel?: (value: PriorityLevelValue) => void;
  isCritical?: boolean;
  setIsCritical?: (value: boolean) => void;
  /** Etapa inicial ao abrir (ex.: 2 quando a máquina já veio de um aviso do operador). */
  initialStep?: number;
  createError: string | null;
  onClose: () => void;
  onSubmit: () => void;
}

export function ReplenishmentCreateWizardModal({
  open,
  busy,
  machinesEmpty,
  machines,
  destinationId,
  setDestinationId,
  movementCube,
  setMovementCube,
  typeMovimentPallet,
  setTypeMovimentPallet,
  priorityLevel,
  setPriorityLevel,
  isCritical,
  setIsCritical,
  initialStep = 1,
  createError,
  onClose,
  onSubmit,
}: ReplenishmentCreateWizardModalProps) {
  const [step, setStep] = useState(1);

  useEffect(() => {
    if (open) {
      const step = Math.min(Math.max(initialStep, 1), TOTAL_STEPS);
      setStep(step);
    }
  }, [open, initialStep]);

  const canGoNext = (() => {
    if (step === 1) return destinationId.trim() !== '';
    if (step === 2) return prismaCodeNumberPart(movementCube).length > 0;
    if (step === 3) return Boolean(typeMovimentPallet);
    return true;
  })();

  const handleNext = () => {
    if (!canGoNext || busy) return;
    if (step < TOTAL_STEPS) {
      setStep((s) => s + 1);
    } else {
      onSubmit();
    }
  };

  const handleBack = () => {
    if (busy) return;
    if (step > 1) {
      setStep((s) => s - 1);
    }
  };

  const stepDescription = (() => {
    switch (step) {
      case 1:
        return 'Selecione a máquina de produção que receberá o prisma.';
      case 2:
        return 'Informe o identificador físico do prisma ou pallet.';
      case 3:
        return 'Defina qual equipamento de transporte pode atender — ou deixe aberto para qualquer um.';
      case 4:
        return 'Escolha a urgência do pedido na fila de transporte.';
      default:
        return undefined;
    }
  })();

  return (
    <SimpleModal
      open={open}
      title="Nova solicitação de reposição"
      description={stepDescription}
      panelClassName="max-w-2xl"
      onClose={() => (!busy ? onClose() : undefined)}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            disabled={busy}
            onClick={() => !busy && onClose()}
          >
            Cancelar
          </Button>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            {step > 1 ? (
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                disabled={busy}
                onClick={handleBack}
              >
                <ChevronLeft className="mr-1 size-4" aria-hidden />
                Voltar
              </Button>
            ) : null}
            <Button
              type="button"
              className="w-full sm:w-auto"
              disabled={busy || machinesEmpty || !canGoNext}
              onClick={handleNext}
            >
              {step < TOTAL_STEPS ? (
                <>
                  Próximo
                  <ChevronRight className="ml-1 size-4" aria-hidden />
                </>
              ) : busy ? (
                'Salvando…'
              ) : (
                'Criar solicitação'
              )}
            </Button>
          </div>
        </div>
      }
    >
      <WizardProgressBar step={step} />

      {createError ? (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {createError}
        </p>
      ) : null}

      {step === 1 ? (
        <div className="space-y-3">
          <MachineOperationSelectGrid
            machines={machines}
            selectedId={destinationId}
            onSelect={setDestinationId}
            disabled={busy}
          />
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Box className="size-4 text-blue-500" />
              <Label htmlFor="rr-wizard-cube">Código do prisma / pallet</Label>
            </div>
            <div
              className={cn(
                'flex h-[var(--control-height,2.5rem)] overflow-hidden rounded-xl border-2 border-zinc-200 bg-white transition-colors',
                'focus-within:border-brand focus-within:ring-[3px] focus-within:ring-brand/35',
                busy && 'opacity-50',
              )}
            >
              <span
                className="flex shrink-0 items-center border-r border-zinc-200 bg-zinc-50 px-4 font-mono text-base font-semibold text-zinc-700"
                aria-hidden
              >
                {PRISMA_CODE_PREFIX}
              </span>
              <Input
                id="rr-wizard-cube"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={prismaCodeNumberPart(movementCube)}
                onChange={(e) =>
                  setMovementCube(prismaCodeFromNumberPart(e.target.value))
                }
                placeholder="20"
                autoFocus
                disabled={busy}
                aria-label="Número do prisma"
                className="h-full rounded-none border-0 font-mono text-base shadow-none focus-visible:ring-0"
              />
            </div>
          </div>
          <p className="text-xs text-zinc-500">
            Informe apenas o número; o código será salvo como {PRISMA_CODE_PREFIX}
            seguido do valor (ex.: {PRISMA_CODE_PREFIX}20).
          </p>
        </div>
      ) : null}

      {step === 3 ? (
        <ul
          className="m-0 grid list-none gap-3 p-0"  
          role="listbox"
          aria-label="Tipo de movimentação"
        >
          {MOVEMENT_OPTIONS.map((opt) => {
            const selected = typeMovimentPallet === opt.value;
            return (
              <li key={opt.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={cn(
                    selectCardBase,
                    'sm:flex-row sm:items-center',
                    selected ? selectCardSelected : selectCardIdle,
                  )}
                  onClick={() => setTypeMovimentPallet(opt.value)}
                  disabled={busy}
                >
                  <div className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-zinc-50 px-4 py-3 sm:w-36">
                    {opt.value === 'ANY' ? (
                      <>
                        <img
                          src={movimentTypePublicIconPath('FORKLIFT')}
                          alt=""
                          className="h-10 w-auto max-w-[3.5rem] object-contain"
                        />
                        <img
                          src={movimentTypePublicIconPath('PALLET_TRUCK')}
                          alt=""
                          className="h-10 w-auto max-w-[3.5rem] object-contain opacity-90"
                        />
                      </>
                    ) : (
                      <img
                        src={movimentTypePublicIconPath(opt.value)}
                        alt=""
                        className="h-14 w-auto max-w-[5rem] object-contain"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="m-0 font-semibold text-zinc-900">
                      {replenishmentMovimentTypeLabel(opt.value)}
                    </p>
                    <p className="mt-1 text-sm leading-snug text-zinc-600">
                      {opt.description}
                    </p>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {step === 4 && setIsCritical ? (
        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
          <input
            type="checkbox"
            checked={isCritical === true}
            onChange={(e) => setIsCritical(e.target.checked)}
            disabled={busy}
            className="size-4"
          />
          <span className="flex items-center gap-2 text-sm font-medium text-zinc-900">
            <AlertTriangle className="size-4 text-red-500" />
            Marcar como crítico
          </span>
        </label>
      ) : null}

      {step === 4 && setPriorityLevel && priorityLevel !== undefined ? (
        <div className="space-y-4">
          <ul
            className="m-0 grid list-none gap-3 p-0 sm:grid-cols-3"
            role="listbox"
            aria-label="Prioridade"
          >
            {PRIORITY_OPTIONS.map((opt) => {
              const selected = priorityLevel === opt.value;
              return (
                <li key={opt.value} className="min-w-0">
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className={cn(
                      selectCardBase,
                      'items-center text-center',
                      selected
                        ? cn(selectCardSelected, opt.selectedRing)
                        : selectCardIdle,
                    )}
                    onClick={() => setPriorityLevel(opt.value)}
                    disabled={busy}
                  >
                    <p
                      className={cn(
                        'm-0 text-sm font-bold uppercase tracking-wide',
                        opt.accent,
                      )}
                    >
                      {priorityLevelLabel(opt.value)}
                    </p>
                    <p className="mt-2 text-xs leading-snug text-zinc-600">
                      {opt.hint}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </SimpleModal>
  );
}

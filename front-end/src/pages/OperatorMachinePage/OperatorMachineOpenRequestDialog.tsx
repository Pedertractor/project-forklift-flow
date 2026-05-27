import { useEffect, useState, type ReactNode } from 'react';
import { ModalActions, SimpleModal } from '@/components/crud/SimpleModal';
import { cn } from '@/lib/utils';
import type { DeliveryTaskListItem } from '@/types/machine-task.types';
import type { OperatorMachineSupplyRequestListItem } from '@/types/operator-machine.types';
import {
  canRequestSupply,
  hasOpenDeliveryInProgress,
} from './operator-machine-flow';
import { ArrowDownLeft, ArrowUpRight, InfoIcon, Lightbulb } from 'lucide-react';

export type OperatorServiceSelection = {
  pickup: boolean;
  supply: boolean;
  /** Quando `pickup` é true: prioridade máxima na fila do transporte. */
  pickupIsCritical?: boolean;
};

const serviceCardBase =
  'flex w-full flex-col gap-2 rounded-2xl border-2 bg-white p-4 text-left outline-none transition-all focus-visible:ring-[3px] focus-visible:ring-brand/25 disabled:cursor-not-allowed disabled:opacity-55';

const serviceCardIdle = 'border-zinc-200 hover:border-zinc-300';
const serviceCardSelected =
  'border-brand bg-gradient-to-br from-brand/[0.08] to-white ring-2 ring-brand/20';

export interface OperatorMachineOpenRequestDialogProps {
  open: boolean;
  onClose: () => void;
  deliveryTasks: DeliveryTaskListItem[];
  openSupply: OperatorMachineSupplyRequestListItem | null;
  canPickup: boolean;
  pickupBlockedMessage: string | null;
  submitPending: boolean;
  onSubmit: (selection: OperatorServiceSelection) => void | Promise<void>;
}

export function OperatorMachineOpenRequestDialog({
  open,
  onClose,
  deliveryTasks,
  openSupply,
  canPickup,
  pickupBlockedMessage,
  submitPending,
  onSubmit,
}: OperatorMachineOpenRequestDialogProps) {
  const [pickup, setPickup] = useState(false);
  const [pickupIsCritical, setPickupIsCritical] = useState(false);
  const [supply, setSupply] = useState(false);
  const [step, setStep] = useState<'select' | 'suggestion'>('select');

  const supplyAvailable = canRequestSupply(openSupply);
  const supplyAlreadyOpen = openSupply?.status === 'OPEN';
  const showTripSuggestion = hasOpenDeliveryInProgress(deliveryTasks);
  const supplyInRequest = supply || supplyAlreadyOpen;
  const bothSelected = pickup && supplyInRequest;

  useEffect(() => {
    if (!open) {
      setPickup(false);
      setPickupIsCritical(false);
      setSupply(false);
      setStep('select');
    }
  }, [open]);

  const canConfirmSelect = (pickup && canPickup) || (supply && supplyAvailable);

  const handlePrimary = async () => {
    if (step === 'suggestion') {
      await onSubmit({
        pickup,
        supply: supplyInRequest,
        pickupIsCritical: pickup && pickupIsCritical,
      });
      return;
    }
    if (!canConfirmSelect) return;
    if (bothSelected && canPickup) {
      setStep('suggestion');
      return;
    }
    await onSubmit({
      pickup: pickup && canPickup,
      supply: (supply && supplyAvailable) || supplyAlreadyOpen,
      pickupIsCritical: pickup && canPickup && pickupIsCritical,
    });
  };

  const primaryLabel =
    step === 'suggestion'
      ? submitPending
        ? 'Enviando…'
        : 'Confirmar solicitação'
      : bothSelected && canPickup
        ? 'Continuar'
        : submitPending
          ? 'Enviando…'
          : 'Confirmar';

  return (
    <SimpleModal
      open={open}
      onClose={onClose}
      title={
        step === 'suggestion'
          ? 'Retirada e abastecimento juntos'
          : 'Abrir solicitação'
      }
      description={
        step === 'suggestion'
          ? 'Revise o que será acionado antes de confirmar.'
          : 'Selecione um ou mais serviços para esta máquina.'
      }
      footer={
        <ModalActions
          onCancel={step === 'suggestion' ? () => setStep('select') : onClose}
          submitLabel={primaryLabel}
          onSubmit={handlePrimary}
          disabled={submitPending || (step === 'select' && !canConfirmSelect)}
        />
      }
    >
      {step === 'select' ? (
        <div className="flex flex-col gap-3">
          <ServiceOptionCard
            selected={pickup}
            disabled={!canPickup}
            onToggle={() => {
              if (!canPickup) return;
              setPickup((v) => {
                const next = !v;
                if (!next) setPickupIsCritical(false);
                return next;
              });
            }}
            icon={
              <ArrowDownLeft
                className="size-5 shrink-0 rounded-full bg-red-200 p-0.5"
                aria-hidden
              />
            }
            title="Solicitar retirada"
            description="Aciona o transporte para retirar o prisma na máquina."
            hint={!canPickup ? pickupBlockedMessage : undefined}
          >
            {canPickup ? (
              <PickupCriticalCheckbox
                insideCard
                checked={pickupIsCritical}
                disabled={submitPending}
                onChange={setPickupIsCritical}
              />
            ) : null}
          </ServiceOptionCard>

          <ServiceOptionCard
            selected={(supply && supplyAvailable) || supplyAlreadyOpen}
            disabled={!supplyAvailable}
            onToggle={() => supplyAvailable && setSupply((v) => !v)}
            icon={
              <ArrowUpRight
                className="size-5 shrink-0 rounded-full bg-green-200 p-0.5"
                aria-hidden
              />
            }
            title="Solicitar abastecimento"
            description="Avisa o abastecimento para registrar a próxima entrega."
            hint={
              supplyAlreadyOpen
                ? 'Já existe uma solicitação em aberto — o abastecimento e o transporte já foram avisados.'
                : undefined
            }
          />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-sky-200 bg-sky-50/80 px-4 py-3">
            <p className="m-0 flex items-start gap-2 text-sm font-medium text-sky-950">
              <Lightbulb className="mt-0.5 size-4 shrink-0" aria-hidden />
              Sugestão de viagem
            </p>
            <p className="mb-0 mt-2 text-sm leading-relaxed text-sky-900/90">
              {showTripSuggestion
                ? 'Há uma entrega preparada para esta máquina. O transporte pode receber uma sugestão de viagem combinada (entrega + retirada) na fila.'
                : 'O abastecimento será avisado. Quando houver entrega preparada para esta máquina, pode surgir sugestão de viagem para o empilhadeirista.'}
            </p>
          </div>

          <ul className="m-0 list-none space-y-2 p-0 text-sm text-zinc-700">
            <li className="flex flex-col gap-2">
              <span className="flex items-center gap-2">
                <ArrowDownLeft
                  className="size-4 shrink-0 rounded-full bg-red-200"
                  aria-hidden
                />
                Retirada do pallet na máquina
                {pickupIsCritical ? (
                  <span className="rounded-md bg-red-50 px-1.5 py-0.5 text-xs font-semibold text-red-800 ring-1 ring-inset ring-red-200">
                    Crítica
                  </span>
                ) : null}
              </span>
              {pickup && canPickup ? (
                <PickupCriticalCheckbox
                  nested
                  checked={pickupIsCritical}
                  disabled={submitPending}
                  onChange={setPickupIsCritical}
                />
              ) : null}
            </li>
            <li className="flex items-center gap-2">
              <ArrowUpRight
                className="size-4 shrink-0 rounded-full bg-green-200"
                aria-hidden
              />
              {supplyAlreadyOpen
                ? 'Abastecimento: solicitação em aberto (mantida)'
                : 'Nova solicitação ao abastecimento'}
            </li>
          </ul>

          {supplyAlreadyOpen ? (
            <p className="m-0 flex items-start gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
              <InfoIcon
                className="mt-0.5 size-4 shrink-0 text-blue-500"
                aria-hidden
              />
              Só é permitida uma solicitação de abastecimento em aberto por vez.
            </p>
          ) : null}
        </div>
      )}
    </SimpleModal>
  );
}

function PickupCriticalCheckbox({
  checked,
  disabled,
  insideCard = false,
  nested = false,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  /** Dentro do card «Solicitar retirada». */
  insideCard?: boolean;
  /** Abaixo do título na etapa de confirmação. */
  nested?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-start gap-2.5 text-left',
        insideCard &&
          cn(
            'rounded-lg px-1 py-2',
            checked ? 'bg-red-50/70' : 'bg-zinc-50/50',
          ),
        !insideCard &&
          nested &&
          cn(
            'ml-1 rounded-lg border-l-[3px] py-2 pl-3 pr-2',
            checked
              ? 'border-l-red-400 bg-red-50/60'
              : 'border-l-zinc-300 bg-zinc-50/80',
          ),
        !insideCard &&
          !nested &&
          cn(
            'rounded-xl border px-4 py-3',
            checked
              ? 'border-red-200 bg-red-50/80'
              : 'border-zinc-200 bg-zinc-50',
          ),
        disabled && 'cursor-not-allowed opacity-55',
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-4 shrink-0"
      />
      <span
        className={cn(
          'leading-snug text-zinc-800',
          insideCard || nested ? 'text-xs' : 'text-sm',
        )}
      >
        <span className="font-semibold text-zinc-900">Retirada crítica</span>
        <span className="mt-0.5 block text-zinc-600">
          Prioridade máxima na fila do transporte.
        </span>
      </span>
    </label>
  );
}

function ServiceOptionCard({
  selected,
  disabled,
  onToggle,
  icon,
  title,
  description,
  hint,
  children,
}: {
  selected: boolean;
  disabled: boolean;
  onToggle: () => void;
  icon: ReactNode;
  title: string;
  description: string;
  hint?: string | null;
  /** Conteúdo extra dentro do card (ex.: prioridade), só quando selecionado. */
  children?: ReactNode;
}) {
  const showInner = selected && !disabled && children != null;

  return (
    <div
      className={cn(
        serviceCardBase,
        selected && !disabled ? serviceCardSelected : serviceCardIdle,
        disabled && 'opacity-55',
      )}
    >
      <button
        type="button"
        className={cn(
          'flex w-full flex-col gap-2 rounded-2xl text-left outline-none transition-colors',
          'focus-visible:ring-[3px] focus-visible:ring-brand/25',
          disabled ? 'cursor-not-allowed' : 'cursor-pointer',
          showInner && 'rounded-b-none',
        )}
        onClick={onToggle}
        disabled={disabled}
        aria-pressed={selected}
      >
        <span className="flex items-center gap-2 font-semibold text-zinc-900">
          {icon}
          {title}
        </span>
        <span className="text-sm text-zinc-600">{description}</span>
        {hint ? (
          <span className="text-xs leading-relaxed text-amber-800">{hint}</span>
        ) : null}
      </button>
      {showInner ? (
        <div
          className="border-t border-zinc-200/90 px-3 pb-3 pt-2"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

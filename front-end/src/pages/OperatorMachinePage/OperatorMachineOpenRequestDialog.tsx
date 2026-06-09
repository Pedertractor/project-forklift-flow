import { useEffect, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/brand-button';
import { ModalActions, SimpleModal } from '@/components/crud/SimpleModal';
import { cn } from '@/lib/utils';
import type { TypeMovimentPalletValue } from '@/types/machine-task.types';
import type { OperatorMachineSupplyRequestListItem } from '@/types/operator-machine.types';
import type { ReplenishmentMovimentType } from '@/types/replenishment-moviment.types';
import {
  movimentTypePublicIconPath,
  replenishmentMovimentTypeLabel,
} from '@/utils/operator-moviment-display';
import {
  canRequestPickupWithReplenishment,
  canRequestSupply,
  PALLET_AT_RECEIVING_SUPPLY_BLOCKED_MESSAGE,
} from './operator-machine-flow';
import type { DeliveryTaskListItem } from '@/types/machine-task.types';
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  ChevronLeft,
} from 'lucide-react';

export type OperatorServiceSelection = {
  pickup: boolean;
  supply: boolean;
  /** Quando `pickup` é true: prioridade máxima na fila do transporte. */
  pickupIsCritical?: boolean;
  /** Obrigatório quando `pickup` é true. */
  typeMovimentPallet?: TypeMovimentPalletValue;
};

const MOVEMENT_OPTIONS: {
  value: ReplenishmentMovimentType;
  description: string;
}[] = [
  {
    value: 'FORKLIFT',
    description: 'Somente empilhadeira atende esta retirada.',
  },
  {
    value: 'ANY',
    description:
      'Empilhadeirista ou transpaleteirista pode aceitar a retirada do pallet.',
  },
];

const serviceCardBase =
  'flex w-full flex-col gap-2 rounded-2xl border-2 bg-white p-4 text-left outline-none transition-all focus-visible:ring-[3px] focus-visible:ring-brand/25 disabled:cursor-not-allowed disabled:opacity-55';

const serviceCardIdle = 'border-zinc-200 hover:border-zinc-300';
const serviceCardSelected =
  'border-brand bg-gradient-to-br from-brand/[0.08] to-white ring-2 ring-brand/20';

export interface OperatorMachineOpenRequestDialogProps {
  open: boolean;
  onClose: () => void;
  openSupply: OperatorMachineSupplyRequestListItem | null;
  deliveryTasks: DeliveryTaskListItem[];
  canPickup: boolean;
  pickupBlockedMessage: string | null;
  submitPending: boolean;
  onSubmit: (selection: OperatorServiceSelection) => void | Promise<void>;
}

export function OperatorMachineOpenRequestDialog({
  open,
  onClose,
  openSupply,
  deliveryTasks,
  canPickup,
  pickupBlockedMessage,
  submitPending,
  onSubmit,
}: OperatorMachineOpenRequestDialogProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [pickup, setPickup] = useState(false);
  const [pickupIsCritical, setPickupIsCritical] = useState(false);
  const [supply, setSupply] = useState(false);
  const [combinedSelected, setCombinedSelected] = useState(false);
  const [typeMovimentPallet, setTypeMovimentPallet] =
    useState<TypeMovimentPalletValue>('FORKLIFT');

  const supplyAvailable = canRequestSupply(openSupply, deliveryTasks);
  const supplyAlreadyOpen = openSupply?.status === 'OPEN';
  const pickupWithReplenishmentAvailable =
    canRequestPickupWithReplenishment(deliveryTasks);
  const palletAtReceivingBlockedMessage =
    PALLET_AT_RECEIVING_SUPPLY_BLOCKED_MESSAGE;

  useEffect(() => {
    if (!open) {
      setStep(1);
      setPickup(false);
      setPickupIsCritical(false);
      setSupply(false);
      setCombinedSelected(false);
      setTypeMovimentPallet('FORKLIFT');
    }
  }, [open]);

  const canSelectBoth =
    canPickup &&
    pickupWithReplenishmentAvailable &&
    (supplyAvailable || supplyAlreadyOpen);

  const combinedBlockedHint = !canPickup
    ? pickupBlockedMessage
    : !pickupWithReplenishmentAvailable
      ? palletAtReceivingBlockedMessage
      : !supplyAvailable && !supplyAlreadyOpen
        ? 'Abastecimento indisponível no momento.'
        : null;

  const canConfirm = (pickup && canPickup) || (supply && supplyAvailable);

  function toggleBoth() {
    if (!canSelectBoth) return;
    if (combinedSelected) {
      setCombinedSelected(false);
      setPickup(false);
      setSupply(false);
      setPickupIsCritical(false);
      return;
    }
    setCombinedSelected(true);
    setPickup(true);
    if (supplyAvailable) setSupply(true);
  }

  function togglePickupOnly() {
    if (!canPickup) return;
    setCombinedSelected(false);
    setPickup((v) => {
      const next = !v;
      if (next) setSupply(false);
      if (!next) setPickupIsCritical(false);
      return next;
    });
  }

  function toggleSupplyOnly() {
    if (!supplyAvailable) return;
    setCombinedSelected(false);
    setSupply((v) => {
      const next = !v;
      if (next) {
        setPickup(false);
        setPickupIsCritical(false);
      }
      return next;
    });
  }

  const pickupSelected = pickup && canPickup;

  const buildSelection = (): OperatorServiceSelection => ({
    pickup: pickupSelected,
    supply: (supply && supplyAvailable) || supplyAlreadyOpen,
    pickupIsCritical: pickupSelected && pickupIsCritical,
    typeMovimentPallet: pickupSelected ? typeMovimentPallet : undefined,
  });

  const handlePrimary = async () => {
    if (!canConfirm) return;
    if (pickupSelected && step === 1) {
      setStep(2);
      return;
    }
    await onSubmit(buildSelection());
  };

  const pickupOnlySelected = pickup && !combinedSelected;
  const supplyOnlySelected = supply && supplyAvailable && !combinedSelected;

  const modalTitle = step === 1 ? 'Abrir solicitação' : 'Tipo de retirada';
  const modalDescription =
    step === 1
      ? pickupWithReplenishmentAvailable
        ? 'Selecione retirada e abastecimento juntos ou apenas um dos serviços abaixo.'
        : canPickup
          ? 'Há pallet no recebimento — solicite apenas a retirada do pallet na máquina para abrir a sugestão de entrega e retirada.'
          : 'Selecione o serviço desejado abaixo.'
      : 'Escolha se a retirada será feita somente por empilhadeira ou por qualquer transporte disponível.';

  return (
    <SimpleModal
      open={open}
      onClose={onClose}
      title={modalTitle}
      description={modalDescription}
      footer={
        step === 1 ? (
          <ModalActions
            onCancel={onClose}
            submitLabel={
              submitPending
                ? 'Enviando…'
                : pickupSelected
                  ? 'Continuar'
                  : 'Confirmar'
            }
            onSubmit={handlePrimary}
            disabled={submitPending || !canConfirm}
          />
        ) : (
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="outline"
              className="sm:min-w-[7rem]"
              disabled={submitPending}
              onClick={() => setStep(1)}
            >
              <ChevronLeft className="size-4 shrink-0" aria-hidden />
              Voltar
            </Button>
            <ModalActions
              onCancel={onClose}
              submitLabel={submitPending ? 'Enviando…' : 'Confirmar'}
              onSubmit={handlePrimary}
              disabled={submitPending}
            />
          </div>
        )
      }
    >
      {step === 2 ? (
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
                    serviceCardBase,
                    'sm:flex-row sm:items-center',
                    selected ? serviceCardSelected : serviceCardIdle,
                  )}
                  onClick={() => setTypeMovimentPallet(opt.value)}
                  disabled={submitPending}
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
                  <div className="min-w-0 flex-1 text-left">
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
      ) : (
        <div className="flex flex-col gap-4">
          <ServiceOptionCard
            selected={combinedSelected}
            disabled={!canSelectBoth}
            onToggle={toggleBoth}
            icon={
              <span className="flex shrink-0 items-center gap-0.5" aria-hidden>
                <ArrowDownLeft className="size-5 rounded-full bg-red-200 p-0.5" />
                <ArrowUpRight className="size-5 rounded-full bg-green-200 p-0.5" />
              </span>
            }
            title="Retirada e abastecimento"
            description="Solicita retirada do pallet na máquina e aviso ao abastecimento em um único passo."
            hint={combinedBlockedHint}
          >
            {combinedSelected && canPickup ? (
              <PickupCriticalCheckbox
                insideCard
                checked={pickupIsCritical}
                disabled={submitPending}
                onChange={setPickupIsCritical}
              />
            ) : null}
          </ServiceOptionCard>

          <p className="m-0 text-center text-xs font-medium text-zinc-500">
            ou escolha apenas um
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <ServiceOptionCard
              selected={pickupOnlySelected}
              disabled={!canPickup}
              onToggle={togglePickupOnly}
              icon={
                <ArrowDownLeft
                  className="size-5 shrink-0 rounded-full bg-red-200 p-0.5"
                  aria-hidden
                />
              }
              title="Solicitar retirada do pallet"
              description="Aciona o transporte para retirar o pallet na máquina."
              hint={!canPickup ? pickupBlockedMessage : undefined}
            >
              {pickupOnlySelected ? (
                <PickupCriticalCheckbox
                  insideCard
                  checked={pickupIsCritical}
                  disabled={submitPending}
                  onChange={setPickupIsCritical}
                />
              ) : null}
            </ServiceOptionCard>

            <ServiceOptionCard
              selected={supplyOnlySelected}
              disabled={!supplyAvailable}
              onToggle={toggleSupplyOnly}
              icon={
                <ArrowUpRight
                  className="size-5 shrink-0 rounded-full bg-green-200 p-0.5"
                  aria-hidden
                />
              }
              title="Solicitar abastecimento de pallet"
              description="Avisa o abastecimento para registrar a próxima entrega."
              hint={
                !pickupWithReplenishmentAvailable
                  ? palletAtReceivingBlockedMessage
                  : supplyAlreadyOpen
                    ? 'Já existe uma solicitação em aberto.'
                    : undefined
              }
            />
          </div>
        </div>
      )}
    </SimpleModal>
  );
}

function PickupCriticalCheckbox({
  checked,
  disabled,
  insideCard = false,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  insideCard?: boolean;
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
      <span className="text-xs leading-snug text-zinc-800">
        <div className="flex items-center gap-2">
          <AlertTriangle className="size-4 text-red-500" />
          <span className="font-semibold text-zinc-900">Retirada crítica</span>
        </div>
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

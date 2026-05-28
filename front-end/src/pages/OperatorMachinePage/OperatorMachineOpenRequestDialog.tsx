import { useEffect, useState, type ReactNode } from 'react';
import { ModalActions, SimpleModal } from '@/components/crud/SimpleModal';
import { cn } from '@/lib/utils';
import type { OperatorMachineSupplyRequestListItem } from '@/types/operator-machine.types';
import { canRequestSupply } from './operator-machine-flow';
import { AlertTriangle, ArrowDownLeft, ArrowUpRight } from 'lucide-react';

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
  openSupply: OperatorMachineSupplyRequestListItem | null;
  canPickup: boolean;
  pickupBlockedMessage: string | null;
  submitPending: boolean;
  onSubmit: (selection: OperatorServiceSelection) => void | Promise<void>;
}

export function OperatorMachineOpenRequestDialog({
  open,
  onClose,
  openSupply,
  canPickup,
  pickupBlockedMessage,
  submitPending,
  onSubmit,
}: OperatorMachineOpenRequestDialogProps) {
  const [pickup, setPickup] = useState(false);
  const [pickupIsCritical, setPickupIsCritical] = useState(false);
  const [supply, setSupply] = useState(false);
  const [combinedSelected, setCombinedSelected] = useState(false);

  const supplyAvailable = canRequestSupply(openSupply);
  const supplyAlreadyOpen = openSupply?.status === 'OPEN';

  useEffect(() => {
    if (!open) {
      setPickup(false);
      setPickupIsCritical(false);
      setSupply(false);
      setCombinedSelected(false);
    }
  }, [open]);

  const canSelectBoth = canPickup && (supplyAvailable || supplyAlreadyOpen);

  const combinedBlockedHint = !canPickup
    ? pickupBlockedMessage
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

  const handlePrimary = async () => {
    if (!canConfirm) return;
    await onSubmit({
      pickup: pickup && canPickup,
      supply: (supply && supplyAvailable) || supplyAlreadyOpen,
      pickupIsCritical: pickup && canPickup && pickupIsCritical,
    });
  };

  const pickupOnlySelected = pickup && !combinedSelected;
  const supplyOnlySelected = supply && supplyAvailable && !combinedSelected;

  return (
    <SimpleModal
      open={open}
      onClose={onClose}
      title="Abrir solicitação"
      description="Selecione retirada e abastecimento juntos ou apenas um dos serviços abaixo."
      footer={
        <ModalActions
          onCancel={onClose}
          submitLabel={submitPending ? 'Enviando…' : 'Confirmar'}
          onSubmit={handlePrimary}
          disabled={submitPending || !canConfirm}
        />
      }
    >
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
            description="Aciona o transporte para retirar o prisma na máquina."
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
              supplyAlreadyOpen
                ? 'Já existe uma solicitação em aberto — o abastecimento e o transporte já foram avisados.'
                : undefined
            }
          />
        </div>
      </div>
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

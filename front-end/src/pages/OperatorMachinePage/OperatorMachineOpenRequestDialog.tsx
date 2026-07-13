import { useEffect, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/brand-button';
import { ModalActions, SimpleModal } from '@/components/crud/SimpleModal';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { TypeMovimentPalletValue } from '@/types/machine-task.types';
import type {
  MachineToolingListItem,
  OperatorMachineSupplyRequestListItem,
} from '@/types/operator-machine.types';
import type { ReplenishmentMovimentType } from '@/types/replenishment-moviment.types';
import {
  movimentTypePublicIconPath,
  replenishmentMovimentTypeLabel,
} from '@/utils/operator-moviment-display';
import {
  canRequestPickupWithReplenishment,
  canRequestSupply,
  PALLET_AT_RECEIVING_SUPPLY_BLOCKED_MESSAGE,
  PICKUP_WITH_REPLENISHMENT_BLOCKED_MESSAGE,
} from './operator-machine-flow';
import type { DeliveryTaskListItem } from '@/types/machine-task.types';
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  ChevronLeft,
  Plus,
  Wrench,
  X,
} from 'lucide-react';

export type OperatorServiceSelection = {
  pickup: boolean;
  supply: boolean;
  /** Quando `pickup` é true: prioridade máxima na fila do transporte. */
  pickupIsCritical?: boolean;
  /** Obrigatório quando `pickup` é true. */
  typeMovimentPallet?: TypeMovimentPalletValue;
};

type DialogStep = 'service' | 'movement' | 'tooling';

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

const serviceCardExpandedShell =
  'overflow-hidden rounded-2xl border-2 transition-all';
const serviceCardExpandedShellIdle = 'border-zinc-200';
const serviceCardExpandedShellSelected =
  'border-brand bg-gradient-to-br from-brand/[0.08] to-white ring-2 ring-brand/20';
const serviceCardExpandedFooter =
  'border-t border-brand/20 bg-gradient-to-br from-brand/[0.04] to-white px-3 pb-3 pt-2';

export interface OperatorMachineOpenRequestDialogProps {
  open: boolean;
  onClose: () => void;
  openSupply: OperatorMachineSupplyRequestListItem | null;
  deliveryTasks: DeliveryTaskListItem[];
  toolings: MachineToolingListItem[];
  canPickup: boolean;
  pickupBlockedMessage: string | null;
  submitPending: boolean;
  createToolingPending?: boolean;
  deleteToolingPendingId?: string | null;
  onCreateTooling: (name: string) => Promise<MachineToolingListItem>;
  onDeleteTooling: (toolingId: string) => Promise<void>;
  onSubmit: (selection: OperatorServiceSelection) => void | Promise<void>;
}

export function OperatorMachineOpenRequestDialog({
  open,
  onClose,
  openSupply,
  deliveryTasks,
  toolings,
  canPickup,
  pickupBlockedMessage,
  submitPending,
  createToolingPending = false,
  deleteToolingPendingId = null,
  onCreateTooling,
  onDeleteTooling,
  onSubmit,
}: OperatorMachineOpenRequestDialogProps) {
  const [step, setStep] = useState<DialogStep>('service');
  const [pickup, setPickup] = useState(false);
  const [pickupIsCritical, setPickupIsCritical] = useState(false);
  const [supply, setSupply] = useState(false);
  const [combinedSelected, setCombinedSelected] = useState(false);
  const [typeMovimentPallet, setTypeMovimentPallet] =
    useState<TypeMovimentPalletValue>('FORKLIFT');
  const [newToolingName, setNewToolingName] = useState('');

  const supplyAvailable = canRequestSupply(openSupply, deliveryTasks);
  const supplyAlreadyOpen = openSupply?.status === 'OPEN';
  const pickupWithReplenishmentAvailable = canRequestPickupWithReplenishment(
    openSupply,
    deliveryTasks,
  );
  const palletAtReceivingBlockedMessage =
    PALLET_AT_RECEIVING_SUPPLY_BLOCKED_MESSAGE;

  const needsToolingConfirm = supply && supplyAvailable;
  const toolingBusy =
    createToolingPending || deleteToolingPendingId != null;

  useEffect(() => {
    if (!open) {
      setStep('service');
      setPickup(false);
      setPickupIsCritical(false);
      setSupply(false);
      setCombinedSelected(false);
      setTypeMovimentPallet('FORKLIFT');
      setNewToolingName('');
    }
  }, [open]);

  const canSelectBoth =
    canPickup &&
    pickupWithReplenishmentAvailable &&
    (supplyAvailable || supplyAlreadyOpen);

  const combinedBlockedHint = !canPickup
    ? pickupBlockedMessage
    : !pickupWithReplenishmentAvailable
      ? PICKUP_WITH_REPLENISHMENT_BLOCKED_MESSAGE
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
    if (step === 'service') {
      if (pickupSelected) {
        setStep('movement');
        return;
      }
      if (needsToolingConfirm) {
        setStep('tooling');
        return;
      }
      await onSubmit(buildSelection());
      return;
    }
    if (step === 'movement') {
      if (needsToolingConfirm) {
        setStep('tooling');
        return;
      }
      await onSubmit(buildSelection());
      return;
    }
    await onSubmit(buildSelection());
  };

  const handleBack = () => {
    if (step === 'tooling') {
      setStep(pickupSelected ? 'movement' : 'service');
      return;
    }
    if (step === 'movement') {
      setStep('service');
    }
  };

  const handleCreateToolingInline = async () => {
    const trimmed = newToolingName.trim();
    if (!trimmed || toolingBusy || submitPending) return;
    try {
      await onCreateTooling(trimmed);
      setNewToolingName('');
    } catch {
      /* toast via mutation */
    }
  };

  const handleDeleteToolingInline = async (id: string) => {
    if (toolingBusy || submitPending) return;
    try {
      await onDeleteTooling(id);
    } catch {
      /* toast via mutation */
    }
  };

  const pickupOnlySelected = pickup && !combinedSelected;
  const supplyOnlySelected = supply && supplyAvailable && !combinedSelected;

  const modalTitle =
    step === 'service'
      ? 'Abrir solicitação'
      : step === 'movement'
        ? 'Tipo de retirada'
        : 'Confirmar ferramental';
  const modalDescription =
    step === 'service'
      ? pickupWithReplenishmentAvailable
        ? 'Selecione retirada e abastecimento juntos ou apenas um dos serviços abaixo.'
        : canPickup
          ? 'Há pallet no recebimento — solicite apenas a retirada do pallet na máquina para abrir a sugestão de entrega e retirada.'
          : 'Selecione o serviço desejado abaixo.'
      : step === 'movement'
        ? 'Escolha se a retirada será feita somente por empilhadeira ou por qualquer transporte disponível.'
        : 'Revise o ferramental em uso nesta máquina. Você pode adicionar ou remover itens e depois confirmar a solicitação.';

  const primaryLabel =
    submitPending
      ? 'Enviando…'
      : step === 'service' && pickupSelected
        ? 'Continuar'
        : step === 'service' && needsToolingConfirm
          ? 'Continuar'
          : step === 'movement' && needsToolingConfirm
            ? 'Continuar'
            : 'Confirmar';

  const primaryDisabled =
    submitPending || toolingBusy || !canConfirm;

  return (
    <SimpleModal
      open={open}
      onClose={onClose}
      title={modalTitle}
      description={modalDescription}
      footer={
        step === 'service' ? (
          <ModalActions
            onCancel={onClose}
            submitLabel={primaryLabel}
            onSubmit={handlePrimary}
            disabled={primaryDisabled}
          />
        ) : (
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="outline"
              className="sm:min-w-[7rem]"
              disabled={submitPending}
              onClick={handleBack}
            >
              <ChevronLeft className="size-4 shrink-0" aria-hidden />
              Voltar
            </Button>
            <ModalActions
              onCancel={onClose}
              submitLabel={primaryLabel}
              onSubmit={handlePrimary}
              disabled={primaryDisabled}
            />
          </div>
        )
      }
    >
      {step === 'movement' ? (
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
      ) : step === 'tooling' ? (
        <div className="flex flex-col gap-4">
          {toolings.length === 0 ? (
            <p className="m-0 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              Nenhum ferramental cadastrado. Você pode adicionar um abaixo ou
              confirmar mesmo assim.
            </p>
          ) : (
            <ul
              className="m-0 grid list-none gap-2 p-0"
              aria-label="Ferramental da máquina"
            >
              {toolings.map((item) => {
                const removing = deleteToolingPendingId === item.id;
                return (
                  <li
                    key={item.id}
                    className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2.5"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-zinc-50 text-zinc-700">
                      <Wrench className="size-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1 font-medium text-zinc-900">
                      {item.name}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-9 shrink-0 rounded-lg text-zinc-500 hover:bg-red-50 hover:text-red-700"
                      aria-label={`Remover ${item.name}`}
                      disabled={submitPending || toolingBusy}
                      onClick={() => {
                        void handleDeleteToolingInline(item.id);
                      }}
                    >
                      <X className="size-4" aria-hidden />
                      {removing ? (
                        <span className="sr-only">Removendo…</span>
                      ) : null}
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/80 p-3">
            <p className="m-0 mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Novo ferramental
            </p>
            <div className="flex gap-2">
              <Input
                value={newToolingName}
                onChange={(e) => setNewToolingName(e.target.value)}
                placeholder="Ex.: Matriz 45°"
                disabled={submitPending || toolingBusy}
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void handleCreateToolingInline();
                  }
                }}
              />
              <Button
                type="button"
                className="shrink-0 gap-1.5"
                disabled={
                  submitPending ||
                  toolingBusy ||
                  newToolingName.trim() === ''
                }
                onClick={() => {
                  void handleCreateToolingInline();
                }}
              >
                <Plus className="size-4" aria-hidden />
                {createToolingPending ? 'Salvando…' : 'Adicionar'}
              </Button>
            </div>
          </div>
        </div>
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

          <p className="m-0 text-center text-xs font-medium text-zinc-500 ">
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
                supplyAlreadyOpen
                  ? 'Já existe uma solicitação em aberto.'
                  : !supplyAvailable
                    ? palletAtReceivingBlockedMessage
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
  const isActive = selected && !disabled;
  const showInner = isActive && children != null;
  const cardState = isActive ? serviceCardSelected : serviceCardIdle;

  return (
    <div
      className={cn(
        'flex w-full',
        showInner && 'flex-col',
        disabled && 'opacity-55',
        showInner &&
          cn(
            serviceCardExpandedShell,
            isActive
              ? serviceCardExpandedShellSelected
              : serviceCardExpandedShellIdle,
          ),
      )}
    >
      <button
        type="button"
        className={cn(
          serviceCardBase,
          !showInner && cardState,
          showInner &&
            'rounded-none border-0 bg-transparent shadow-none ring-0 focus-visible:ring-inset ',
          disabled ? 'cursor-not-allowed' : 'cursor-pointer',
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
        <div className={serviceCardExpandedFooter}>{children}</div>
      ) : null}
    </div>
  );
}

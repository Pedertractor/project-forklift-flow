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
};

const serviceCardBase =
  'flex w-full flex-col gap-2 rounded-2xl border-2 bg-white p-4 text-left outline-none transition-all focus-visible:ring-[3px] focus-visible:ring-[#005fb8]/25 disabled:cursor-not-allowed disabled:opacity-55';

const serviceCardIdle = 'border-zinc-200 hover:border-zinc-300';
const serviceCardSelected =
  'border-[#005fb8] bg-gradient-to-br from-[#005fb8]/[0.08] to-white ring-2 ring-[#005fb8]/20';

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
      setSupply(false);
      setStep('select');
    }
  }, [open]);

  const canConfirmSelect =
    (pickup && canPickup) || (supply && supplyAvailable);

  const handlePrimary = async () => {
    if (step === 'suggestion') {
      await onSubmit({ pickup, supply: supplyInRequest });
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
          onCancel={
            step === 'suggestion'
              ? () => setStep('select')
              : onClose
          }
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
            onToggle={() => canPickup && setPickup((v) => !v)}
            icon={
              <ArrowDownLeft
                className="size-5 shrink-0 rounded-full bg-red-200 p-0.5"
                aria-hidden
              />
            }
            title="Solicitar retirada"
            description="Aciona o transporte para retirar o prisma na máquina."
            hint={!canPickup ? pickupBlockedMessage : undefined}
          />

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
            <li className="flex items-center gap-2">
              <ArrowDownLeft
                className="size-4 shrink-0 rounded-full bg-red-200"
                aria-hidden
              />
              Retirada do prisma na máquina
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
              <InfoIcon className="mt-0.5 size-4 shrink-0 text-blue-500" aria-hidden />
              Só é permitida uma solicitação de abastecimento em aberto por vez.
            </p>
          ) : null}
        </div>
      )}
    </SimpleModal>
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
}: {
  selected: boolean;
  disabled: boolean;
  onToggle: () => void;
  icon: ReactNode;
  title: string;
  description: string;
  hint?: string | null;
}) {
  return (
    <button
      type="button"
      className={cn(
        serviceCardBase,
        selected && !disabled ? serviceCardSelected : serviceCardIdle,
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
  );
}

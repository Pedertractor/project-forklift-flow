import { cn } from '@/lib/utils';
import type { MachineProductionStatus } from '@/types/machine.types';

export function machineProductionStatusLabel(
  status: MachineProductionStatus,
): string {
  return status === 'ABASTECER' ? 'Abastecer liberado' : 'Trabalhando';
}

export function machineProductionStatusHint(
  status: MachineProductionStatus,
): string {
  if (status === 'ABASTECER') {
    return 'Você pode solicitar abastecimento.';
  }
  return 'Solicite ao abastecedor a liberação antes de pedir abastecimento.';
}

const dotColor: Record<MachineProductionStatus, string> = {
  TRABALHANDO: 'bg-emerald-500',
  ABASTECER: 'bg-amber-500',
};

export function MachineProductionStatusIndicator({
  status,
  className,
}: {
  status: MachineProductionStatus;
  className?: string;
}) {
  const label = machineProductionStatusLabel(status);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-xs text-zinc-600',
        className,
      )}
      role="status"
      title={machineProductionStatusHint(status)}
      aria-label={`${label}. ${machineProductionStatusHint(status)}`}
    >
      <span
        className={cn('size-1.5 shrink-0 rounded-full', dotColor[status])}
        aria-hidden
      />
      {label}
    </span>
  );
}

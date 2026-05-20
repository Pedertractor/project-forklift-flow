import { cn } from '@/lib/utils';
import { typeMachineImageSrc } from '@/pages/TypeMachinesPage/useTypeMachinesPage';
import type { MachineListItem } from '@/types/machine.types';

const selectCardBase =
  'flex w-full flex-col items-stretch gap-3 rounded-2xl border-2 bg-white p-4 text-left outline-none transition-all focus-visible:ring-[3px] focus-visible:ring-[#005fb8]/25 disabled:cursor-not-allowed disabled:opacity-60';

const selectCardIdle = 'border-zinc-200 hover:border-zinc-300 hover:shadow-sm';
const selectCardSelected =
  'border-[#005fb8] bg-gradient-to-br from-[#005fb8]/[0.08] to-white shadow-sm ring-2 ring-[#005fb8]/20';

export interface MachineOperationSelectGridProps {
  machines: MachineListItem[];
  selectedId: string;
  onSelect: (machineId: string) => void;
  disabled?: boolean;
  ariaLabel?: string;
}

export function MachineOperationSelectGrid({
  machines,
  selectedId,
  onSelect,
  disabled = false,
  ariaLabel = 'Máquina de destino',
}: MachineOperationSelectGridProps) {
  if (machines.length === 0) {
    return (
      <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
        Não há máquinas disponíveis no seu setor.
      </p>
    );
  }

  return (
    <ul
      className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2"
      role="listbox"
      aria-label={ariaLabel}
    >
      {machines.map((m) => {
        const selected = selectedId === m.id;
        const img = m.typeMachine.urlImage?.trim();
        return (
          <li key={m.id} className="min-w-0">
            <button
              type="button"
              role="option"
              aria-selected={selected}
              className={cn(
                selectCardBase,
                selected ? selectCardSelected : selectCardIdle,
              )}
              onClick={() => onSelect(m.id)}
              disabled={disabled}
            >
              <div className="flex min-h-[5.5rem] items-center justify-center rounded-xl bg-zinc-50 px-3 py-4">
                {img ? (
                  <img
                    src={typeMachineImageSrc(m.typeMachine.urlImage)}
                    alt=""
                    className="h-16 w-auto max-w-full object-contain"
                  />
                ) : (
                  <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                    {m.typeMachine.name}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <p className="m-0 text-base font-bold text-zinc-900">{m.name}</p>
                <p className="mt-1 text-sm text-zinc-600">{m.typeMachine.name}</p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {m.sector.typeSector} · {m.position}
                </p>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

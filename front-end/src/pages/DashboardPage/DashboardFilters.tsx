import { type Dispatch, type SetStateAction } from 'react';

import { SelectCombobox } from '@/components/ui/select-combobox';
import { DashboardDateRangePicker } from './DashboardDateRangePicker';
import type { ReplenishmentMovimentType } from '@/types/replenishment-moviment.types';

export { selectComboboxClassName as dashboardSelectClassName } from '@/components/ui/select-combobox';

type DashboardFiltersProps = {
  dates: Date[];
  setDates: Dispatch<SetStateAction<Date[]>>;
  selectedMachineId: string;
  onMachineChange: (machineId: string) => void;
  machines: { id: string; name: string }[];
  isMachinesLoading: boolean;
  canFilterBySector?: boolean;
  selectedSectorId?: string;
  onSectorChange?: (sectorId: string) => void;
  sectors?: { id: string; typeSector: string }[];
  isSectorsLoading?: boolean;
  sectorScopeLabel?: string | null;
  typeMovimentPallet?: ReplenishmentMovimentType | '';
  onTypeMovimentPalletChange?: (value: ReplenishmentMovimentType | '') => void;
};

export function DashboardFilters({
  dates,
  setDates,
  selectedMachineId,
  onMachineChange,
  machines,
  isMachinesLoading,
  canFilterBySector = false,
  selectedSectorId = '',
  onSectorChange,
  sectors = [],
  isSectorsLoading = false,
  sectorScopeLabel,
  typeMovimentPallet,
  onTypeMovimentPalletChange,
}: DashboardFiltersProps) {
  return (
    <div className="flex flex-col gap-3">
      {sectorScopeLabel && !canFilterBySector ? (
        <p className="text-sm text-zinc-600">
          Exibindo dados do setor{' '}
          <span className="font-medium text-zinc-800">{sectorScopeLabel}</span>.
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="flex min-w-[10rem] flex-1 flex-col gap-1.5 text-sm sm:max-w-[18rem]">
          <span className="font-medium text-zinc-700">Período</span>
          <DashboardDateRangePicker dates={dates} setDates={setDates} />
        </label>

        {canFilterBySector && onSectorChange ? (
          <label className="flex min-w-[10rem] flex-1 flex-col gap-1.5 text-sm sm:max-w-[18rem]">
            <span className="font-medium text-zinc-700">Setor</span>
            <SelectCombobox
              value={selectedSectorId}
              onValueChange={onSectorChange}
              disabled={isSectorsLoading}
              placeholder="Todos os setores"
              aria-label="Filtrar por setor"
              options={[
                { value: '', label: 'Todos os setores' },
                ...sectors.map((sector) => ({
                  value: sector.id,
                  label: sector.typeSector,
                })),
              ]}
            />
          </label>
        ) : null}

        {onTypeMovimentPalletChange ? (
          <label className="flex min-w-[10rem] flex-1 flex-col gap-1.5 text-sm sm:max-w-[16rem]">
            <span className="font-medium text-zinc-700">Equipamento</span>
            <SelectCombobox
              value={typeMovimentPallet ?? ''}
              onValueChange={(value) =>
                onTypeMovimentPalletChange(
                  value as ReplenishmentMovimentType | '',
                )
              }
              placeholder="Todos"
              aria-label="Filtrar por tipo de equipamento"
              searchable={false}
              options={[
                { value: '', label: 'Todos' },
                { value: 'FORKLIFT', label: 'Empilhadeira' },
                { value: 'ANY', label: 'Transpaleteira' },
              ]}
            />
          </label>
        ) : null}

        <label className="flex min-w-[12rem] flex-1 flex-col gap-1.5 text-sm sm:max-w-[20rem]">
          <span className="font-medium text-zinc-700">Máquina</span>
          <SelectCombobox
            value={selectedMachineId}
            onValueChange={onMachineChange}
            disabled={isMachinesLoading}
            placeholder="Todas as máquinas"
            aria-label="Filtrar por máquina"
            options={[
              { value: '', label: 'Todas as máquinas' },
              ...machines.map((machine) => ({
                value: machine.id,
                label: machine.name,
              })),
            ]}
          />
        </label>
      </div>
    </div>
  );
}

import AccordionLoader from '@/components/accordionLoader/accordion-loader';

import { DashboardFilters } from './DashboardFilters';
import { DashboardMachinesSection } from './DashboardMachinesSection';
import { useDashboardGeneralPage } from './useDashboardGeneralPage';

export function DashboardPorMaquinaPage() {
  const {
    data,
    isLoading,
    isFetching,
    dates,
    setDates,
    selectedMachineId,
    setSelectedMachineId,
    selectedSectorId,
    setSelectedSectorId,
    canFilterBySector,
    sectors,
    isSectorsLoading,
    sectorScopeLabel,
    leaderMissingSector,
    machines,
    isMachinesLoading,
    formattedDate,
    hasActiveFilters,
    clearFilters,
  } = useDashboardGeneralPage();

  return (
    <div className="flex flex-col gap-6 pb-2">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl md:text-3xl">
          Por máquina
        </h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-zinc-600">
          Retiradas, entregas e tempo médio por máquina
          {formattedDate ? (
            <>
              {' '}
              —{' '}
              <span className="font-medium text-zinc-800">{formattedDate}</span>
            </>
          ) : null}
          {isFetching ? (
            <span className="font-medium text-zinc-500"> (atualizando…)</span>
          ) : null}
          .
        </p>
      </div>

      {leaderMissingSector ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Seu usuário líder não está vinculado a um setor. Solicite ao
          administrador a correção do cadastro para visualizar o painel.
        </p>
      ) : (
        <>
          <DashboardFilters
            dates={dates}
            setDates={setDates}
            selectedMachineId={selectedMachineId}
            onMachineChange={setSelectedMachineId}
            machines={machines}
            isMachinesLoading={isMachinesLoading}
            canFilterBySector={canFilterBySector}
            selectedSectorId={selectedSectorId}
            onSectorChange={setSelectedSectorId}
            sectors={sectors}
            isSectorsLoading={isSectorsLoading}
            sectorScopeLabel={sectorScopeLabel}
            hasActiveFilters={hasActiveFilters}
            onClearFilters={clearFilters}
          />

          {isLoading ? (
            <div className="flex h-64 w-full items-center justify-center">
              <AccordionLoader />
            </div>
          ) : null}

          {!isLoading && data ? (
            <DashboardMachinesSection rows={data.machines} />
          ) : null}
        </>
      )}
    </div>
  );
}

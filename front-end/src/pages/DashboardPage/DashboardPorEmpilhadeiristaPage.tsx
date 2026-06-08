import AccordionLoader from '@/components/accordionLoader/accordion-loader';
import { DataTableCard } from '@/components/ui/table';
import { EmptyStateMessage } from '@/components/empty-state-message/empty-state-message';
import type { OperationalDashboardOperatorRow } from '@/services/operational-dashboard-api';

import { DashboardFilters } from './DashboardFilters';
import { useDashboardByOperatorPage } from './useDashboardByOperatorPage';

function formatDuration(ms: number | null | undefined) {
  if (ms == null) return '-';
  const minutes = ms / 60_000;
  if (minutes < 0.1) return '< 0,1 min';
  if (minutes < 10) return `${minutes.toFixed(1).replace('.', ',')} min`;
  return `${Math.round(minutes)} min`;
}

function OperatorsTableSection({
  rows,
}: {
  rows: OperationalDashboardOperatorRow[];
}) {
  return (
    <section aria-labelledby="dashboard-operators-heading">
      <div className="mb-3 min-w-0">
        <h2
          id="dashboard-operators-heading"
          className="m-0 text-base font-semibold text-zinc-900"
        >
          Por operador de transporte
        </h2>
      </div>
      <DataTableCard className="min-w-0 border-0 shadow-sm">
        <table className="w-full min-w-[48rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50/90">
              <th className="px-3 py-3 font-semibold text-zinc-700">
                Operador de transporte
              </th>
              <th className="px-3 py-3 font-semibold text-zinc-700">
                Retiradas
              </th>
              <th className="px-3 py-3 font-semibold text-zinc-700">
                Entregas
              </th>
              <th className="px-3 py-3 font-semibold text-zinc-700">
                Retiradas em aberto
              </th>
              <th className="px-3 py-3 font-semibold text-zinc-700">
                Entregas em aberto
              </th>
              <th className="px-3 py-3 font-semibold text-zinc-700">
                Média tempo retirada
              </th>
              <th className="px-3 py-3 font-semibold text-zinc-700">
                Média tempo entrega
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                  <EmptyStateMessage
                    title="Sem movimentações no período"
                    description="Não há tarefas atribuídas a empilhadeiristas para os filtros selecionados."
                  />
                </td>
              </tr>
            ) : (
              rows.map((operator) => (
                <tr
                  key={operator.operator_id}
                  className="border-b border-zinc-100 last:border-0"
                >
                  <td className="px-3 py-3 font-medium text-zinc-900">
                    {operator.operator_name}
                  </td>
                  <td className="px-3 py-3 tabular-nums text-zinc-700">
                    {operator.pickups_total}
                  </td>
                  <td className="px-3 py-3 tabular-nums text-zinc-700">
                    {operator.deliveries_total}
                  </td>
                  <td className="px-3 py-3 tabular-nums text-zinc-700">
                    {operator.pickups_open > 0 ? (
                      <span className="font-medium text-amber-700">
                        {operator.pickups_open}
                      </span>
                    ) : (
                      operator.pickups_open
                    )}
                  </td>
                  <td className="px-3 py-3 tabular-nums text-zinc-700">
                    {operator.deliveries_open > 0 ? (
                      <span className="font-medium text-amber-700">
                        {operator.deliveries_open}
                      </span>
                    ) : (
                      operator.deliveries_open
                    )}
                  </td>
                  <td className="px-3 py-3 tabular-nums text-zinc-700">
                    {formatDuration(operator.avg_pickup_duration_ms)}
                  </td>
                  <td className="px-3 py-3 tabular-nums text-zinc-700">
                    {formatDuration(operator.avg_delivery_duration_ms)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </DataTableCard>
    </section>
  );
}

export function DashboardPorEmpilhadeiristaPage() {
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
    typeMovimentPallet,
    setTypeMovimentPallet,
    machines,
    isMachinesLoading,
    formattedDate,
  } = useDashboardByOperatorPage();

  return (
    <div className="flex flex-col gap-6 pb-2">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl md:text-3xl">
          Por operador de movimentação
        </h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-zinc-600">
          Volume de retiradas e entregas por operador, follow-ups em aberto e
          tempos médios
          {formattedDate ? (
            <>
              {' '}
              —{' '}
              <span className="font-medium text-zinc-800">{formattedDate}</span>
            </>
          ) : null}
          {isFetching ? ' (atualizando...)' : null}.
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
            typeMovimentPallet={typeMovimentPallet}
            onTypeMovimentPalletChange={setTypeMovimentPallet}
          />

          {isLoading ? (
            <div className="flex h-64 w-full items-center justify-center">
              <AccordionLoader />
            </div>
          ) : null}

          {!isLoading && data ? (
            <OperatorsTableSection rows={data.operators} />
          ) : null}
        </>
      )}
    </div>
  );
}

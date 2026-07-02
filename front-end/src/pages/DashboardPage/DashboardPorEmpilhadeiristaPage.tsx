import { useState, type ReactNode } from 'react';
import AccordionLoader from '@/components/accordionLoader/accordion-loader';
import { DataTableCard } from '@/components/ui/table';
import { EmptyStateMessage } from '@/components/empty-state-message/empty-state-message';
import { Button } from '@/components/ui/brand-button';
import type { OperationalDashboardOperatorRow } from '@/services/operational-dashboard-api';
import { formatDurationMs } from '@/utils/formatDurationMs';

import { DashboardFilters } from './DashboardFilters';
import { OperatorCurrentTrajectoryDialog } from './OperatorCurrentTrajectoryDialog';
import { useDashboardByOperatorPage } from './useDashboardByOperatorPage';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Clock3,
  Forklift,
  Route,
  Timer,
  UserRound,
} from 'lucide-react';

function MobileStatGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div>
      <p className="m-0 mb-1.5 text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-400">
        {title}
      </p>
      <div className="grid grid-cols-2 gap-2">{children}</div>
    </div>
  );
}

function MobileStat({
  icon,
  iconClassName,
  label,
  value,
}: {
  icon: ReactNode;
  iconClassName: string;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-zinc-100 bg-zinc-50/70 px-3 py-2.5">
      <span
        className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${iconClassName}`}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="m-0 text-[0.7rem] font-medium leading-tight text-zinc-500">
          {label}
        </p>
        <p className="m-0 text-sm font-semibold leading-tight tabular-nums text-zinc-900">
          {value}
        </p>
      </div>
    </div>
  );
}

function OperatorMobileCard({
  operator,
  onViewTrajectory,
}: {
  operator: OperationalDashboardOperatorRow;
  onViewTrajectory: (operator: OperationalDashboardOperatorRow) => void;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2.5 pb-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
          <UserRound className="size-5" aria-hidden />
        </span>
        <h3 className="m-0 min-w-0 flex-1 truncate text-sm font-semibold text-zinc-900">
          {operator.operator_name}
        </h3>
      </div>

      <div className="flex flex-col gap-4">
        <MobileStatGroup title="Movimentações">
          <MobileStat
            icon={<ArrowDownLeft className="size-4" aria-hidden />}
            iconClassName="bg-red-100 text-red-600"
            label="Retiradas"
            value={operator.pickups_total}
          />
          <MobileStat
            icon={<ArrowUpRight className="size-4" aria-hidden />}
            iconClassName="bg-green-100 text-green-600"
            label="Entregas"
            value={operator.deliveries_total}
          />
        </MobileStatGroup>

        <MobileStatGroup title="Por equipamento">
          <MobileStat
            icon={<Forklift className="size-4" aria-hidden />}
            iconClassName="bg-blue-100 text-blue-600"
            label="Empilhadeira"
            value={operator.forklift_total}
          />
          <MobileStat
            icon={
              <img
                src="/PALLET_TRUCK.png"
                alt=""
                aria-hidden
                className="size-4 object-contain"
              />
            }
            iconClassName="bg-amber-100 text-amber-600"
            label="Transpaleteira"
            value={operator.pallet_truck_total}
          />
        </MobileStatGroup>

        <MobileStatGroup title="Tempo médio">
          <MobileStat
            icon={<Clock3 className="size-4" aria-hidden />}
            iconClassName="bg-zinc-200 text-zinc-600"
            label="Retirada"
            value={formatDurationMs(operator.avg_pickup_duration_ms)}
          />
          <MobileStat
            icon={<Timer className="size-4" aria-hidden />}
            iconClassName="bg-zinc-200 text-zinc-600"
            label="Entrega"
            value={formatDurationMs(operator.avg_delivery_duration_ms)}
          />
        </MobileStatGroup>
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-4 w-full justify-center gap-2"
        onClick={() => onViewTrajectory(operator)}
      >
        <Route className="size-3.5" aria-hidden />
        Visualizar trajeto atual
      </Button>
    </div>
  );
}

function OperatorsTableSection({
  rows,
}: {
  rows: OperationalDashboardOperatorRow[];
}) {
  const [trajectoryOperator, setTrajectoryOperator] =
    useState<OperationalDashboardOperatorRow | null>(null);

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

      {/* Mobile: blocos em coluna (a tabela é ruim em telas pequenas). */}
      <div className="flex flex-col gap-3 md:hidden">
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <EmptyStateMessage
              title="Sem movimentações no período"
              description="Não há tarefas atribuídas a operadores para os filtros selecionados."
            />
          </div>
        ) : (
          rows.map((operator) => (
            <OperatorMobileCard
              key={operator.operator_id}
              operator={operator}
              onViewTrajectory={setTrajectoryOperator}
            />
          ))
        )}
      </div>

      {/* Tablet e desktop: tabela. */}
      <DataTableCard className="hidden min-w-0 border-0 shadow-sm md:block">
        <table className="w-full min-w-[48rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50/90">
              <th className="px-3 py-3 font-semibold text-zinc-700">
                Operador de transporte
              </th>
              <th className="px-3 py-3 font-semibold text-zinc-700">
                <div className="flex items-center gap-2">
                  <ArrowDownLeft
                    className="size-4 rounded-full bg-red-200"
                    aria-hidden
                  />
                  Retiradas
                </div>
              </th>
              <th className="px-3 py-3 font-semibold text-zinc-700">
                <div className="flex items-center gap-2">
                  <ArrowUpRight
                    className="size-4 rounded-full bg-green-200"
                    aria-hidden
                  />
                  Entregas
                </div>
              </th>
              <th className="px-3 py-3 font-semibold text-zinc-700">
                <div className="flex items-center gap-2">
                  <Forklift className="size-4 text-blue-600" aria-hidden />
                  Empilhadeira
                </div>
              </th>
              <th className="px-3 py-3 font-semibold text-zinc-700">
                <div className="flex items-center gap-2">
                  <img
                    src="/PALLET_TRUCK.png"
                    alt=""
                    aria-hidden
                    className="size-4 object-contain"
                  />
                  Transpaleteira
                </div>
              </th>
              <th className="px-3 py-3 font-semibold text-zinc-700">
                Média tempo retirada
              </th>
              <th className="px-3 py-3 font-semibold text-zinc-700">
                Média tempo entrega
              </th>
              <th className="px-3 py-3 font-semibold text-zinc-700">
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-zinc-500">
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
                    {operator.forklift_total}
                  </td>
                  <td className="px-3 py-3 tabular-nums text-zinc-700">
                    {operator.pallet_truck_total}
                  </td>
                  <td className="px-3 py-3 tabular-nums text-zinc-700">
                    {formatDurationMs(operator.avg_pickup_duration_ms)}
                  </td>
                  <td className="px-3 py-3 tabular-nums text-zinc-700">
                    {formatDurationMs(operator.avg_delivery_duration_ms)}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="whitespace-nowrap"
                      onClick={() => setTrajectoryOperator(operator)}
                    >
                      <Route className="size-3.5" aria-hidden />
                      Visualizar trajeto atual
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </DataTableCard>

      <OperatorCurrentTrajectoryDialog
        open={trajectoryOperator !== null}
        operatorId={trajectoryOperator?.operator_id ?? null}
        operatorName={trajectoryOperator?.operator_name ?? ''}
        onClose={() => setTrajectoryOperator(null)}
      />
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
          Por operador de transporte
        </h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-zinc-600">
          Volume de retiradas e entregas por operador de transporte
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

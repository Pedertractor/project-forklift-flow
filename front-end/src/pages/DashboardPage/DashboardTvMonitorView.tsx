import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowLeft,
  ArrowUpFromLine,
  Boxes,
  Clock3,
  Forklift,
  Moon,
  PackageCheck,
  Sun,
  Timer,
  type LucideIcon,
} from 'lucide-react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { useNavigate } from 'react-router-dom';

import AccordionLoader from '@/components/accordionLoader/accordion-loader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { SelectCombobox } from '@/components/ui/select-combobox';
import { cn } from '@/lib/utils';
import type { OperationalTvMonitorSnapshot } from '@/services/operational-dashboard-api';
import type {
  DeliveryTaskListItem,
  PickupTaskListItem,
} from '@/types/machine-task.types';
import type { OperatorMachineSupplyRequestListItem } from '@/types/operator-machine.types';
import { OperatorMachineTasksList } from '@/pages/OperatorMachinePage/OperatorMachineTasksList';
import {
  buildOperatorMachineTaskRows,
  operatorMachineRowIsAccepted,
  operatorMachineRowSortTime,
  tasksForOperatorMachineRow,
} from '@/pages/OperatorMachinePage/operator-machine-display';
import type { DashboardTvMonitorPageViewModel } from './useDashboardTvMonitorPage';

const TV_THEME_STORAGE_KEY = 'forklift-tv-monitor-theme';

type TvTheme = 'dark' | 'light';

type MachineFlowBucket = {
  machineId: string;
  machineName: string;
  deliveryTasks: DeliveryTaskListItem[];
  pickupTasks: PickupTaskListItem[];
  supplyRequests: OperatorMachineSupplyRequestListItem[];
};

function groupFlowsByMachine(
  deliveryTasks: DeliveryTaskListItem[],
  pickupTasks: PickupTaskListItem[],
  supplyRequests: OperatorMachineSupplyRequestListItem[],
): MachineFlowBucket[] {
  const byMachine = new Map<string, MachineFlowBucket>();

  const ensure = (
    machineId: string,
    machineName: string,
  ): MachineFlowBucket => {
    let bucket = byMachine.get(machineId);
    if (!bucket) {
      bucket = {
        machineId,
        machineName,
        deliveryTasks: [],
        pickupTasks: [],
        supplyRequests: [],
      };
      byMachine.set(machineId, bucket);
    }
    return bucket;
  };

  for (const delivery of deliveryTasks) {
    ensure(
      delivery.machineId,
      delivery.machine?.name ?? delivery.machineId,
    ).deliveryTasks.push(delivery);
  }
  for (const pickup of pickupTasks) {
    ensure(
      pickup.machineId,
      pickup.machine?.name ?? pickup.machineId,
    ).pickupTasks.push(pickup);
  }
  for (const supply of supplyRequests) {
    ensure(
      supply.machineId,
      supply.machine?.name ?? supply.machineId,
    ).supplyRequests.push(supply);
  }

  return Array.from(byMachine.values())
    .filter(
      (bucket) =>
        buildOperatorMachineTaskRows(
          bucket.deliveryTasks,
          bucket.pickupTasks,
          bucket.supplyRequests,
        ).length > 0,
    )
    .sort((a, b) => a.machineName.localeCompare(b.machineName, 'pt-BR'));
}

const chartConfigEntregas = {
  entregas: {
    label: 'Entregas',
    color: '#4ade80',
  },
} satisfies ChartConfig;

const chartConfigRetiradas = {
  retiradas: {
    label: 'Retiradas',
    color: '#60a5fa',
  },
} satisfies ChartConfig;

function formatAvg(ms: number | null | undefined) {
  if (ms == null) return '—';
  const minutes = ms / 60_000;
  if (minutes < 1) {
    const seconds = ms / 1_000;
    if (seconds < 1) return '< 1 s';
    return `${Math.round(seconds)} s`;
  }
  if (minutes < 10) return `${minutes.toFixed(1).replace('.', ',')} min`;
  return `${Math.round(minutes)} min`;
}

function readStoredTheme(): TvTheme {
  try {
    const stored = localStorage.getItem(TV_THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    /* ignore */
  }
  return 'dark';
}

function TvKpiCard({
  icon: Icon,
  iconSrc,
  label,
  value,
  accent,
  dark,
}: {
  icon?: LucideIcon;
  iconSrc?: string;
  label: string;
  value: ReactNode;
  accent?: 'critical' | 'ok' | 'neutral';
  dark: boolean;
}) {
  return (
    <Card
      className={cn(
        'flex min-h-[3.75rem] min-w-0 items-center overflow-hidden rounded-xl border-0 p-2.5 shadow-sm',
        dark
          ? 'bg-gradient-to-br from-zinc-800/90 to-zinc-900/80'
          : 'bg-gradient-to-br from-white to-zinc-50/80',
        accent === 'ok' &&
          (dark
            ? 'from-emerald-950/40 to-zinc-900'
            : 'from-emerald-50 to-emerald-50/30'),
      )}
    >
      <div className="flex w-full items-center gap-2">
        <div
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-lg',
            accent === 'critical'
              ? 'bg-red-600 text-white'
              : accent === 'ok'
                ? dark
                  ? 'bg-emerald-950 text-emerald-300'
                  : 'bg-emerald-100 text-emerald-700'
                : dark
                  ? 'bg-sky-950/80 text-sky-300'
                  : 'bg-brand-100 text-brand',
          )}
        >
          {iconSrc ? (
            <img
              src={iconSrc}
              alt=""
              className="size-5 object-contain"
              aria-hidden
            />
          ) : Icon ? (
            <Icon className="size-4" strokeWidth={1.75} aria-hidden />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              'm-0 text-[0.6rem] font-semibold uppercase leading-tight tracking-wide',
              dark ? 'text-zinc-400' : 'text-zinc-500',
            )}
          >
            {label}
          </p>
          <p
            className={cn(
              'm-0 mt-0.5 text-lg font-bold tabular-nums leading-none sm:text-xl',
              dark ? 'text-zinc-50' : 'text-zinc-900',
            )}
          >
            {value}
          </p>
        </div>
      </div>
    </Card>
  );
}

function TvKpiColumn({
  title,
  dark,
  children,
}: {
  title: string;
  dark: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <p
        className={cn(
          'm-0 px-0.5 text-[0.65rem] font-bold uppercase tracking-wider',
          dark ? 'text-zinc-500' : 'text-zinc-400',
        )}
      >
        {title}
      </p>
      <div className="flex flex-col gap-1.5">{children}</div>
    </div>
  );
}

function TvPeakSeriesCard({
  dark,
  title,
  description,
  total,
  totalLabel,
  dataKey,
  data,
  config,
  fillId,
  strokeVar,
}: {
  dark: boolean;
  title: string;
  description: string;
  total: number;
  totalLabel: string;
  dataKey: 'entregas' | 'retiradas';
  data: { slot: string; entregas?: number; retiradas?: number }[];
  config: ChartConfig;
  fillId: string;
  strokeVar: string;
}) {
  return (
    <Card
      className={cn(
        'flex min-h-0 flex-1 flex-col gap-0 overflow-hidden border-0 py-0 shadow-sm',
        dark ? 'bg-zinc-900/70' : 'bg-white',
      )}
    >
      <CardHeader className="flex shrink-0 flex-row items-start justify-between gap-2 space-y-0 px-3 py-2 pb-1">
        <div className="min-w-0 space-y-0.5">
          <CardTitle
            className={cn(
              'text-sm sm:text-base',
              dark ? 'text-zinc-100' : 'text-zinc-900',
            )}
          >
            {title}
          </CardTitle>
          <p
            className={cn('m-0 text-xs', dark ? 'text-white' : 'text-zinc-500')}
          >
            {description}
          </p>
        </div>
        <p
          className={cn(
            'm-0 shrink-0 text-right text-[0.65rem] font-semibold uppercase tracking-wide tabular-nums',
            dark ? 'text-white/80' : 'text-zinc-900/70',
          )}
        >
          {totalLabel}{' '}
          <span className={cn('text-sm font-bold', dark && 'text-white')}>
            {total}
          </span>
        </p>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden px-2 pb-2 pt-0 sm:px-3">
        <div className="relative min-h-0 w-full flex-1 overflow-hidden">
          <ChartContainer
            config={config}
            className={cn(
              'absolute inset-0 !aspect-auto h-full w-full',
              dark && 'text-white',
            )}
          >
            <AreaChart
              data={data}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={strokeVar} stopOpacity={0.7} />
                  <stop offset="95%" stopColor={strokeVar} stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid
                vertical={false}
                stroke={dark ? '#3f3f46' : undefined}
              />
              <XAxis
                dataKey="slot"
                tickLine={false}
                axisLine={false}
                tickMargin={6}
                minTickGap={28}
                tick={{ fill: dark ? '#a1a1aa' : undefined, fontSize: 10 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                domain={[0, 'auto']}
                width={28}
                tick={{ fill: dark ? '#a1a1aa' : undefined, fontSize: 10 }}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="dot" />}
              />
              <Area
                dataKey={dataKey}
                type="monotone"
                baseValue={0}
                fill={`url(#${fillId})`}
                stroke={strokeVar}
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function TvPeakChart({
  data,
  dark,
}: {
  data: OperationalTvMonitorSnapshot;
  dark: boolean;
}) {
  const peakChartData = useMemo(
    () =>
      data.peak_slots.map((slot) => ({
        slot: slot.slot,
        retiradas: slot.pickups,
        entregas: slot.deliveries,
      })),
    [data.peak_slots],
  );

  const totals = useMemo(() => {
    let retiradas = 0;
    let entregas = 0;
    for (const slot of data.peak_slots) {
      retiradas += slot.pickups;
      entregas += slot.deliveries;
    }
    return { retiradas, entregas };
  }, [data.peak_slots]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 overflow-hidden">
      <TvPeakSeriesCard
        dark={dark}
        title="Picos — Entregas"
        description="Volume de entregas por intervalo de 30 min."
        total={totals.entregas}
        totalLabel="Entregas"
        dataKey="entregas"
        data={peakChartData}
        config={chartConfigEntregas}
        fillId="tvFillEntregas"
        strokeVar="var(--color-entregas)"
      />
      <TvPeakSeriesCard
        dark={dark}
        title="Picos — Retiradas"
        description="Volume de retiradas por intervalo de 30 min."
        total={totals.retiradas}
        totalLabel="Retiradas"
        dataKey="retiradas"
        data={peakChartData}
        config={chartConfigRetiradas}
        fillId="tvFillRetiradas"
        strokeVar="var(--color-retiradas)"
      />
    </div>
  );
}

export function DashboardTvMonitorView({
  data,
  isLoading,
  selectedSectorId,
  setSelectedSectorId,
  canFilterBySector,
  sectors,
  sectorScopeLabel,
  leaderMissingSector,
}: DashboardTvMonitorPageViewModel) {
  const navigate = useNavigate();
  const [theme, setTheme] = useState<TvTheme>(() => readStoredTheme());
  const dark = theme === 'dark';
  const kpis = data?.kpis;

  useEffect(() => {
    try {
      localStorage.setItem(TV_THEME_STORAGE_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const machineFlows = useMemo(() => {
    if (!data) return [];
    return groupFlowsByMachine(
      data.delivery_tasks ?? [],
      data.pickup_tasks ?? [],
      data.supply_requests ?? [],
    );
  }, [data]);

  /** Aceitas / follow-up no topo; depois por horário (aceite ou solicitação). */
  const sortedFlowItems = useMemo(() => {
    return machineFlows
      .flatMap((bucket) => {
        const rows = buildOperatorMachineTaskRows(
          bucket.deliveryTasks,
          bucket.pickupTasks,
          bucket.supplyRequests,
        );
        return rows.map((row) => ({ row, bucket }));
      })
      .sort((a, b) => {
        const aAccepted = operatorMachineRowIsAccepted(
          a.row,
          a.bucket.deliveryTasks,
          a.bucket.pickupTasks,
          a.bucket.supplyRequests,
        );
        const bAccepted = operatorMachineRowIsAccepted(
          b.row,
          b.bucket.deliveryTasks,
          b.bucket.pickupTasks,
          b.bucket.supplyRequests,
        );
        if (aAccepted !== bAccepted) {
          return aAccepted ? -1 : 1;
        }
        return (
          operatorMachineRowSortTime(
            a.row,
            a.bucket.deliveryTasks,
            a.bucket.pickupTasks,
            a.bucket.supplyRequests,
          ) -
          operatorMachineRowSortTime(
            b.row,
            b.bucket.deliveryTasks,
            b.bucket.pickupTasks,
            b.bucket.supplyRequests,
          )
        );
      });
  }, [machineFlows]);

  const flowCount = sortedFlowItems.length;

  return (
    <div
      className={cn(
        'flex h-full min-h-0 flex-col gap-2 px-3 py-3 sm:px-4 sm:py-4',
        dark ? 'bg-zinc-950 text-zinc-100' : 'bg-zinc-50 text-zinc-900',
      )}
    >
      {leaderMissingSector ? (
        <p
          className={cn(
            'rounded-xl border px-4 py-3 text-sm',
            dark
              ? 'border-amber-800 bg-amber-950/50 text-amber-200'
              : 'border-amber-200 bg-amber-50 text-amber-950',
          )}
        >
          Seu usuário líder não possui setor vinculado.
        </p>
      ) : null}

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center py-20">
          <AccordionLoader />
        </div>
      ) : null}

      {!isLoading && kpis ? (
        <>
          <div className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            <TvKpiColumn title="Entregas" dark={dark}>
              <TvKpiCard
                dark={dark}
                icon={ArrowDownToLine}
                label="Abertas"
                value={kpis.deliveries_open}
              />
              <TvKpiCard
                dark={dark}
                icon={PackageCheck}
                label="Concluídas"
                value={kpis.deliveries_completed}
                accent="ok"
              />
            </TvKpiColumn>

            <TvKpiColumn title="Retiradas" dark={dark}>
              <TvKpiCard
                dark={dark}
                icon={ArrowUpFromLine}
                label="Abertas"
                value={kpis.pickups_open}
              />
              <TvKpiCard
                dark={dark}
                icon={PackageCheck}
                label="Concluídas"
                value={kpis.pickups_completed}
                accent="ok"
              />
            </TvKpiColumn>

            <TvKpiColumn title="Frota" dark={dark}>
              <TvKpiCard
                dark={dark}
                icon={Forklift}
                label="Empilhadeiras"
                value={kpis.forklifts_operating}
              />
              <TvKpiCard
                dark={dark}
                iconSrc="/PALLET_TRUCK.png"
                label="Transpaleteiras"
                value={kpis.pallet_trucks_operating}
              />
            </TvKpiColumn>

            <TvKpiColumn title="Tempos médios" dark={dark}>
              <TvKpiCard
                dark={dark}
                icon={Timer}
                label="Abastecimento"
                value={formatAvg(kpis.avg_supply_ms)}
              />
              <TvKpiCard
                dark={dark}
                icon={Clock3}
                label="Retirada"
                value={formatAvg(kpis.avg_pickup_ms)}
              />
            </TvKpiColumn>

            <TvKpiColumn title="Operação" dark={dark}>
              <TvKpiCard
                dark={dark}
                icon={AlertTriangle}
                label="Críticos"
                value={kpis.critical_open}
                accent="critical"
              />
              <TvKpiCard
                dark={dark}
                icon={Boxes}
                label="Pallets no recebimento"
                value={kpis.pallets_at_receiving}
              />
            </TvKpiColumn>
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 overflow-hidden lg:grid-cols-[minmax(0,1.25fr)_minmax(16rem,1fr)]">
            {data ? (
              <div className="min-h-0 overflow-hidden">
                <TvPeakChart data={data} dark={dark} />
              </div>
            ) : null}

            <Card
              className={cn(
                'flex min-h-0 flex-col border-0 shadow-sm',
                dark ? 'bg-zinc-900/70' : 'bg-white',
              )}
            >
              <CardHeader className="py-2 pb-1">
                <CardTitle
                  className={cn(
                    'text-sm sm:text-base',
                    dark ? 'text-zinc-100' : 'text-zinc-900',
                  )}
                >
                  Fluxos em andamento
                  {flowCount > 0 ? (
                    <span
                      className={cn(
                        'ml-2 text-xs font-normal',
                        dark ? 'text-zinc-500' : 'text-zinc-500',
                      )}
                    >
                      {flowCount}
                    </span>
                  ) : null}
                </CardTitle>
              </CardHeader>
              <CardContent className="min-h-0 flex-1 overflow-y-auto px-2 pb-2 sm:px-3">
                {sortedFlowItems.length === 0 ? (
                  <p
                    className={cn(
                      'rounded-xl border border-dashed px-3 py-8 text-center text-xs',
                      dark
                        ? 'border-zinc-700 bg-zinc-900/50 text-zinc-500'
                        : 'border-zinc-200 bg-zinc-50 text-zinc-500',
                    )}
                  >
                    Nenhum fluxo aberto no momento.
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {sortedFlowItems.map(({ row, bucket }) => {
                      const scoped = tasksForOperatorMachineRow(
                        row,
                        bucket.deliveryTasks,
                        bucket.pickupTasks,
                        bucket.supplyRequests,
                      );
                      return (
                        <OperatorMachineTasksList
                          key={`${row.kind}-${row.id}`}
                          rows={[row]}
                          deliveryTasks={scoped.deliveryTasks}
                          pickupTasks={scoped.pickupTasks}
                          supplyRequests={scoped.supplyRequests}
                          loading={false}
                          error={null}
                          showMachineName
                          compact
                          dark={dark}
                          className="flex flex-col gap-2"
                        />
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}

      <footer
        className={cn(
          'mt-auto grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-xl border px-3 py-2',
          dark
            ? 'border-zinc-800 bg-zinc-900/90'
            : 'border-zinc-200 bg-white/95',
        )}
      >
        <div className="flex min-w-0 items-center gap-2 justify-self-start">
          <img
            src="/forklift-bg.png"
            alt=""
            className="size-9 shrink-0 object-contain object-center"
            aria-hidden
          />
          <span
            className={cn(
              'truncate text-sm font-bold uppercase tracking-wider text-brand',
            )}
          >
            Fork
          </span>
        </div>

        <div className="min-w-0 justify-self-center px-2 text-center">
          <p
            className={cn(
              'm-0 truncate text-sm font-light tracking-wide sm:text-base',
              dark ? 'text-zinc-300' : 'text-zinc-600',
            )}
          >
            <span>Pedertractor</span>
            <span
              className={cn(
                'mx-1.5 font-extralight',
                dark ? 'text-zinc-500' : 'text-zinc-400',
              )}
            >
              &
            </span>
            <span>TractorComponents</span>
          </p>
        </div>

        <div className="flex min-w-0 items-center justify-end gap-2 justify-self-end">
          {canFilterBySector ? (
            <div className="w-full max-w-[14rem] sm:w-56">
              <SelectCombobox
                id="tv-sector"
                value={selectedSectorId}
                onValueChange={setSelectedSectorId}
                placeholder="Todos os setores"
                aria-label="Filtrar setor"
                dark={dark}
                options={[
                  { value: '', label: 'Todos os setores' },
                  ...sectors.map((s) => ({
                    value: s.id,
                    label: s.typeSector,
                  })),
                ]}
              />
            </div>
          ) : sectorScopeLabel ? (
            <p
              className={cn(
                'm-0 max-w-[14rem] truncate rounded-xl border px-3 py-2 text-sm font-medium sm:max-w-[16rem]',
                dark
                  ? 'border-zinc-700 bg-zinc-800 text-zinc-100'
                  : 'border-zinc-200 bg-white text-zinc-800',
              )}
              title={`Setor: ${sectorScopeLabel}`}
            >
              {sectorScopeLabel}
            </p>
          ) : null}

          <button
            type="button"
            className={cn(
              'inline-flex size-9 shrink-0 items-center justify-center rounded-xl border transition-colors',
              dark
                ? 'border-zinc-700 bg-zinc-800 text-zinc-100 hover:bg-zinc-700'
                : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100',
            )}
            onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
            aria-label={dark ? 'Ativar modo claro' : 'Ativar modo escuro'}
            title={dark ? 'Modo claro' : 'Modo escuro'}
          >
            {dark ? (
              <Sun className="size-4" aria-hidden />
            ) : (
              <Moon className="size-4" aria-hidden />
            )}
          </button>

          <button
            type="button"
            className={cn(
              'inline-flex size-9 shrink-0 items-center justify-center rounded-xl border transition-colors',
              dark
                ? 'border-zinc-700 bg-zinc-800 text-zinc-100 hover:bg-zinc-700'
                : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100',
            )}
            onClick={() => navigate('/dashboard')}
            aria-label="Voltar"
            title="Voltar"
          >
            <ArrowLeft className="size-4" aria-hidden />
          </button>
        </div>
      </footer>
    </div>
  );
}

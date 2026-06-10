import { useMemo, type ReactNode } from 'react';
import {
  ArrowDownLeft,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowUpRight,
  Clock3,
  PieChart as PieChartIcon,
  Timer,
  type LucideIcon,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart as RechartsPieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { DataTableCard } from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import AccordionLoader from '@/components/accordionLoader/accordion-loader';
import { EmptyStateMessage } from '@/components/empty-state-message/empty-state-message';
import type {
  OperationalDashboardMachineRow,
  OperationalDashboardSnapshot,
} from '@/services/operational-dashboard-api';
import { formatDurationMs } from '@/utils/formatDurationMs';

type DashboardGeralViewProps = {
  data: OperationalDashboardSnapshot | undefined;
  isLoading: boolean;
  isFetching: boolean;
};

function formatDuration(ms: number | null | undefined) {
  if (ms == null) return '-';
  const minutes = ms / 60_000;
  if (minutes < 1) {
    const seconds = ms / 1_000;
    if (seconds < 1) return '< 1 s';
    if (seconds < 10) return `${seconds.toFixed(1).replace('.', ',')} s`;
    return `${Math.round(seconds)} s`;
  }
  if (minutes < 10) return `${minutes.toFixed(1).replace('.', ',')} min`;
  return `${Math.round(minutes)} min`;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '-';
  return new Date(value).toLocaleString('pt-BR');
}

const chartConfig = {
  retiradas: {
    label: 'Retiradas',
    color: '#2563eb',
  },
  entregas: {
    label: 'Entregas',
    color: '#16a34a',
  },
} satisfies ChartConfig;

const kpiCardClass =
  'relative flex h-full min-h-[132px] min-w-0 flex-col overflow-hidden rounded-2xl border-0 bg-gradient-to-br from-background to-muted/40 p-4 shadow-sm sm:min-h-[140px] sm:p-5';

function KpiIcon({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <div className="bg-brand-100 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg sm:h-10 sm:w-10">
      <Icon className="text-primary h-4 w-4 sm:h-5 sm:w-5" aria-hidden />
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  valueSuffix,
  subline,
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  valueSuffix?: string;
  subline?: ReactNode;
}) {
  return (
    <Card className={kpiCardClass}>
      <div className="flex w-full min-w-0 flex-col gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-2.5 sm:gap-3">
          <KpiIcon icon={icon} />
          <div className="min-w-0 flex-1 space-y-0.5 sm:space-y-1">
            <p className="text-muted-foreground text-[0.65rem] font-medium uppercase leading-tight tracking-wide sm:text-xs">
              {label}
            </p>
            <div className="text-foreground flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="text-2xl font-semibold leading-none tabular-nums sm:text-3xl">
                {value}
              </span>
              {valueSuffix != null && valueSuffix !== '' ? (
                <span className="text-muted-foreground shrink-0 text-xs">
                  {valueSuffix}
                </span>
              ) : null}
            </div>
            {subline != null ? (
              <div className="text-muted-foreground min-h-4 text-xs leading-4">
                {subline}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </Card>
  );
}

function MachinesTableSection({
  rows,
}: {
  rows: OperationalDashboardMachineRow[];
}) {
  return (
    <section aria-labelledby="dashboard-machines-heading">
      <div className="mb-3 min-w-0">
        <h2
          id="dashboard-machines-heading"
          className="m-0 text-base font-semibold text-zinc-900"
        >
          Por máquina
        </h2>
        <p className="mt-1 text-sm text-zinc-600">
          Retiradas, entregas e tempo médio da criação até a conclusão da
          tarefa.
        </p>
      </div>
      <DataTableCard className="min-w-0 border-0 shadow-sm">
        <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50/90">
              <th className="px-3 py-3 font-semibold text-zinc-700">Máquina</th>
              <th className="px-3 py-3 font-semibold text-zinc-700">
                <div className="flex items-center gap-2">
                  <ArrowDownLeft
                    className="size-4 rounded-full bg-red-200"
                    aria-hidden
                  />
                  Retiradas de paletes
                </div>
              </th>
              <th className="px-3 py-3 font-semibold text-zinc-700">
                <div className="flex items-center gap-2">
                  <ArrowUpRight
                    className="size-4 rounded-full bg-green-200"
                    aria-hidden
                  />
                  Entregas de paletes
                </div>
              </th>
              <th className="px-3 py-3 font-semibold text-zinc-700">
                Média tempo retirada de paletes
              </th>
              <th className="px-3 py-3 font-semibold text-zinc-700">
                Média tempo entrega de paletes
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                  <EmptyStateMessage
                    title="Sem movimentações no período"
                    description="Não há tarefas registradas para os filtros selecionados."
                  />
                </td>
              </tr>
            ) : (
              rows.map((machine) => (
                <tr
                  key={machine.machine_id}
                  className="border-b border-zinc-100 last:border-0"
                >
                  <td className="px-3 py-3 font-medium text-zinc-900">
                    {machine.machine_name}
                  </td>
                  <td className="px-3 py-3 tabular-nums text-zinc-700">
                    {machine.pickups_total}
                  </td>
                  <td className="px-3 py-3 tabular-nums text-zinc-700">
                    {machine.deliveries_total}
                  </td>
                  <td className="px-3 py-3 tabular-nums text-zinc-700">
                    {formatDurationMs(machine.avg_pickup_wait_ms)}
                  </td>
                  <td className="px-3 py-3 tabular-nums text-zinc-700">
                    {formatDurationMs(machine.avg_delivery_wait_ms)}
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

export function DashboardGeralView({
  data,
  isLoading,
  isFetching,
}: DashboardGeralViewProps) {
  const peakChartData = useMemo(
    () =>
      data?.peak_slots.map((slot) => ({
        slot: slot.slot,
        retiradas: slot.pickups,
        entregas: slot.deliveries,
      })) ?? [],
    [data?.peak_slots],
  );

  const runDistribution = useMemo(() => {
    if (!data) {
      return [{ name: 'Sem dados', value: 1, fill: '#a1a1aa' }];
    }

    const pickups = Math.max(0, data.counts.pickups);
    const deliveries = Math.max(0, data.counts.deliveries);
    const rows = [
      { name: 'Retiradas', value: pickups, fill: '#2563eb' },
      { name: 'Entregas', value: deliveries, fill: '#16a34a' },
    ];

    return rows.filter((item) => item.value > 0).length > 0
      ? rows.filter((item) => item.value > 0)
      : [{ name: 'Sem dados', value: 1, fill: '#a1a1aa' }];
  }, [data]);

  return (
    <>
      {isLoading ? (
        <div className="flex h-64 w-full items-center justify-center">
          <AccordionLoader />
        </div>
      ) : null}

      {!isLoading && data ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch lg:gap-5">
            <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
              <div className="auto-rows-fr grid w-full grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-5">
                <KpiCard
                  icon={Clock3}
                  label="Tempo médio — retirada de paletes"
                  value={formatDuration(data.pickup_wait.avg_wait_ms)}
                  subline={
                    data.pickup_wait.sample_size > 0 ? (
                      <span className="whitespace-nowrap">
                        P95 {formatDuration(data.pickup_wait.p95_wait_ms)}{' '}
                        {data.pickup_wait.sample_size} amostra(s)
                      </span>
                    ) : (
                      'Sem amostras no período'
                    )
                  }
                />

                <KpiCard
                  icon={Timer}
                  label="Tempo médio — entrega de paletes"
                  value={formatDuration(data.delivery_wait.avg_wait_ms)}
                  subline={
                    data.delivery_wait.sample_size > 0 ? (
                      <span className="whitespace-nowrap">
                        P95 {formatDuration(data.delivery_wait.p95_wait_ms)}{' '}
                        {data.delivery_wait.sample_size} amostra(s)
                      </span>
                    ) : (
                      'Sem amostras no período'
                    )
                  }
                />

                <KpiCard
                  icon={ArrowUpFromLine}
                  label="Retiradas"
                  value={data.counts.pickups}
                  valueSuffix="no período"
                />

                <KpiCard
                  icon={ArrowDownToLine}
                  label="Entregas"
                  value={data.counts.deliveries}
                  valueSuffix="no período"
                  subline={
                    <span className="inline-flex items-center whitespace-nowrap">
                      <span>Atualizado em {formatDateTime(data.now)}</span>
                      <span
                        className={
                          isFetching ? 'inline-block' : 'invisible inline-block'
                        }
                      >
                        {' '}
                        (atualizando...)
                      </span>
                    </span>
                  }
                />
              </div>

              <Card className="border-0 pt-0 shadow-sm">
                <CardHeader className="flex items-center gap-2 space-y-0 py-5 sm:flex-row">
                  <div className="grid flex-1 gap-1">
                    <CardTitle>Picos por intervalo de 30 minutos</CardTitle>
                    <CardDescription>
                      Solicitações de retirada e entregas disponíveis ao longo
                      do dia.
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
                  <ChartContainer
                    config={chartConfig}
                    className="aspect-auto h-[260px] w-full"
                  >
                    <AreaChart data={peakChartData}>
                      <defs>
                        <linearGradient
                          id="fillRetiradas"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="var(--color-retiradas)"
                            stopOpacity={0.7}
                          />
                          <stop
                            offset="95%"
                            stopColor="var(--color-retiradas)"
                            stopOpacity={0.1}
                          />
                        </linearGradient>
                        <linearGradient
                          id="fillEntregas"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="var(--color-entregas)"
                            stopOpacity={0.6}
                          />
                          <stop
                            offset="95%"
                            stopColor="var(--color-entregas)"
                            stopOpacity={0.08}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="slot"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        minTickGap={32}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                        domain={[0, 'auto']}
                      />
                      <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent indicator="dot" />}
                      />
                      <Area
                        dataKey="entregas"
                        type="monotone"
                        baseValue={0}
                        fill="url(#fillEntregas)"
                        stroke="var(--color-entregas)"
                        strokeWidth={2}
                      />
                      <Area
                        dataKey="retiradas"
                        type="monotone"
                        baseValue={0}
                        fill="url(#fillRetiradas)"
                        stroke="var(--color-retiradas)"
                        strokeWidth={2}
                      />
                      <ChartLegend content={<ChartLegendContent />} />
                    </AreaChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>

            <aside
              className="bg-card flex min-h-0 w-full flex-col gap-3 self-stretch rounded-2xl border-0 p-4 shadow-sm lg:w-[min(100%,22rem)] lg:shrink-0 xl:w-[23rem]"
              aria-label="Distribuição de retiradas e entregas"
            >
              <div className="shrink-0">
                <div className="flex items-center gap-2">
                  <PieChartIcon className="text-primary size-5 shrink-0" />
                  <h2 className="text-foreground text-lg font-semibold leading-tight">
                    Retiradas x entregas
                  </h2>
                </div>
                <p className="text-muted-foreground mt-1 text-xs">
                  Comparativo de volume no período filtrado.
                </p>
              </div>

              <div className="relative min-h-[240px] min-w-0 w-full flex-1">
                <div className="absolute inset-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={runDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius="40%"
                        outerRadius="70%"
                        paddingAngle={2}
                        dataKey="value"
                        stroke="none"
                      >
                        {runDistribution.map((entry, index) => (
                          <Cell
                            key={`${entry.name}-${index}`}
                            fill={entry.fill}
                          />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        formatter={(value: number, name: string) => {
                          const n = Number(value);
                          const total = Math.max(1, data.counts.total);
                          const pct = Math.round((n / total) * 100);
                          return [`${n} (${pct}%)`, name];
                        }}
                        contentStyle={{
                          backgroundColor: '#fff',
                          border: '1px solid #e4e4e7',
                          borderRadius: '8px',
                          color: '#18181b',
                        }}
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold tabular-nums sm:text-3xl">
                      {data.counts.total}
                    </span>
                    <span className="text-muted-foreground text-[10px] font-medium uppercase">
                      total
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-muted-foreground mt-auto shrink-0 text-xs">
                Passe o mouse sobre as fatias para ver quantidade e percentual.
              </p>
            </aside>
          </div>

          <MachinesTableSection rows={data.machines} />
        </div>
      ) : null}
    </>
  );
}

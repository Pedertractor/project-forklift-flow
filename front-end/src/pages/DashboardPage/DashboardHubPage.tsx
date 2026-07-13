import { BarChart3, MonitorPlay, Package, UsersRound } from 'lucide-react';
import { Link } from 'react-router-dom';

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

function ChoiceCard({
  to,
  title,
  description,
  icon: Icon,
}: {
  to: string;
  title: string;
  description: string;
  icon: typeof BarChart3;
}) {
  return (
    <Link
      to={to}
      className="block rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
    >
      <Card
        className={cn(
          'h-full rounded-2xl border border-zinc-200 bg-white shadow-sm transition-[box-shadow,transform] duration-200',
          'hover:-translate-y-0.5 hover:shadow-md',
        )}
      >
        <CardHeader className="gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1.5">
              <CardTitle className="text-lg font-semibold text-zinc-900">
                {title}
              </CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                {description}
              </CardDescription>
            </div>
            <div className="bg-brand-100 text-brand flex size-11 shrink-0 items-center justify-center rounded-xl">
              <Icon className="size-6" strokeWidth={1.5} aria-hidden />
            </div>
          </div>
        </CardHeader>
      </Card>
    </Link>
  );
}

export function DashboardHubPage() {
  return (
    <div className="flex min-h-[calc(100dvh-12rem)] flex-col gap-5 sm:min-h-[calc(100dvh-14rem)] sm:gap-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
            Painel operacional
          </h1>
          <p className="mt-1 text-sm text-zinc-600 sm:text-base">
            Escolha a visão: indicadores gerais do período, desempenho por
            máquina, por empilhadeirista ou o monitor ao vivo para TV.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
          <ChoiceCard
            to="/dashboard/geral"
            title="Geral"
            description="Tempo médio de ciclo, volume de retiradas e entregas e picos por horário."
            icon={BarChart3}
          />
          <ChoiceCard
            to="/dashboard/por-maquina"
            title="Por máquina"
            description="Retiradas, entregas e tempo médio por máquina no período filtrado."
            icon={Package}
          />
          <ChoiceCard
            to="/dashboard/por-empilhadeirista"
            title="Por operador"
            description="Quantidade de retiradas e entregas por operador, tarefas em aberto e filtros por equipamento."
            icon={UsersRound}
          />
          <ChoiceCard
            to="/dashboard/monitor"
            title="Monitor TV"
            description="Painel ao vivo com KPIs, gráfico de picos e fluxos em andamento — ideal para televisão."
            icon={MonitorPlay}
          />
        </div>
      </div>
    </div>
  );
}

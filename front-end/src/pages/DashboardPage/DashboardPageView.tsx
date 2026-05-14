import { Card } from '@/components/ui/card';
import type { DashboardPageViewModel } from './useDashboardPage';

export function DashboardPageView({ formattedToday }: DashboardPageViewModel) {
  return (
    <main className="px-4 py-8 max-[800px]:px-3">
      <div className="mx-auto w-full max-w-5xl">
        <header className="mb-6 flex flex-col gap-2 border-b border-zinc-200 pb-6">
          <h1 className="m-0 text-2xl font-bold tracking-tight text-zinc-900">Painel</h1>
          <p className="m-0 text-sm text-zinc-600">
            Área para indicadores e fluxos operacionais. Hoje:{' '}
            <span className="font-medium text-zinc-800">{formattedToday}</span>.
          </p>
        </header>

        <Card className="border border-dashed border-zinc-300 bg-white p-6 text-sm leading-relaxed text-zinc-600 shadow-sm">
          <p className="m-0">
            Os módulos de empilhadeira e armazém entram aqui. Esta rota usa o shell padrão:{' '}
            <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-xs text-zinc-800">MainLayout</code> com
            menu lateral, barra superior e área de conteúdo rolável.
          </p>
        </Card>
      </div>
    </main>
  );
}

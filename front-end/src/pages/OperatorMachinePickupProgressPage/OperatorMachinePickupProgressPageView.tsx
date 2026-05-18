import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { ENV } from '@/constants/env';
import { formatReplenishmentMovementCubeDisplay } from '@/constants/operator-machine-replenishment';
import { cn } from '@/lib/utils';
import type { OperatorPickupProgressPhase } from '@/types/operator-machine.types';
import type { OperatorMachinePickupProgressPageViewModel } from './useOperatorMachinePickupProgressPage';

type StepStatus = 'pending' | 'active' | 'done';

function stepStatusesForPhase(
  phase: OperatorPickupProgressPhase,
): StepStatus[] {
  switch (phase) {
    case 'DELIVERY_IN_PROGRESS':
      return ['active', 'pending', 'pending', 'pending', 'pending'];
    case 'AT_MACHINE_AWAITING_PICKUP':
      return ['done', 'active', 'pending', 'pending', 'pending'];
    case 'AWAITING_TRANSPORT_PICKUP':
      return ['done', 'done', 'active', 'pending', 'pending'];
    case 'TRANSPORT_ASSIGNED':
      return ['done', 'done', 'done', 'active', 'pending'];
    case 'TRANSPORT_REMOVING':
      return ['done', 'done', 'done', 'active', 'pending'];
    case 'PICKUP_FINISHED':
      return ['done', 'done', 'done', 'done', 'done'];
    default:
      return ['pending', 'pending', 'pending', 'pending', 'pending'];
  }
}

function phaseProgress(phase: OperatorPickupProgressPhase): {
  pct: number;
  headline: string;
} {
  switch (phase) {
    case 'DELIVERY_IN_PROGRESS':
      return {
        pct: 22,
        headline: 'O pallet ainda está a caminho ou sendo entregue na máquina.',
      };
    case 'AT_MACHINE_AWAITING_PICKUP':
      return {
        pct: 40,
        headline:
          'O material está na máquina. Quando estiver pronto para sair, use «Solicitar retirada» na lista de pedidos.',
      };
    case 'AWAITING_TRANSPORT_PICKUP':
      return {
        pct: 55,
        headline:
          'Retirada pedida — aguardando o operador de movimentação aceitar e buscar o pallet.',
      };
    case 'TRANSPORT_ASSIGNED':
      return {
        pct: 72,
        headline:
          'Um operador já aceitou a retirada e deve se dirigir à máquina.',
      };
    case 'TRANSPORT_REMOVING':
      return {
        pct: 88,
        headline:
          'Retirada em andamento — o pallet está sendo levado até a expedição.',
      };
    case 'PICKUP_FINISHED':
      return {
        pct: 100,
        headline:
          'Retirada concluída — o prisma foi retirado da máquina e o pedido foi encerrado.',
      };
    default:
      return {
        pct: 8,
        headline:
          'Acompanhe aqui o fluxo de retirada quando o pedido estiver «Na máquina» ou após solicitar a retirada.',
      };
  }
}

function StepRow({
  status,
  title,
  description,
  isLast,
}: {
  status: StepStatus;
  title: string;
  description: string;
  isLast: boolean;
}) {
  const done = status === 'done';
  const active = status === 'active';
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <span
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold',
            done
              ? 'border-emerald-500 bg-emerald-500 text-white'
              : active
                ? 'border-[#005fb8] bg-[#005fb8]/12 text-[#005fb8]'
                : 'border-zinc-200 bg-zinc-50 text-zinc-400',
          )}
          aria-hidden
        >
          {done ? '✓' : active ? '●' : ''}
        </span>
        {!isLast ? (
          <span
            className="mt-1 min-h-[1.25rem] w-px flex-1 bg-zinc-200"
            aria-hidden
          />
        ) : null}
      </div>
      <div className={cn('min-w-0', isLast ? 'pt-0.5' : 'pb-6 pt-0.5')}>
        <p className="m-0 text-sm font-semibold text-zinc-900">{title}</p>
        <p className="mt-1 text-sm leading-relaxed text-zinc-600">
          {description}
        </p>
      </div>
    </div>
  );
}

export function OperatorMachinePickupProgressPageView(
  vm: OperatorMachinePickupProgressPageViewModel,
) {
  const { requestId, apiReady, query } = vm;
  const data = query.data;
  const bar = data ? phaseProgress(data.phase) : { pct: 0, headline: '' };
  const steps = data
    ? stepStatusesForPhase(data.phase)
    : stepStatusesForPhase('OTHER');

  return (
    <main className="px-4 py-8 max-[800px]:px-3">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
        <Link
          to="/dobra"
          className="inline-flex h-[var(--control-height,2.5rem)] shrink-0 items-center justify-center gap-2 rounded-xl border-2 border-zinc-200 bg-white px-4 text-sm font-semibold whitespace-nowrap text-zinc-900 transition-colors hover:bg-zinc-50"
        >
          ← Voltar à máquina
        </Link>

        <header className="border-b border-zinc-200 pb-4">
          <h1 className="m-0 text-2xl font-bold tracking-tight text-zinc-900">
            Andamento da retirada
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Acompanhe o que acontece depois que você solicita a retirada do
            pallet na dobra.
          </p>
        </header>

        {!ENV.API_URL || !apiReady ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Faça login com a API ativa para ver o andamento.
          </p>
        ) : !requestId ? (
          <p className="text-sm text-red-700">Pedido inválido.</p>
        ) : query.isLoading ? (
          <p className="text-sm text-zinc-500">Carregando…</p>
        ) : query.isError ? (
          <p className="text-sm text-red-700">
            {query.error instanceof Error
              ? query.error.message
              : 'Erro ao carregar andamento.'}
          </p>
        ) : !data ? (
          <p className="text-sm text-zinc-500">Sem dados.</p>
        ) : (
          <>
            <Card className="border border-zinc-200 p-5 shadow-sm">
              <p className="m-0 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Prisma / pallet
              </p>
              <p className="mt-1 font-mono text-lg font-semibold text-zinc-900">
                {formatReplenishmentMovementCubeDisplay(
                  data.request.movementCube,
                )}
              </p>
              <p className="mt-3 text-sm text-zinc-600">
                Transporte previsto:{' '}
                <strong className="text-zinc-900">{data.transportLabel}</strong>
                .
              </p>
            </Card>

            <Card className="border border-zinc-200 p-5 shadow-sm">
              <p className="m-0 text-sm font-medium text-zinc-800">
                {bar.headline}
              </p>
              <div
                className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-100"
                role="progressbar"
                aria-valuenow={bar.pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Andamento da retirada"
              >
                <div
                  className="h-full rounded-full bg-[#005fb8] transition-[width] duration-500 ease-out"
                  style={{ width: `${bar.pct}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-zinc-500">
                Atualização automática a cada poucos segundos até a retirada
                concluir.
              </p>
            </Card>

            <Card className="border border-zinc-200 p-5 shadow-sm">
              <h2 className="m-0 text-sm font-semibold text-zinc-900">
                Etapas
              </h2>
              <div className="mt-4">
                <StepRow
                  status={steps[0]!}
                  title="Pallet a caminho da máquina"
                  description="O operador de movimentação leva o prisma até a dobra. O pedido costuma aparecer como «Em andamento»."
                  isLast={false}
                />
                <StepRow
                  status={steps[1]!}
                  title="Pallet na máquina"
                  description="O material chegou na dobra. Quando estiver pronto, solicite a retirada na lista de pedidos."
                  isLast={false}
                />
                <StepRow
                  status={steps[2]!}
                  title={`Aguardando ${data.transportLabel}`}
                  description="A retirada já foi pedida. O operador verá a tarefa na fila e poderá aceitar."
                  isLast={false}
                />
                <StepRow
                  status={steps[3]!}
                  title="Retirada em curso"
                  description={
                    data.phase === 'TRANSPORT_REMOVING'
                      ? 'O operador está retirando o pallet da máquina em direção à expedição.'
                      : 'Assim que a tarefa for aceita, o deslocamento até a máquina e a retirada física seguem aqui.'
                  }
                  isLast={false}
                />
                <StepRow
                  status={steps[4]!}
                  title="Prisma retirado da máquina"
                  description="A retirada foi registrada na expedição e o pedido foi concluído."
                  isLast
                />
              </div>
            </Card>
          </>
        )}
      </div>
    </main>
  );
}

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/card';
import { ENV } from '@/constants/env';
import { formatReplenishmentMovementCubeDisplay } from '@/constants/operator-machine-replenishment';
import {
  formatOperatorSupplyCreatedAt,
  operatorSupplyRequestStatusLabel,
} from '@/pages/OperatorMachinePage/operator-machine-requests.model';
import {
  priorityLevelLabel,
  requestStatusLabel,
} from '@/utils/replenishment-labels';
import type { SupplyPendingPreparationPageViewModel } from './useSupplyPendingPreparationPage';

function movementTypeLabel(t: string): string {
  return t === 'FORKLIFT' ? 'Empilhadeira' : 'Transpaleteira';
}

export function SupplyPendingPreparationPageView(
  vm: SupplyPendingPreparationPageViewModel,
) {
  const { apiReady, token, user, hasSector, pendingQuery, markMut } = vm;
  const pending = pendingQuery.data;
  const rows = pending?.requests ?? [];
  const operatorSupplyRows = pending?.operatorSupplyRequests ?? [];

  return (
    <main className="px-4 py-8 max-[800px]:px-3">
      <div className="mx-auto w-full max-w-6xl">
        <header className="mb-6 border-b border-zinc-200 pb-6">
          <h1 className="m-0 text-2xl font-bold tracking-tight text-zinc-900">
            Preparo pendente
          </h1>
          <p className="mt-1.5 text-sm text-zinc-600">
            Inclui avisos do operador de máquina (sem cubo) e pedidos de reposição
            em «Aguardando preparo». Para pedidos com cubo, ao concluir o preparo
            físico, marque <strong>pallet pronto</strong> para liberar na fila do
            transporte.
          </p>
        </header>

        {!ENV.API_URL ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Defina <code className="font-mono">VITE_API_URL</code> e faça login.
          </p>
        ) : !token ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Faça login com a API ativa.
          </p>
        ) : null}

        {!hasSector ? (
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            Seu usuário não tem <strong>setor</strong> vinculado. A API exige
            setor para listar preparos pendentes do chão. Solicite ao
            administrador o ajuste do cadastro.
          </p>
        ) : null}

        {pendingQuery.isError ? (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {pendingQuery.error instanceof Error
              ? pendingQuery.error.message
              : 'Erro ao carregar lista.'}
          </p>
        ) : null}

        {hasSector && user?.sector ? (
          <p className="mt-2 text-sm text-zinc-600">
            Setor:{' '}
            <span className="font-medium text-zinc-900">
              {user.sector.typeSector}
            </span>
          </p>
        ) : null}

        <h2 className="mt-8 mb-2 text-lg font-semibold tracking-tight text-zinc-900">
          Avisos do operador de máquina
        </h2>
        <p className="mb-3 text-sm text-zinc-600">
          Pedido de pallet sem cubo na dobra. Ao registrar a solicitação de reposição
          com cubo para a mesma máquina, o aviso é concluído automaticamente.
        </p>
        <Card className="overflow-x-auto border border-zinc-200 shadow-sm">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50/90">
                <th className="px-4 py-3 font-semibold text-zinc-700">Máquina</th>
                <th className="px-4 py-3 font-semibold text-zinc-700">Operador</th>
                <th className="px-4 py-3 font-semibold text-zinc-700">Enviada em</th>
                <th className="px-4 py-3 font-semibold text-zinc-700">Situação</th>
              </tr>
            </thead>
            <tbody>
              {!apiReady || !hasSector ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">
                    —
                  </td>
                </tr>
              ) : pendingQuery.isLoading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">
                    Carregando…
                  </td>
                </tr>
              ) : operatorSupplyRows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">
                    Nenhum aviso do operador no setor.
                  </td>
                </tr>
              ) : (
                operatorSupplyRows.map((row) => (
                  <tr key={row.id} className="border-b border-zinc-100 last:border-0">
                    <td className="px-4 py-3">
                      <div className="font-medium text-zinc-900">{row.machine.name}</div>
                      <div className="text-xs text-zinc-500">{row.machine.position}</div>
                    </td>
                    <td className="px-4 py-3 text-zinc-800">{row.requestedBy.name}</td>
                    <td className="px-4 py-3 text-zinc-700">
                      {formatOperatorSupplyCreatedAt(row.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-zinc-700">
                      {operatorSupplyRequestStatusLabel(row.status)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>

        <h2 className="mt-8 mb-2 text-lg font-semibold tracking-tight text-zinc-900">
          Pedidos aguardando preparo (cubo)
        </h2>
        <Card className="overflow-x-auto border border-zinc-200 shadow-sm">
          <table className="w-full min-w-[880px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50/90">
                <th className="px-4 py-3 font-semibold text-zinc-700">
                  Máquina destino
                </th>
                <th className="px-4 py-3 font-semibold text-zinc-700">
                  Cubo
                </th>
                <th className="px-4 py-3 font-semibold text-zinc-700">
                  Tipo mov.
                </th>
                <th className="px-4 py-3 font-semibold text-zinc-700">
                  Prioridade
                </th>
                <th className="px-4 py-3 font-semibold text-zinc-700">
                  Status
                </th>
                <th className="px-4 py-3 text-right font-semibold text-zinc-700">
                  Ação
                </th>
              </tr>
            </thead>
            <tbody>
              {!apiReady || !hasSector ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-zinc-500"
                  >
                    —
                  </td>
                </tr>
              ) : pendingQuery.isLoading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-zinc-500"
                  >
                    Carregando…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-zinc-500"
                  >
                    Nenhum preparo pendente no momento.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-zinc-100 last:border-0"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-zinc-900">
                        {row.destination.name}
                      </div>
                      <div className="text-xs text-zinc-500">
                        {row.destination.position}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-zinc-800">
                      {formatReplenishmentMovementCubeDisplay(row.movementCube)}
                    </td>
                    <td className="px-4 py-3 text-zinc-700">
                      {movementTypeLabel(row.typeMovimentPallet)}
                    </td>
                    <td className="px-4 py-3 text-zinc-700">
                      {priorityLevelLabel(row.priorityLevel)}
                    </td>
                    <td className="px-4 py-3 text-zinc-700">
                      {requestStatusLabel(row.status)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        type="button"
                        size="default"
                        className="h-9 min-w-0 px-3 text-xs"
                        disabled={!apiReady || markMut.isPending}
                        onClick={() => markMut.mutate(row.id)}
                        aria-label={`Marcar pallet pronto para ${row.destination.name}`}
                      >
                        {markMut.isPending
                          ? 'Salvando…'
                          : 'Marcar pallet pronto'}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>

        <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50/80 px-4 py-3 text-sm text-zinc-700">
          <p className="m-0 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Fluxo
          </p>
          <p className="mt-2 mb-0 leading-relaxed">
            Use também a lista em «Solicitações de reposição» para abrir pedidos
            antecipados ou ajustar prioridade. Cubos marcados como pronto entram
            na fila compatível com o tipo (empilhadeira ou transpaleteira).
          </p>
        </div>
      </div>
    </main>
  );
}

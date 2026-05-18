import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { formatReplenishmentMovementCubeDisplay } from '@/constants/operator-machine-replenishment';
import { cn } from '@/lib/utils';
import {
  priorityLevelLabel,
  requestStatusLabel,
} from '@/utils/replenishment-labels';
import {
  OPERATOR_MACHINE_REQUEST_FILTER_SELECT_CLASS,
  OPERATOR_MACHINE_REQUEST_STATUS_OPTIONS,
  formatOperatorSupplyCreatedAt,
  operatorMachineMovimentTypeLabel,
  operatorRequestShowsPickupProgress,
  operatorSupplyRequestStatusLabel,
  type OperatorMachineRequestsSectionProps,
} from './operator-machine-requests.model';

const linkOutlineClass =
  'inline-flex h-9 min-w-0 items-center justify-center rounded-xl border-2 border-zinc-200 bg-white px-3 text-xs font-semibold whitespace-nowrap text-zinc-900 transition-colors hover:bg-zinc-50';

export function OperatorMachineRequestsSection({
  machineBound,
  operatorSupplyQuery,
  requestsQuery,
  statusFilter,
  onStatusFilterChange,
  blockingFinalizeRequest,
  blockingOperatorSupply,
  canRequestPallet,
  finalizePending,
  busy,
  apiReady,
  onSolicitarPallet,
  onOpenPickupModal,
  pickupMutationPending,
}: OperatorMachineRequestsSectionProps) {
  const rows = requestsQuery.data ?? [];
  const supplyRows = operatorSupplyQuery.data ?? [];

  return (
    <section aria-labelledby="op-machine-requests-heading">
      <h2
        id="op-machine-requests-heading"
        className="mb-3 text-lg font-semibold tracking-tight text-zinc-900"
      >
        Pedidos e avisos à minha máquina
      </h2>

      <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          <Label htmlFor="op-req-status">Filtrar pedidos por status</Label>
          <select
            id="op-req-status"
            className={OPERATOR_MACHINE_REQUEST_FILTER_SELECT_CLASS}
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            disabled={!machineBound || busy}
          >
            {OPERATOR_MACHINE_REQUEST_STATUS_OPTIONS.map((opt) => (
              <option key={opt.value || 'all'} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex min-w-0 flex-col gap-2 lg:items-end">
          <Label htmlFor="op-req-solicitar">Sem pallet na dobra?</Label>
          <Button
            id="op-req-solicitar"
            type="button"
            disabled={
              !machineBound ||
              !apiReady ||
              !canRequestPallet ||
              finalizePending ||
              busy
            }
            onClick={onSolicitarPallet}
            className="w-full max-w-xs lg:w-auto"
          >
            {finalizePending ? 'Enviando…' : 'Solicitar pallet (abastecimento)'}
          </Button>
          {blockingOperatorSupply ? (
            <p className="m-0 max-w-md rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-950">
              Não é possível enviar outro aviso: já existe solicitação ao abastecimento em{' '}
              <strong>{operatorSupplyRequestStatusLabel(blockingOperatorSupply.status)}</strong>{' '}
              (enviada em{' '}
              <span className="font-medium">
                {formatOperatorSupplyCreatedAt(blockingOperatorSupply.createdAt)}
              </span>
              ).
            </p>
          ) : null}
          {blockingFinalizeRequest ? (
            <p className="m-0 max-w-md rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-950">
              Não é possível enviar agora: existe pedido de reposição em{' '}
              <strong>{requestStatusLabel(blockingFinalizeRequest.status)}</strong>
              {blockingFinalizeRequest.movementCube ? (
                <>
                  {' '}
                  (cubo:{' '}
                  <span className="font-mono">
                    {formatReplenishmentMovementCubeDisplay(
                      blockingFinalizeRequest.movementCube,
                    )}
                  </span>
                  )
                </>
              ) : null}
              .
            </p>
          ) : null}
          <p className="m-0 max-w-md text-xs leading-relaxed text-zinc-500">
            O aviso ao abastecimento fica numa solicitação própria; o cubo e a prioridade entram
            quando o setor registra o pedido de reposição.
          </p>
        </div>
      </div>

      <h3 className="mb-2 text-base font-semibold tracking-tight text-zinc-900">
        Solicitações ao abastecimento (sem cubo)
      </h3>
      <Card className="mb-8 overflow-x-auto border border-zinc-200 shadow-sm">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50/90">
              <th className="px-4 py-3 font-semibold text-zinc-700">Enviada em</th>
              <th className="px-4 py-3 font-semibold text-zinc-700">Situação</th>
              <th className="px-4 py-3 font-semibold text-zinc-700">Pedido de cubo</th>
            </tr>
          </thead>
          <tbody>
            {!machineBound ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-zinc-500">
                  Vincule uma máquina para ver as solicitações.
                </td>
              </tr>
            ) : operatorSupplyQuery.isLoading ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-zinc-500">
                  Carregando…
                </td>
              </tr>
            ) : operatorSupplyQuery.isError ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-red-700">
                  {operatorSupplyQuery.error instanceof Error
                    ? operatorSupplyQuery.error.message
                    : 'Erro ao carregar solicitações.'}
                </td>
              </tr>
            ) : supplyRows.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-zinc-500">
                  Nenhuma solicitação ao abastecimento registrada ainda.
                </td>
              </tr>
            ) : (
              supplyRows.map((row) => (
                <tr key={row.id} className="border-b border-zinc-100 last:border-0">
                  <td className="px-4 py-3 text-zinc-800">
                    {formatOperatorSupplyCreatedAt(row.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-zinc-700">
                    {operatorSupplyRequestStatusLabel(row.status)}
                  </td>
                  <td className="px-4 py-3 text-zinc-700">
                    {row.fulfilledByReplenishmentRequest ? (
                      <span className="font-mono text-sm">
                        {formatReplenishmentMovementCubeDisplay(
                          row.fulfilledByReplenishmentRequest.movementCube,
                        )}{' '}
                        <span className="text-xs text-zinc-500">
                          ({requestStatusLabel(row.fulfilledByReplenishmentRequest.status)})
                        </span>
                      </span>
                    ) : (
                      <span className="text-zinc-400">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      <h3 className="mb-2 text-base font-semibold tracking-tight text-zinc-900">
        Pedidos de reposição (cubo)
      </h3>
      <Card className="overflow-x-auto border border-zinc-200 shadow-sm">
        <table className="w-full min-w-[820px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50/90">
              <th className="px-4 py-3 font-semibold text-zinc-700">Cubo</th>
              <th className="px-4 py-3 font-semibold text-zinc-700">Tipo mov.</th>
              <th className="px-4 py-3 font-semibold text-zinc-700">Prioridade</th>
              <th className="px-4 py-3 font-semibold text-zinc-700">Status</th>
              <th className="px-4 py-3 text-right font-semibold text-zinc-700">Ações</th>
            </tr>
          </thead>
          <tbody>
            {!machineBound ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                  Vincule uma máquina para ver os pedidos.
                </td>
              </tr>
            ) : requestsQuery.isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                  Carregando…
                </td>
              </tr>
            ) : requestsQuery.isError ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-red-700">
                  {requestsQuery.error instanceof Error
                    ? requestsQuery.error.message
                    : 'Erro ao carregar pedidos.'}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                  Nenhum pedido para esta máquina com o filtro atual.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b border-zinc-100 last:border-0">
                  <td className="px-4 py-3 font-mono text-zinc-800">
                    {formatReplenishmentMovementCubeDisplay(row.movementCube)}
                  </td>
                  <td className="px-4 py-3 text-zinc-700">
                    {operatorMachineMovimentTypeLabel(row.typeMovimentPallet)}
                  </td>
                  <td className="px-4 py-3 text-zinc-700">
                    {priorityLevelLabel(row.priorityLevel)}
                  </td>
                  <td className="px-4 py-3 text-zinc-700">{requestStatusLabel(row.status)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-col items-end gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
                      {operatorRequestShowsPickupProgress(row.status) ? (
                        <Link
                          to={`/dobra/retirada/${row.id}`}
                          className={cn(linkOutlineClass)}
                        >
                          Ver andamento
                        </Link>
                      ) : null}
                      {row.status === 'ON_MACHINE' ? (
                        <Button
                          type="button"
                          size="default"
                          className="h-9 min-w-0 px-3 text-xs"
                          disabled={pickupMutationPending}
                          onClick={() => onOpenPickupModal(row.id)}
                          aria-label={`Solicitar retirada do cubo ${row.movementCube}`}
                        >
                          Solicitar retirada
                        </Button>
                      ) : !operatorRequestShowsPickupProgress(row.status) ? (
                        <span className="text-xs text-zinc-400">—</span>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </section>
  );
}

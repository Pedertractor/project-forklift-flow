import { Button } from '@/components/ui/Button';
import { ModalActions, SimpleModal } from '@/components/crud/SimpleModal';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ENV } from '@/constants/env';
import {
  priorityLevelLabel,
  requestStatusLabel,
} from '@/utils/replenishment-labels';
import type { ReplenishmentRequestsPageViewModel } from './useReplenishmentRequestsPage';
import { ReplenishmentEquipmentPanel } from './ReplenishmentEquipmentPanel';
import { CheckIcon } from 'lucide-react';

const selectClass =
  'flex h-[var(--control-height,2.5rem)] w-full rounded-xl border-2 border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition-colors focus-visible:border-[#005fb8] focus-visible:ring-[3px] focus-visible:ring-[#005fb8]/25';

function movementTypeLabel(t: string): string {
  return t === 'FORKLIFT' ? 'Empilhadeira' : 'Transpaleteira';
}

export function ReplenishmentRequestsPageView(
  vm: ReplenishmentRequestsPageViewModel,
) {
  const {
    apiReady,
    token,
    user,
    statusFilter,
    setStatusFilter,
    onlyMySector,
    setOnlyMySector,
    listQuery,
    visibleRequests,
    machinesForSelect,
    machinesEmpty,
    createOpen,
    setCreateOpen,
    editRow,
    setEditRow,
    deleteRow,
    setDeleteRow,
    detailRow,
    setDetailRow,
    destinationId,
    setDestinationId,
    movementCube,
    setMovementCube,
    typeMovimentPallet,
    setTypeMovimentPallet,
    priorityLevel,
    setPriorityLevel,
    palletReady,
    setPalletReady,
    openCreate,
    openEdit,
    createMut,
    updateMut,
    deleteMut,
    busy,
    createError,
    updateError,
    canDeleteRequest,
    canEditRequest,
    forklifts,
    palletTrucks,
    forkliftStats,
    palletTruckStats,
    equipmentQuery,
  } = vm;

  return (
    <main className="px-4 py-8 max-[800px]:px-3">
      <div className="mx-auto w-full max-w-[90rem]">
        <header className="mb-6 flex flex-col gap-4 border-b border-zinc-200 pb-6 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <div>
            <h1 className="m-0 text-2xl font-bold tracking-tight text-zinc-900">
              Solicitações de reposição
            </h1>
            <p className="mt-1.5 text-sm text-zinc-600">
              Abra pedidos para a máquina de destino, acompanhe status e edite
              enquanto o fluxo permitir.
            </p>
          </div>
          <Button
            type="button"
            onClick={openCreate}
            disabled={!apiReady || busy}
          >
            Nova solicitação
          </Button>
        </header>

        {!ENV.API_URL ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Defina <code className="font-mono">VITE_API_URL</code> e faça login.
          </p>
        ) : !token ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Faça login com a API ativa para acessar solicitações.
          </p>
        ) : null}

        {machinesEmpty ? (
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            Não há máquinas no seu setor para selecionar como destino. Cadastre
            máquinas de produção em «Máquinas de produção» no menu ou verifique
            se seu usuário tem setor vinculado.
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap items-end gap-4">
          <div className="min-w-48 space-y-2">
            <Label htmlFor="rr-status-filter">Status</Label>
            <select
              id="rr-status-filter"
              className={selectClass}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              disabled={!apiReady}
            >
              <option value="">Todos</option>
              <option value="AWAITING_PREPARATION">Aguardando preparo</option>
              <option value="PALLET_READY">Pallet pronto (fila)</option>
              <option value="CREATED">Criado</option>
              <option value="IN_PROGRESS">Em andamento</option>
              <option value="ON_MACHINE">Na máquina</option>
              <option value="COMPLETED">Concluído</option>
              <option value="CANCELED">Cancelado</option>
            </select>
          </div>
          {user?.sectorId ? (
            <label className="flex cursor-pointer items-center gap-2 pb-2 text-sm text-zinc-700">
              <input
                type="checkbox"
                checked={onlyMySector}
                onChange={(e) => setOnlyMySector(e.target.checked)}
                className="size-4 rounded border-zinc-300"
              />
              Mostrar apenas pedidos do meu setor
            </label>
          ) : null}
        </div>

        {listQuery.isError ? (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {listQuery.error instanceof Error
              ? listQuery.error.message
              : 'Erro ao carregar solicitações.'}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col gap-6 xl:flex-row xl:items-start">
          <Card className="min-w-0 flex-1 overflow-x-auto border border-zinc-200 shadow-sm">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50/90">
                  <th className="px-3 py-3 font-semibold text-zinc-700">
                    Destino
                  </th>
                  <th className="px-3 py-3 font-semibold text-zinc-700">
                    Prisma
                  </th>
                  <th className="px-3 py-3 font-semibold text-zinc-700">
                    Tipo mov.
                  </th>
                  <th className="px-3 py-3 font-semibold text-zinc-700">
                    Prioridade
                  </th>
                  <th className="px-3 py-3 font-semibold text-zinc-700">
                    Status
                  </th>
                  <th className="px-3 py-3 text-right font-semibold text-zinc-700">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {listQuery.isLoading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-zinc-500"
                    >
                      Carregando…
                    </td>
                  </tr>
                ) : visibleRequests.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-zinc-500"
                    >
                      Nenhuma solicitação neste filtro.
                    </td>
                  </tr>
                ) : (
                  visibleRequests.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-zinc-100 last:border-0"
                    >
                      <td className="px-3 py-3">
                        <div className="font-medium text-zinc-900">
                          {row.destination.name}
                        </div>
                        <div className="text-xs text-zinc-500">
                          {row.destination.sector.typeSector} ·{' '}
                          {row.destination.position}
                        </div>
                      </td>
                      <td className="px-3 py-3 font-mono text-zinc-800">
                        {row.movementCube}
                      </td>
                      <td className="px-3 py-3 text-zinc-700">
                        {movementTypeLabel(row.typeMovimentPallet)}
                      </td>
                      <td className="px-3 py-3 text-zinc-700">
                        <p
                          className={`${row.priorityLevel === 'VERY_HIGH' ? 'text-red-500' : row.priorityLevel === 'HIGH' ? 'text-yellow-500' : 'text-green-500'}`}
                        >
                          {priorityLevelLabel(row.priorityLevel)}
                        </p>
                      </td>
                      <td className="px-3 py-3 text-zinc-700">
                        <p
                          className={`flex items-center gap-2 ${row.status === 'CREATED' ? 'text-green-500' : row.status === 'IN_PROGRESS' ? 'text-yellow-500' : row.status === 'ON_MACHINE' ? 'text-blue-500' : row.status === 'COMPLETED' ? 'text-green-500' : row.status === 'CANCELED' ? 'text-red-500' : 'text-gray-500'}`}
                        >
                          {priorityLevelLabel(row.status) === 'COMPLETED' && (
                            <CheckIcon className="w-4 h-4" />
                          )}
                          {requestStatusLabel(row.status)}
                        </p>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="default"
                            className="h-9 min-w-0 px-2 text-xs"
                            disabled={!apiReady || busy}
                            onClick={() => setDetailRow(row)}
                          >
                            Detalhe
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="default"
                            className="h-9 min-w-0 px-2 text-xs"
                            disabled={!apiReady || busy || !canEditRequest(row)}
                            onClick={() => openEdit(row)}
                          >
                            Editar
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="default"
                            className="h-9 min-w-0 border-red-200 px-2 text-xs text-red-700 hover:bg-red-50"
                            disabled={
                              !apiReady || busy || !canDeleteRequest(row)
                            }
                            onClick={() => setDeleteRow(row)}
                          >
                            Excluir
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Card>

          <aside className="w-full shrink-0 xl:w-[22rem] 2xl:w-[26rem]">
            <ReplenishmentEquipmentPanel
              forklifts={forklifts}
              palletTrucks={palletTrucks}
              forkliftStats={forkliftStats}
              palletTruckStats={palletTruckStats}
              isLoading={equipmentQuery.isLoading}
              isError={equipmentQuery.isError}
              errorMessage={
                equipmentQuery.error instanceof Error
                  ? equipmentQuery.error.message
                  : undefined
              }
            />
          </aside>
        </div>
      </div>

      <SimpleModal
        open={createOpen}
        title="Nova solicitação de reposição"
        description="O tipo de movimentação deve coincidir com o equipamento (empilhadeira ou transpaleteira) que atenderá o pedido."
        onClose={() => (!busy ? setCreateOpen(false) : undefined)}
        footer={
          <ModalActions
            onCancel={() => !busy && setCreateOpen(false)}
            submitLabel={busy ? 'Salvando…' : 'Criar'}
            disabled={busy || machinesEmpty}
            onSubmit={() => createMut.mutate()}
          />
        }
      >
        {createError ? (
          <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {createError}
          </p>
        ) : null}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rr-dest">Máquina de destino</Label>
            <select
              id="rr-dest"
              className={selectClass}
              value={destinationId}
              onChange={(e) => setDestinationId(e.target.value)}
            >
              <option value="">Selecione…</option>
              {machinesForSelect.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} — {m.sector.typeSector}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="rr-cube">Código do prisma / pallet</Label>
            <Input
              id="rr-cube"
              value={movementCube}
              onChange={(e) => setMovementCube(e.target.value)}
              placeholder="Identificador físico do prisma"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rr-mov-type">Tipo de movimentação</Label>
            <select
              id="rr-mov-type"
              className={selectClass}
              value={typeMovimentPallet}
              onChange={(e) =>
                setTypeMovimentPallet(
                  e.target.value as 'FORKLIFT' | 'PALLET_TRUCK',
                )
              }
            >
              <option value="FORKLIFT">Empilhadeira</option>
              <option value="PALLET_TRUCK">Transpaleteira</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="rr-prio">Prioridade</Label>
            <select
              id="rr-prio"
              className={selectClass}
              value={priorityLevel}
              onChange={(e) =>
                setPriorityLevel(
                  e.target.value as 'VERY_HIGH' | 'HIGH' | 'NORMAL',
                )
              }
            >
              <option value="NORMAL">Normal</option>
              <option value="HIGH">Alta</option>
              <option value="VERY_HIGH">Muito alta</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={palletReady}
              onChange={(e) => setPalletReady(e.target.checked)}
              className="size-4 rounded border-zinc-300"
            />
            Pallet já pronto (liberar na fila do transporte sem passar por
            «aguardando preparo»)
          </label>
        </div>
      </SimpleModal>

      <SimpleModal
        open={Boolean(editRow)}
        title="Editar solicitação"
        onClose={() => (!busy ? setEditRow(null) : undefined)}
        footer={
          <ModalActions
            onCancel={() => !busy && setEditRow(null)}
            submitLabel={busy ? 'Salvando…' : 'Salvar'}
            disabled={busy}
            onSubmit={() => updateMut.mutate()}
          />
        }
      >
        {updateError ? (
          <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {updateError}
          </p>
        ) : null}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rr-edit-dest">Máquina de destino</Label>
            <select
              id="rr-edit-dest"
              className={selectClass}
              value={destinationId}
              onChange={(e) => setDestinationId(e.target.value)}
            >
              {machinesForSelect.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} — {m.sector.typeSector}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="rr-edit-cube">Código do prisma / pallet</Label>
            <Input
              id="rr-edit-cube"
              value={movementCube}
              onChange={(e) => setMovementCube(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rr-edit-mov">Tipo de movimentação</Label>
            <select
              id="rr-edit-mov"
              className={selectClass}
              value={typeMovimentPallet}
              onChange={(e) =>
                setTypeMovimentPallet(
                  e.target.value as 'FORKLIFT' | 'PALLET_TRUCK',
                )
              }
            >
              <option value="FORKLIFT">Empilhadeira</option>
              <option value="PALLET_TRUCK">Transpaleteira</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="rr-edit-prio">Prioridade</Label>
            <select
              id="rr-edit-prio"
              className={selectClass}
              value={priorityLevel}
              onChange={(e) =>
                setPriorityLevel(
                  e.target.value as 'VERY_HIGH' | 'HIGH' | 'NORMAL',
                )
              }
            >
              <option value="NORMAL">Normal</option>
              <option value="HIGH">Alta</option>
              <option value="VERY_HIGH">Muito alta</option>
            </select>
          </div>
        </div>
      </SimpleModal>

      <SimpleModal
        open={Boolean(deleteRow)}
        title="Excluir solicitação"
        description={
          deleteRow
            ? `Confirma a exclusão do pedido do prisma «${deleteRow.movementCube}» para ${deleteRow.destination.name}?`
            : undefined
        }
        onClose={() => (!busy ? setDeleteRow(null) : undefined)}
        footer={
          <ModalActions
            onCancel={() => !busy && setDeleteRow(null)}
            submitLabel={busy ? 'Excluindo…' : 'Excluir'}
            disabled={busy}
            danger
            onSubmit={() => deleteRow && deleteMut.mutate(deleteRow.id)}
          />
        }
      >
        {deleteMut.error instanceof Error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {deleteMut.error.message}
          </p>
        ) : null}
      </SimpleModal>

      <SimpleModal
        open={Boolean(detailRow)}
        title="Detalhe da solicitação"
        onClose={() => setDetailRow(null)}
        footer={
          <div className="flex justify-end">
            <Button
              type="button"
              variant="default"
              onClick={() => setDetailRow(null)}
            >
              Fechar
            </Button>
          </div>
        }
      >
        {detailRow ? (
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-xs font-medium text-zinc-500">ID</dt>
              <dd className="mt-0.5 break-all font-mono text-xs text-zinc-800">
                {detailRow.id}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-zinc-500">Solicitante</dt>
              <dd className="mt-0.5 text-zinc-900">
                {detailRow.requestedBy.name}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-zinc-500">Destino</dt>
              <dd className="mt-0.5 text-zinc-900">
                {detailRow.destination.name} ({detailRow.destination.position})
                — {detailRow.destination.sector.typeSector}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-zinc-500">Prisma</dt>
              <dd className="mt-0.5 font-mono text-zinc-900">
                {detailRow.movementCube}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-zinc-500">Status</dt>
              <dd className="mt-0.5 text-zinc-900">
                {requestStatusLabel(detailRow.status)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-zinc-500">
                Tarefas vinculadas
              </dt>
              <dd className="mt-0.5 text-zinc-900">
                {detailRow._count.movimentPalletTasks}
              </dd>
            </div>
          </dl>
        ) : null}
      </SimpleModal>
    </main>
  );
}

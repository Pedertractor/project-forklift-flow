import { Button } from '@/components/ui/brand-button';
import { ModalActions, SimpleModal } from '@/components/crud/SimpleModal';
import { ReplenishmentCreateWizardModal } from './ReplenishmentCreateWizardModal';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ENV } from '@/constants/env';
import { requestStatusLabel } from '@/utils/replenishment-labels';
import type { ReplenishmentMovimentType } from '@/types/replenishment-moviment.types';
import type { ReplenishmentRequestsPageViewModel } from './useReplenishmentRequestsPage';
import { ReplenishmentEquipmentSidebar } from './ReplenishmentEquipmentSidebar';
import { ReplenishmentRequestsTable } from './ReplenishmentRequestsTable';
import { DashboardDateRangePicker } from '@/pages/DashboardPage/DashboardDateRangePicker';
import { HistoryIcon, ListIcon, PanelRightOpen, PlusIcon } from 'lucide-react';
import { SelectCombobox } from '@/components/ui/select-combobox';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { hasAdminPrivileges } from '@/types/role.types';

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
    pendingPreparationCount,
    openRequests,
    historyOpen,
    setHistoryOpen,
    closeHistory,
    historyDates,
    setHistoryDates,
    historyRequests,
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
    isCritical,
    setIsCritical,
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

  const [equipmentSidebarOpen, setEquipmentSidebarOpen] = useState(false);
  const equipmentQueueTotal =
    forkliftStats.queuePending + palletTruckStats.queuePending;
  const equipmentReadyForQueueTotal =
    forkliftStats.readyForQueue + palletTruckStats.readyForQueue;

  const navigate = useNavigate();

  return (
    <main className="px-4 py-8 max-[800px]:px-3 max-[800px]:py-5">
      <div className="mx-auto w-full max-w-[90rem]">
        <header className="mb-6 flex flex-col gap-4 border-b border-zinc-200 pb-6 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="m-0 text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl">
              Reposição
            </h1>
            <p className="mt-1.5 text-sm text-zinc-600">
              Abra pedidos para a máquina de destino, acompanhe status e edite
              enquanto o fluxo permitir.
            </p>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <Button
              type="button"
              variant="outline"
              disabled={!apiReady}
              onClick={() => setEquipmentSidebarOpen(true)}
              className="h-10 w-full gap-2 border-zinc-200 sm:h-9 sm:w-auto"
            >
              <PanelRightOpen className="size-4 shrink-0" aria-hidden />
              <span className="">Equipamentos</span>
              {apiReady &&
              (equipmentQueueTotal > 0 || equipmentReadyForQueueTotal > 0) ? (
                <span className="inline-flex items-center gap-1 text-xs font-normal text-zinc-600">
                  {equipmentReadyForQueueTotal > 0 ? (
                    <span className="rounded-full bg-sky-100 px-1.5 py-0.5 font-semibold text-sky-900">
                      {equipmentReadyForQueueTotal} livre
                    </span>
                  ) : null}
                  {equipmentQueueTotal > 0 ? (
                    <span className="rounded-full bg-brand/10 px-1.5 py-0.5 font-semibold text-brand">
                      {equipmentQueueTotal} fila
                    </span>
                  ) : null}
                </span>
              ) : null}
            </Button>
          </div>
        </header>

        {!ENV.API_URL ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Defina <code className="font-mono">VITE_BASE_URL_API</code> e faça login.
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

        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <div className="flex w-full flex-col gap-4 sm:w-auto sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1 space-y-2 sm:min-w-48 sm:flex-none">
              <Label htmlFor="rr-status-filter">Status</Label>
              <SelectCombobox
                id="rr-status-filter"
                value={statusFilter}
                onValueChange={setStatusFilter}
                disabled={!apiReady}
                placeholder="Todos"
                options={[
                  { value: '', label: 'Todos' },
                  { value: 'PALLET_READY', label: 'Pallet no recebimento' },
                  { value: 'CREATED', label: 'Criado' },
                  { value: 'IN_PROGRESS', label: 'Em andamento' },
                  { value: 'ON_MACHINE', label: 'Na máquina' },
                  { value: 'COMPLETED', label: 'Concluído' },
                  { value: 'CANCELED', label: 'Cancelado' },
                ]}
              />
            </div>
            {hasAdminPrivileges(user?.role) ? (
              <label className="flex cursor-pointer items-center gap-2 pb-0 text-sm text-zinc-700 sm:pb-2">
                <input
                  type="checkbox"
                  checked={onlyMySector}
                  onChange={(e) => setOnlyMySector(e.target.checked)}
                  className="size-4 rounded border-zinc-300"
                />
                Mostrar apenas pedidos do meu setor
              </label>
            ) : null}
            <Button
              type="button"
              variant="outline"
              className="h-10 w-full shrink-0 whitespace-nowrap sm:h-9 sm:w-auto"
              disabled={
                !apiReady ||
                (statusFilter === '' &&
                  (!hasAdminPrivileges(user?.role) || onlyMySector))
              }
              onClick={() => {
                setStatusFilter('');
                setOnlyMySector(true);
              }}
            >
              Limpar filtros
            </Button>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <Button
              type="button"
              className="h-10 w-full justify-center gap-2 px-3 text-xs sm:h-9 sm:w-auto"
              onClick={openCreate}
              disabled={!apiReady || busy}
            >
              <PlusIcon className="size-4 shrink-0" />
              <span className="sm:hidden">Novo pallet</span>
              <span className="hidden sm:inline">
                Novo pallet para reposição
              </span>
            </Button>
            <Button
              size="default"
              className="h-10 w-full justify-center gap-2 px-3 text-xs sm:h-9 sm:w-auto"
              disabled={!apiReady}
              onClick={() => navigate('/abastecimento/preparo-pendente')}
            >
              {pendingPreparationCount > 0 ? (
                <span
                  className="min-w-[1.25rem] rounded-2xl bg-red-500 px-1.5 py-0.5 text-center text-[0.6875rem] font-bold leading-none text-white"
                  aria-label={`${pendingPreparationCount} solicitações aguardando preparo`}
                >
                  {pendingPreparationCount}
                </span>
              ) : null}
              <ListIcon className="size-4 shrink-0" />
              <span className="sm:hidden">Ver solicitações</span>
              <span className="hidden sm:inline">
                Ver solicitações de reposição
              </span>
            </Button>
          </div>
        </div>

        {listQuery.isError ? (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {listQuery.error instanceof Error
              ? listQuery.error.message
              : 'Erro ao carregar solicitações.'}
          </p>
        ) : null}

        <section className="mt-6" aria-labelledby="rr-open-requests-heading">
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2
                id="rr-open-requests-heading"
                className="m-0 text-base font-semibold text-zinc-900"
              >
                Solicitações em aberto
              </h2>
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={!apiReady}
              onClick={() => setHistoryOpen(true)}
              className="h-10 w-full shrink-0 gap-2 border-zinc-200 sm:ml-auto sm:h-9 sm:w-auto"
              aria-label="Ver histórico completo de solicitações"
            >
              <HistoryIcon className="size-4 shrink-0" aria-hidden />
              Ver histórico completo
            </Button>
          </div>
          <ReplenishmentRequestsTable
            variant="open"
            rows={openRequests}
            isLoading={listQuery.isLoading}
            emptyMessage="Nenhuma solicitação em aberto neste filtro."
            onRowClick={setDetailRow}
          />
        </section>
      </div>

      <SimpleModal
        open={historyOpen}
        title="Histórico de solicitações"
        description="Todas as solicitações de retirada para máquina, incluindo concluídas e canceladas."
        panelClassName="max-w-[min(96vw,72rem)]"
        onClose={closeHistory}
        footer={
          <div className="flex justify-end">
            <Button type="button" variant="default" onClick={closeHistory}>
              Fechar
            </Button>
          </div>
        }
      >
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <label className="flex min-w-[10rem] flex-1 flex-col gap-1.5 text-sm sm:max-w-[18rem]">
            <span className="font-medium text-zinc-700">Período</span>
            <DashboardDateRangePicker
              id="rr-history-period"
              dates={historyDates}
              setDates={setHistoryDates}
            />
          </label>
          {historyDates.length > 0 ? (
            <Button
              type="button"
              variant="outline"
              className="h-10 w-full sm:h-9 sm:w-auto"
              onClick={() => setHistoryDates([])}
            >
              Limpar período
            </Button>
          ) : null}
        </div>
        <ReplenishmentRequestsTable
          variant="history"
          rows={historyRequests}
          isLoading={listQuery.isLoading}
          emptyMessage={
            historyDates.length > 0
              ? 'Nenhuma solicitação neste período.'
              : 'Nenhuma solicitação neste filtro.'
          }
          onRowClick={(row) => {
            closeHistory();
            setDetailRow(row);
          }}
        />
      </SimpleModal>

      <ReplenishmentEquipmentSidebar
        open={equipmentSidebarOpen}
        onOpenChange={setEquipmentSidebarOpen}
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

      <ReplenishmentCreateWizardModal
        open={createOpen}
        busy={busy}
        machinesEmpty={machinesEmpty}
        machines={machinesForSelect}
        destinationId={destinationId}
        setDestinationId={setDestinationId}
        movementCube={movementCube}
        setMovementCube={setMovementCube}
        typeMovimentPallet={typeMovimentPallet}
        setTypeMovimentPallet={setTypeMovimentPallet}
        isCritical={isCritical}
        setIsCritical={setIsCritical}
        createError={createError}
        onClose={() => setCreateOpen(false)}
        onSubmit={() => createMut.mutate()}
      />

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
            <SelectCombobox
              id="rr-edit-dest"
              value={destinationId}
              onValueChange={setDestinationId}
              options={machinesForSelect.map((m) => ({
                value: m.id,
                label: `${m.name} — ${m.sector.typeSector}`,
              }))}
            />
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
            <SelectCombobox
              id="rr-edit-mov"
              value={typeMovimentPallet}
              onValueChange={(value) =>
                setTypeMovimentPallet(value as ReplenishmentMovimentType)
              }
              searchable={false}
              options={[
                { value: 'FORKLIFT', label: 'Empilhadeira' },
                {
                  value: 'ANY',
                  label: 'Qualquer tipo (empilhadeira ou transpaleteira)',
                },
              ]}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rr-edit-prio">Prioridade</Label>
            <SelectCombobox
              id="rr-edit-prio"
              value={priorityLevel}
              onValueChange={(value) =>
                setPriorityLevel(value as 'VERY_HIGH' | 'HIGH' | 'NORMAL')
              }
              searchable={false}
              options={[
                { value: 'NORMAL', label: 'Normal' },
                { value: 'HIGH', label: 'Alta' },
                { value: 'VERY_HIGH', label: 'Muito alta' },
              ]}
            />
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
          <div className="flex flex-wrap justify-end gap-2">
            {detailRow && canEditRequest(detailRow) ? (
              <Button
                type="button"
                variant="outline"
                disabled={!apiReady || busy}
                onClick={() => {
                  const row = detailRow;
                  setDetailRow(null);
                  openEdit(row);
                }}
              >
                Editar
              </Button>
            ) : null}
            {detailRow && canDeleteRequest(detailRow) ? (
              <Button
                type="button"
                variant="outline"
                className="border-red-200 text-red-700 hover:bg-red-50"
                disabled={!apiReady || busy}
                onClick={() => {
                  const row = detailRow;
                  setDetailRow(null);
                  setDeleteRow(row);
                }}
              >
                Excluir
              </Button>
            ) : null}
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
              <dt className="text-xs font-medium text-zinc-500">Solicitante</dt>
              <dd className="mt-0.5 text-zinc-900">
                {detailRow.requestedBy.name}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-zinc-500">Destino</dt>
              <dd className="mt-0.5 text-zinc-900">
                {detailRow.destination.name}—{' '}
                {detailRow.destination.sector.typeSector}
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

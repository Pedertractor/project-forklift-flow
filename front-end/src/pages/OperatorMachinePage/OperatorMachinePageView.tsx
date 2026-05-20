import { Button } from '@/components/ui/Button';
import { ModalActions, SimpleModal } from '@/components/crud/SimpleModal';
import { Card } from '@/components/ui/card';
import { MachineOperationSelectGrid } from '@/components/machines/MachineOperationSelectGrid';
import { ENV } from '@/constants/env';
import { formatReplenishmentMovementCubeDisplay } from '@/constants/operator-machine-replenishment';
import { typeMachineImageSrc } from '@/pages/TypeMachinesPage/useTypeMachinesPage';
import { requestStatusLabel } from '@/utils/replenishment-labels';
import type { OperatorMachinePageViewModel } from './useOperatorMachinePage';
import { OperatorMachineOperationGrid } from './OperatorMachineOperationGrid';
import { Undo2Icon } from 'lucide-react';

export function OperatorMachinePageView(vm: OperatorMachinePageViewModel) {
  const {
    apiReady,
    hasSector,
    myMachineQuery,
    current,
    showMachinePicker,
    setShowMachinePicker,
    machinesQuery,
    machines,
    selectedMachineId,
    selectMachine,
    bindPending,
    operatorSupplyQuery,
    requestsQuery,
    openOperatorSupply,
    supplyFlowReplenishment,
    pickupPanelReplenishment,
    pickupProgressQuery,
    pickupPhase,
    pickupTransportLabel,
    canRequestPallet,
    endShiftOpen,
    setEndShiftOpen,
    unbindMut,
    finalizeMut,
    pickupTargetId,
    setPickupTargetId,
    pickupMut,
    pickupRow,
    busy,
  } = vm;

  const pickingMachine = showMachinePicker || !current;

  return (
    <main className="px-4 py-8 max-[800px]:px-3">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-zinc-200 pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="m-0 text-2xl font-bold tracking-tight text-zinc-900">
              {pickingMachine
                ? 'Selecionar máquina de dobra'
                : 'Operação na máquina'}
            </h1>
            <p className="mt-1 text-sm text-zinc-600">
              {pickingMachine
                ? 'Toque na máquina em que você está operando para abrir o painel de operação.'
                : 'Acompanhe sua solicitação ao abastecimento e o pedido de reposição do prisma.'}
            </p>
          </div>
        </header>

        {!ENV.API_URL ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Defina <code className="font-mono">VITE_API_URL</code> e faça login.
          </p>
        ) : null}

        {pickingMachine ? (
          <>
            {!hasSector ? (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                Seu usuário não tem <strong>setor</strong> vinculado. Solicite
                ao administrador o ajuste do cadastro.
              </p>
            ) : null}

            <section aria-labelledby="op-select-machine-heading">
              <h2
                id="op-select-machine-heading"
                className="mb-3 text-lg font-semibold tracking-tight text-zinc-900"
              >
                Máquinas do seu setor
              </h2>

              {machinesQuery.isLoading || myMachineQuery.isLoading ? (
                <p className="text-sm text-zinc-500">Carregando máquinas…</p>
              ) : machinesQuery.isError ? (
                <p className="text-sm text-red-700">
                  {machinesQuery.error instanceof Error
                    ? machinesQuery.error.message
                    : 'Erro ao carregar máquinas.'}
                </p>
              ) : (
                <MachineOperationSelectGrid
                  machines={machines}
                  selectedId={selectedMachineId}
                  onSelect={selectMachine}
                  disabled={bindPending}
                  ariaLabel="Máquina para operação"
                />
              )}
              {bindPending ? (
                <p className="mt-4 text-center text-sm text-zinc-500">
                  Vinculando máquina…
                </p>
              ) : null}
            </section>
          </>
        ) : (
          <>
            {current ? (
              <Card className="flex items-center gap-3 border border-zinc-200 p-4 shadow-sm">
                {current.typeMachine.urlImage?.trim() ? (
                  <img
                    src={typeMachineImageSrc(current.typeMachine.urlImage)}
                    alt=""
                    className="size-16 shrink-0 rounded-lg border border-zinc-200 object-cover"
                  />
                ) : (
                  <div
                    className="flex size-16 shrink-0 items-center justify-center rounded-lg border border-dashed border-zinc-200 bg-zinc-50 text-xs text-zinc-400"
                    aria-hidden
                  >
                    —
                  </div>
                )}
                <div className="flex w-full items-center justify-between">
                  <div className="flex flex-col gap-2">
                    <p className="m-0 text-xs font-medium uppercase tracking-wide text-zinc-500">
                      Máquina em operação
                    </p>
                    <p className="m-0 truncate text-lg font-bold text-zinc-900">
                      {current.name}
                    </p>
                    <p className="mt-0.5 text-sm text-zinc-600">
                      {current.typeMachine.name} · {`Posição: ${current.position}`}
                    </p>
                  </div>
                  {current && !pickingMachine ? (
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="border-red-200 text-red-700 hover:bg-red-50"
                        disabled={!apiReady || busy}
                        onClick={() => setEndShiftOpen(true)}
                      >
                        <Undo2Icon className="size-4" />
                        Sair da máquina
                      </Button>
                    </div>
                  ) : null}
                </div>
              </Card>
            ) : myMachineQuery.isLoading ? (
              <p className="text-sm text-zinc-500">Carregando máquina…</p>
            ) : null}

            <OperatorMachineOperationGrid
              supplyLoading={operatorSupplyQuery.isLoading}
              supplyError={operatorSupplyQuery.error ?? null}
              openSupply={openOperatorSupply}
              replenishmentLoading={requestsQuery.isLoading}
              replenishmentError={requestsQuery.error ?? null}
              supplyFlowReplenishment={supplyFlowReplenishment}
              pickupPanelReplenishment={pickupPanelReplenishment}
              pickupProgressLoading={pickupProgressQuery.isLoading}
              pickupPhase={pickupPhase}
              pickupTransportLabel={pickupTransportLabel}
              canRequestPallet={canRequestPallet}
              finalizePending={finalizeMut.isPending}
              pickupMutationPending={pickupMut.isPending}
              busy={busy}
              apiReady={apiReady}
              onSolicitarPallet={() => finalizeMut.mutate()}
              onSolicitarRetirada={() => {
                if (pickupPanelReplenishment?.id) {
                  setPickupTargetId(pickupPanelReplenishment.id);
                }
              }}
            />
          </>
        )}
      </div>

      <SimpleModal
        open={endShiftOpen}
        onClose={() => setEndShiftOpen(false)}
        title="Encerrar vínculo com a máquina"
        description="Use ao fim do turno. Você poderá escolher outra máquina na mesma tela."
        footer={
          <ModalActions
            onCancel={() => setEndShiftOpen(false)}
            submitLabel={
              unbindMut.isPending ? 'Encerrando…' : 'Encerrar vínculo'
            }
            onSubmit={() => unbindMut.mutate()}
            disabled={unbindMut.isPending}
            danger
          />
        }
      >
        <p className="m-0 text-sm text-zinc-600">
          Confirme se deseja desvincular sua sessão desta máquina neste momento.
        </p>
      </SimpleModal>

      <SimpleModal
        open={Boolean(pickupTargetId)}
        onClose={() => setPickupTargetId(null)}
        title="Confirmar retirada"
        description={
          pickupRow
            ? `Deseja solicitar retirada do pallet por um operador de movimentação?`
            : undefined
        }
        footer={
          <ModalActions
            onCancel={() => setPickupTargetId(null)}
            submitLabel={
              pickupMut.isPending ? 'Enviando…' : 'Confirmar retirada'
            }
            onSubmit={() => {
              if (pickupTargetId) {
                pickupMut.mutate(pickupTargetId);
              }
            }}
            disabled={pickupMut.isPending || !pickupTargetId}
          />
        }
      >
        {pickupRow ? (
          <p className="m-0 text-sm text-zinc-600">
            Status do pedido:{' '}
            <strong>{requestStatusLabel(pickupRow.status)}</strong>.
          </p>
        ) : null}
      </SimpleModal>
    </main>
  );
}

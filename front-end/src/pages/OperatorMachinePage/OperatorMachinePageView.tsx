import { Button } from '@/components/ui/Button';
import { ModalActions, SimpleModal } from '@/components/crud/SimpleModal';
import { Card } from '@/components/ui/card';
import { ENV } from '@/constants/env';
import { formatReplenishmentMovementCubeDisplay } from '@/constants/operator-machine-replenishment';
import { typeMachineImageSrc } from '@/pages/TypeMachinesPage/useTypeMachinesPage';
import { requestStatusLabel } from '@/utils/replenishment-labels';
import type { OperatorMachinePageViewModel } from './useOperatorMachinePage';
import { OperatorMachineRequestsSection } from './OperatorMachineRequestsSection';

export function OperatorMachinePageView(vm: OperatorMachinePageViewModel) {
  const {
    apiReady,
    token,
    hasSector,
    myMachineQuery,
    machinesQuery,
    requestsQuery,
    operatorSupplyQuery,
    blockingFinalizeRequest,
    blockingOperatorSupply,
    canRequestPallet,
    statusFilter,
    setStatusFilter,
    pickerOpen,
    closePicker,
    openPicker,
    bindMut,
    endShiftOpen,
    setEndShiftOpen,
    unbindMut,
    finalizeMut,
    pickupTargetId,
    setPickupTargetId,
    pickupMut,
    busy,
  } = vm;

  const current = myMachineQuery.data ?? null;
  const rows = requestsQuery.data ?? [];
  const machines = machinesQuery.data ?? [];

  const pickupRow = pickupTargetId
    ? rows.find((r) => r.id === pickupTargetId)
    : undefined;

  return (
    <main className="px-4 py-8 max-[800px]:px-3">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="border-b border-zinc-200 pb-6">
          <h1 className="m-0 text-2xl font-bold tracking-tight text-zinc-900">
            Operador — máquina de dobra
          </h1>
          <p className="mt-1.5 text-sm text-zinc-600">
            Vincule sua máquina no turno, aponte <strong>finalizei</strong> para
            o próximo cubo e solicite <strong>retirada</strong> apenas quando
            o pedido estiver «Na máquina» (pallet já entregue na dobra).
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
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            Seu usuário não tem <strong>setor</strong> vinculado. Sem setor a
            lista de máquinas vem vazia e não é possível vincular. Solicite ao
            administrador o ajuste do cadastro.
          </p>
        ) : null}

        <section aria-labelledby="op-machine-shift-heading">
          <h2
            id="op-machine-shift-heading"
            className="mb-3 text-lg font-semibold tracking-tight text-zinc-900"
          >
            Minha máquina
          </h2>
          <Card className="border border-zinc-200 p-5 shadow-sm">
            {myMachineQuery.isError ? (
              <p className="text-sm text-red-700">
                {myMachineQuery.error instanceof Error
                  ? myMachineQuery.error.message
                  : 'Erro ao carregar máquina.'}
              </p>
            ) : myMachineQuery.isLoading ? (
              <p className="text-sm text-zinc-500">Carregando…</p>
            ) : current ? (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="shrink-0">
                    {current.typeMachine.urlImage?.trim() ? (
                      <img
                        src={typeMachineImageSrc(current.typeMachine.urlImage)}
                        alt={current.typeMachine.name}
                        className="size-20 rounded-lg border border-zinc-200 object-cover"
                      />
                    ) : (
                      <div
                        className="flex size-20 items-center justify-center rounded-lg border border-dashed border-zinc-200 bg-zinc-50 text-xs text-zinc-400"
                        aria-hidden
                      >
                        —
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <p className="m-0 text-base font-semibold text-zinc-900">
                      {current.name}
                    </p>
                    <p className="mt-1 text-sm text-zinc-600">
                      Posição:{' '}
                      <span className="font-mono text-zinc-800">
                        {current.position}
                      </span>
                    </p>
                    <p className="mt-1 text-sm text-zinc-600">
                      Tipo: {current.typeMachine.name}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!apiReady || busy}
                    onClick={openPicker}
                  >
                    Trocar máquina
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-red-200 text-red-700 hover:bg-red-50"
                    disabled={!apiReady || busy}
                    onClick={() => setEndShiftOpen(true)}
                  >
                    Encerrar vínculo
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="m-0 text-sm text-zinc-600">
                  Nenhuma máquina vinculada neste turno. Escolha a máquina em
                  que você está operando.
                </p>
                <Button
                  type="button"
                  disabled={!apiReady || !hasSector || busy}
                  onClick={openPicker}
                >
                  Escolher máquina
                </Button>
              </div>
            )}
          </Card>
        </section>

        <OperatorMachineRequestsSection
          machineBound={current}
          operatorSupplyQuery={operatorSupplyQuery}
          requestsQuery={requestsQuery}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          blockingFinalizeRequest={blockingFinalizeRequest}
          blockingOperatorSupply={blockingOperatorSupply}
          canRequestPallet={canRequestPallet}
          finalizePending={finalizeMut.isPending}
          busy={busy}
          apiReady={apiReady}
          onSolicitarPallet={() => finalizeMut.mutate()}
          onOpenPickupModal={setPickupTargetId}
          pickupMutationPending={pickupMut.isPending}
        />
      </div>

      <SimpleModal
        open={pickerOpen}
        onClose={closePicker}
        title="Escolher máquina"
        description="Lista apenas máquinas do seu setor. Ao confirmar, o vínculo anterior (se houver) é substituído."
        footer={
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={closePicker}
          >
            Fechar
          </Button>
        }
      >
        {machinesQuery.isLoading ? (
          <p className="text-sm text-zinc-500">Carregando máquinas…</p>
        ) : machinesQuery.isError ? (
          <p className="text-sm text-red-700">
            {machinesQuery.error instanceof Error
              ? machinesQuery.error.message
              : 'Erro ao carregar.'}
          </p>
        ) : machines.length === 0 ? (
          <p className="text-sm text-zinc-600">
            Nenhuma máquina disponível no seu setor.
          </p>
        ) : (
          <ul className="m-0 list-none space-y-2 p-0">
            {machines.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  className="flex w-full flex-col rounded-xl border border-zinc-200 bg-white px-4 py-3 text-left text-sm transition-colors hover:border-[#005fb8] hover:bg-zinc-50 disabled:opacity-50"
                  disabled={bindMut.isPending}
                  onClick={() => bindMut.mutate(m.id)}
                >
                  <span className="font-semibold text-zinc-900">{m.name}</span>
                  <span className="text-xs text-zinc-500">
                    {m.position} · {m.typeMachine.name}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </SimpleModal>

      <SimpleModal
        open={endShiftOpen}
        onClose={() => setEndShiftOpen(false)}
        title="Encerrar vínculo com a máquina"
        description="Use ao fim do turno ou para sair da máquina. Outro operador poderá vincular-se em seguida."
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
            ? `O cubo ${formatReplenishmentMovementCubeDisplay(pickupRow.movementCube)} será solicitado para retirada até a expedição. Só use quando o material já estiver fisicamente na máquina.`
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

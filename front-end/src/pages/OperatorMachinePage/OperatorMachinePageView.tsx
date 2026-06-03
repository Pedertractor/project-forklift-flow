import { Button } from '@/components/ui/brand-button';
import { ModalActions, SimpleModal } from '@/components/crud/SimpleModal';
import { MachineOperationSelectGrid } from '@/components/machines/MachineOperationSelectGrid';
import { ENV } from '@/constants/env';
import { typeMachineImageSrc } from '@/pages/TypeMachinesPage/useTypeMachinesPage';
import type { OperatorMachinePageViewModel } from './useOperatorMachinePage';
import { OperatorMachineOperationGrid } from './OperatorMachineOperationGrid';
import { OperatorMachineTasksList } from './OperatorMachineTasksList';
import { LogOut } from 'lucide-react';
import AccordionLoader from '@/components/accordionLoader/accordion-loader';

export function OperatorMachinePageView(vm: OperatorMachinePageViewModel) {
  const {
    apiReady,
    hasSector,
    myMachineQuery,
    current,
    showMachinePicker,
    machinesQuery,
    machines,
    selectedMachineId,
    selectMachine,
    bindPending,
    operatorSupplyQuery,
    tasksQuery,
    openOperatorSupply,
    deliveryTasks,
    pickupTasks,
    canPickup,
    canOpenRequestDialog,
    pickupBlockedMessage,
    palletAtReceiving,
    palletAtReceivingBlockedMessage,
    submitServiceRequest,
    serviceRequestSubmitPending,
    operatorSupplyRequests,
    endShiftOpen,
    setEndShiftOpen,
    unbindMut,
    cancelPickupMut,
    cancelPickupId,
    setCancelPickupId,
    busy,
  } = vm;

  const pickingMachine = showMachinePicker || !current;
  const cancelPickupTask =
    cancelPickupId != null
      ? (pickupTasks.find((p) => p.id === cancelPickupId) ?? null)
      : null;
  const cancelIncludesReplenishment =
    cancelPickupTask?.triggersReplenishment === true;

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
                ? 'Toque na máquina em que você está operando.'
                : 'Solicite retirada do pallet ou retirada com aviso ao abastecimento.'}
            </p>
          </div>
          {current ? (
            <div className="flex items-center gap-3 ">
              {current.typeMachine.urlImage?.trim() ? (
                <img
                  src={typeMachineImageSrc(current.typeMachine.urlImage)}
                  alt=""
                  className="size-16 shrink-0 rounded-lg bg-white p-2 object-cover"
                />
              ) : null}
              <div className="flex w-full items-center justify-between h-full">
                <div>
                  <p className="m-0 text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Máquina em operação
                  </p>
                  <p className="m-0 truncate text-lg font-bold text-zinc-900">
                    {current.name}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                disabled={!apiReady || busy}
                onClick={() => setEndShiftOpen(true)}
              >
                <LogOut className="size-4" />
              </Button>
            </div>
          ) : null}
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
                Seu usuário não tem <strong>setor</strong> vinculado.
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
                <div className="flex items-center justify-center py-6">
                  <AccordionLoader />
                </div>
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
            </section>
          </>
        ) : (
          <>
            <OperatorMachineOperationGrid
              openSupply={openOperatorSupply}
              deliveryTasks={deliveryTasks}
              canPickup={canPickup}
              canOpenRequestDialog={canOpenRequestDialog}
              pickupBlockedMessage={pickupBlockedMessage}
              palletAtReceivingBlockedMessage={
                palletAtReceiving ? palletAtReceivingBlockedMessage : null
              }
              serviceRequestSubmitPending={serviceRequestSubmitPending}
              busy={busy}
              apiReady={apiReady}
              onSubmitServiceRequest={(selection) => {
                void submitServiceRequest(selection);
              }}
            />

            <OperatorMachineTasksList
              deliveryTasks={deliveryTasks}
              pickupTasks={pickupTasks}
              supplyRequests={operatorSupplyRequests}
              loading={tasksQuery.isLoading || operatorSupplyQuery.isLoading}
              error={tasksQuery.error ?? operatorSupplyQuery.error ?? null}
              busy={busy}
              cancelPickupPendingId={
                cancelPickupMut.isPending ? cancelPickupMut.variables : null
              }
              onRequestCancelPickup={(id) => setCancelPickupId(id)}
            />
          </>
        )}
      </div>

      <SimpleModal
        open={cancelPickupId !== null}
        onClose={() => setCancelPickupId(null)}
        title={
          cancelIncludesReplenishment
            ? 'Cancelar retirada e abastecimento'
            : 'Cancelar solicitação de retirada'
        }
        footer={
          <ModalActions
            onCancel={() => setCancelPickupId(null)}
            submitLabel={
              cancelPickupMut.isPending
                ? 'Cancelando…'
                : 'Confirmar cancelamento'
            }
            onSubmit={() => {
              if (cancelPickupId) {
                cancelPickupMut.mutate(cancelPickupId);
              }
            }}
            disabled={cancelPickupMut.isPending}
            danger
          />
        }
      >
        <p className="m-0 text-sm text-zinc-600">
          {cancelIncludesReplenishment
            ? 'O transporte ainda não aceitou a retirada. O aviso ao abastecimento também será cancelado (e a entrega em preparo, se já tiver sido registrada). Deseja continuar? Esta ação não pode ser desfeita.'
            : 'O transporte ainda não aceitou esta retirada. Deseja cancelar a solicitação? Esta ação não pode ser desfeita.'}
        </p>
      </SimpleModal>

      <SimpleModal
        open={endShiftOpen}
        onClose={() => setEndShiftOpen(false)}
        title="Encerrar vínculo com a máquina"
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
          Confirme se deseja desvincular sua sessão desta máquina.
        </p>
      </SimpleModal>
    </main>
  );
}

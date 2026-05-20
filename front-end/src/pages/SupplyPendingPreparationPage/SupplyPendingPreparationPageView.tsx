import { ReplenishmentCreateWizardModal } from '@/pages/ReplenishmentRequestsPage/ReplenishmentCreateWizardModal';
import { Card } from '@/components/ui/card';
import { ENV } from '@/constants/env';
import {
  formatOperatorSupplyCreatedAt,
} from '@/pages/OperatorMachinePage/operator-machine-requests.model';
import { cn } from '@/lib/utils';
import type { OperatorMachineSupplyRequestListItem } from '@/types/operator-machine.types';
import type { SupplyPendingPreparationPageViewModel } from './useSupplyPendingPreparationPage';
import { Box } from 'lucide-react';

function OperatorSupplyRequestCard({
  row,
  disabled,
  onSelect,
}: {
  row: OperatorMachineSupplyRequestListItem;
  disabled: boolean;
  onSelect: () => void;
}) {
  return (
    <li className="min-w-0">
      <button
        type="button"
        disabled={disabled}
        onClick={onSelect}
        className={cn(
          'flex w-full flex-col items-stretch gap-3 rounded-2xl border-2 border-zinc-200 bg-white p-4 text-left outline-none transition-all',
          'hover:border-[#005fb8]/40 hover:shadow-sm focus-visible:ring-[3px] focus-visible:ring-[#005fb8]/25',
          'disabled:cursor-not-allowed disabled:opacity-60',
        )}
        aria-label={`Criar solicitação de retirada para ${row.machine.name}`}
      >
        <div className="flex items-start gap-3">
          <div
            className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600"
            aria-hidden
          >
            <Box className="size-8 stroke-[1.75]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="m-0 text-base font-bold text-zinc-900">
              {row.machine.name}
            </p>
            <p className="mt-0.5 text-sm text-zinc-600">{row.machine.position}</p>
            <p className="mt-2 text-xs text-zinc-500">
              Operador:{' '}
              <span className="font-medium text-zinc-700">
                {row.requestedBy.name}
              </span>
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {formatOperatorSupplyCreatedAt(row.createdAt)}
            </p>
          </div>
        </div>
        <p className="m-0 text-xs font-medium text-[#005fb8]">
          Toque para registrar a retirada com o cubo
        </p>
      </button>
    </li>
  );
}

export function SupplyPendingPreparationPageView(
  vm: SupplyPendingPreparationPageViewModel,
) {
  const {
    apiReady,
    token,
    hasSector,
    pendingQuery,
    operatorSupplyRows,
    machinesForSelect,
    machinesEmpty,
    createOpen,
    setCreateOpen,
    wizardInitialStep,
    destinationId,
    setDestinationId,
    movementCube,
    setMovementCube,
    typeMovimentPallet,
    setTypeMovimentPallet,
    priorityLevel,
    setPriorityLevel,
    openCreateFromOperatorSupply,
    createMut,
    busy,
    createError,
  } = vm;

  return (
    <main className="px-4 py-8 max-[800px]:px-3">
      <div className="mx-auto w-full max-w-6xl">
        <header className="mb-6 border-b border-zinc-200 pb-6">
          <h1 className="m-0 text-2xl font-bold tracking-tight text-zinc-900">
            Solicitações de reposição
          </h1>
          <p className="mt-1.5 text-sm text-zinc-600">
            Pedidos enviados pelos operadores de máquina. Toque em um card para
            abrir a solicitação de retirada com a máquina já selecionada.
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
            setor para listar solicitações do chão. Solicite ao administrador o
            ajuste do cadastro.
          </p>
        ) : null}

        {machinesEmpty ? (
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            Não há máquinas no seu setor para registrar retiradas. Cadastre
            máquinas em «Máquinas de produção» ou verifique o setor do usuário.
          </p>
        ) : null}

        {pendingQuery.isError ? (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {pendingQuery.error instanceof Error
              ? pendingQuery.error.message
              : 'Erro ao carregar lista.'}
          </p>
        ) : null}

        {!apiReady || !hasSector ? (
          <Card className="mt-6 border border-zinc-200 px-4 py-10 text-center text-sm text-zinc-500 shadow-sm">
            —
          </Card>
        ) : pendingQuery.isLoading ? (
          <Card className="mt-6 border border-zinc-200 px-4 py-10 text-center text-sm text-zinc-500 shadow-sm">
            Carregando solicitações…
          </Card>
        ) : operatorSupplyRows.length === 0 ? (
          <Card className="mt-6 border border-zinc-200 px-4 py-10 text-center text-sm text-zinc-500 shadow-sm">
            Nenhuma solicitação de operador de máquina no setor.
          </Card>
        ) : (
          <ul
            className="mt-6 m-0 grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3"
            aria-label="Solicitações dos operadores de máquina"
          >
            {operatorSupplyRows.map((row) => (
              <OperatorSupplyRequestCard
                key={row.id}
                row={row}
                disabled={!apiReady || busy || machinesEmpty}
                onSelect={() => openCreateFromOperatorSupply(row)}
              />
            ))}
          </ul>
        )}
      </div>

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
        priorityLevel={priorityLevel}
        setPriorityLevel={setPriorityLevel}
        initialStep={wizardInitialStep}
        createError={createError}
        onClose={() => setCreateOpen(false)}
        onSubmit={() => createMut.mutate()}
      />
    </main>
  );
}

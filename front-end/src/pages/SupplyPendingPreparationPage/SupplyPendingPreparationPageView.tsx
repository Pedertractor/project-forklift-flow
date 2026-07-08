import { ReplenishmentCreateWizardModal } from '@/pages/ReplenishmentRequestsPage/ReplenishmentCreateWizardModal';
import { Card } from '@/components/ui/card';
import { ENV } from '@/constants/env';
import { formatOperatorSupplyCreatedAt } from '@/pages/OperatorMachinePage/operator-machine-requests.model';
import { cn } from '@/lib/utils';
import type { OperatorMachineSupplyRequestListItem } from '@/types/operator-machine.types';
import type { SupplyPendingPreparationPageViewModel } from './useSupplyPendingPreparationPage';
import { typeMachineImageSrc } from '@/pages/TypeMachinesPage/useTypeMachinesPage';
import { ArrowLeftIcon } from 'lucide-react';
import { Button } from '@/components/ui/brand-button';
import { useNavigate } from 'react-router-dom';
import { EmptyStateMessage } from '@/components/empty-state-message/empty-state-message';
import { MachineMetaText } from '@/components/machines/MachineMetaText';
import AccordionLoader from '@/components/accordionLoader/accordion-loader';

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
          'flex w-full flex-col items-stretch gap-3 rounded-2xl border-2 border-zinc-200 bg-white p-4 text-left outline-none transition-all max-[800px]:p-3.5',
          'hover:border-brand/40 hover:shadow-sm focus-visible:ring-[3px] focus-visible:ring-brand/25',
          'disabled:cursor-not-allowed disabled:opacity-60',
        )}
        aria-label={`Criar solicitação de retirada para ${row.machine.name}`}
      >
        <div className="flex items-start gap-3">
          {row.machine.typeMachine.urlImage?.trim() ? (
            <img
              src={typeMachineImageSrc(row.machine.typeMachine.urlImage)}
              alt=""
              className="size-12 shrink-0 rounded-xl border border-zinc-200 object-cover sm:size-14"
              loading="lazy"
            />
          ) : (
            <div
              className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50 text-xs text-zinc-400 sm:size-14"
              aria-hidden
            >
              —
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="m-0 text-sm font-bold text-zinc-900 sm:text-base">
              {row.machine.name}
            </p>
            <MachineMetaText
              assetNumber={row.machine.assetNumber}
              pillar={row.machine.pillar}
              className="mt-0.5"
            />
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
        <p className="m-0 text-xs font-medium text-brand">
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
    isCritical,
    setIsCritical,
    openCreateFromOperatorSupply,
    createMut,
    busy,
    createError,
  } = vm;

  const navigate = useNavigate();

  return (
    <main className="px-4 py-8 max-[800px]:px-3 max-[800px]:py-5">
      <div className="mx-auto w-full max-w-6xl">
        <header className="mb-6 flex flex-col gap-4 border-b border-zinc-200 pb-6 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="m-0 text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl">
              Solicitações de reposição
            </h1>
            <p className="mt-1.5 text-sm text-zinc-600">
              Pedidos enviados pelos operadores de máquina.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-10 w-full gap-2 px-3 text-xs sm:h-9 sm:w-auto"
            disabled={busy}
            onClick={() => navigate('/abastecimento/solicitacoes')}
          >
            <ArrowLeftIcon className="size-4 shrink-0" />
            <span className="sm:hidden">Voltar</span>
            <span className="hidden sm:inline">Voltar para reposição</span>
          </Button>
        </header>

        {!ENV.API_URL ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Defina <code className="font-mono">VITE_BASE_URL_API</code> e faça login.
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
          <Card className="mt-6 flex items-center justify-center border border-zinc-200 px-4 py-10 shadow-sm">
            <AccordionLoader />
          </Card>
        ) : operatorSupplyRows.length === 0 ? (
          <Card className="mt-6 border border-zinc-200 px-4 py-10 text-center text-sm text-zinc-500 shadow-sm">
            <EmptyStateMessage title="Nenhuma solicitação de operador de máquina no setor." />
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
        isCritical={isCritical}
        setIsCritical={setIsCritical}
        initialStep={wizardInitialStep}
        createError={createError}
        onClose={() => setCreateOpen(false)}
        onSubmit={() => createMut.mutate()}
      />
    </main>
  );
}

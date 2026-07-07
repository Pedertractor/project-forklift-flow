import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/brand-button';
import { EmptyStateMessage } from '@/components/empty-state-message/empty-state-message';
import AccordionLoader from '@/components/accordionLoader/accordion-loader';
import { ENV } from '@/constants/env';
import { cn } from '@/lib/utils';
import { typeMachineImageSrc } from '@/pages/TypeMachinesPage/useTypeMachinesPage';
import type { MachineListItem, MachineProductionStatus } from '@/types/machine.types';
import { ArrowLeftIcon, Factory, Loader2, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { SupplyMachineStatusPageViewModel } from './useSupplyMachineStatusPage';

const statusButtonBase =
  'inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border-2 px-3 text-xs font-semibold uppercase tracking-wide transition-all sm:text-sm';

function statusButtonClass(
  active: boolean,
  variant: MachineProductionStatus,
): string {
  if (!active) {
    return cn(
      statusButtonBase,
      'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50',
    );
  }
  if (variant === 'TRABALHANDO') {
    return cn(
      statusButtonBase,
      'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-600/20',
    );
  }
  return cn(
    statusButtonBase,
    'border-amber-500 bg-amber-50 text-amber-900 ring-2 ring-amber-500/20',
  );
}

function MachineStatusButton({
  label,
  icon: Icon,
  status,
  active,
  loading,
  disabled,
  onClick,
}: {
  label: string;
  icon: typeof Factory;
  status: MachineProductionStatus;
  active: boolean;
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      className={statusButtonClass(active, status)}
      disabled={disabled || loading}
      onClick={onClick}
      aria-busy={loading}
    >
      {loading ? (
        <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
      ) : (
        <Icon className="size-4 shrink-0" aria-hidden />
      )}
      {label}
    </Button>
  );
}

function MachineStatusCard({
  machine,
  disabled,
  pendingUpdate,
  onSetStatus,
}: {
  machine: MachineListItem;
  disabled: boolean;
  pendingUpdate: {
    machineId: string;
    productionStatus: MachineProductionStatus;
  } | null;
  onSetStatus: (status: MachineProductionStatus) => void;
}) {
  const isUpdatingThisMachine = pendingUpdate?.machineId === machine.id;
  return (
    <li className="min-w-0">
      <Card className="flex h-full flex-col gap-4 border border-zinc-200 p-4 shadow-sm">
        <div className="flex items-start gap-3">
          {machine.typeMachine.urlImage?.trim() ? (
            <img
              src={typeMachineImageSrc(machine.typeMachine.urlImage)}
              alt=""
              className="size-14 shrink-0 rounded-xl border border-zinc-200 object-cover"
              loading="lazy"
            />
          ) : (
            <div
              className="flex size-14 shrink-0 items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50 text-xs text-zinc-400"
              aria-hidden
            >
              —
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="m-0 text-base font-bold text-zinc-900">
              {machine.name}
            </p>
            <p className="mt-1 text-sm text-zinc-600">
              {machine.typeMachine.name}
            </p>
            {machine.user ? (
              <p className="mt-2 text-xs text-zinc-500">
                Operador:{' '}
                <span className="font-medium text-zinc-700">
                  {machine.user.name}
                </span>
              </p>
            ) : (
              <p className="mt-2 text-xs text-zinc-400">Sem operador vinculado</p>
            )}
          </div>
        </div>

        <div className="mt-auto flex gap-2">
          <MachineStatusButton
            label="Trabalhando"
            icon={Factory}
            status="TRABALHANDO"
            active={machine.productionStatus === 'TRABALHANDO'}
            loading={
              isUpdatingThisMachine &&
              pendingUpdate?.productionStatus === 'TRABALHANDO'
            }
            disabled={disabled || isUpdatingThisMachine}
            onClick={() => onSetStatus('TRABALHANDO')}
          />
          <MachineStatusButton
            label="Abastecer"
            icon={Package}
            status="ABASTECER"
            active={machine.productionStatus === 'ABASTECER'}
            loading={
              isUpdatingThisMachine &&
              pendingUpdate?.productionStatus === 'ABASTECER'
            }
            disabled={disabled || isUpdatingThisMachine}
            onClick={() => onSetStatus('ABASTECER')}
          />
        </div>
      </Card>
    </li>
  );
}

export function SupplyMachineStatusPageView(
  vm: SupplyMachineStatusPageViewModel,
) {
  const {
    apiReady,
    token,
    hasSector,
    machinesQuery,
    machines,
    machinesEmpty,
    pendingStatusUpdate,
    setMachineStatus,
    busy,
  } = vm;

  const navigate = useNavigate();

  return (
    <main className="px-4 py-8 max-[800px]:px-3 max-[800px]:py-5">
      <div className="mx-auto w-full max-w-5xl">
        <header className="mb-6 flex flex-col gap-4 border-b border-zinc-200 pb-6 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="m-0 text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl">
              Status das máquinas de dobra
            </h1>
            <p className="mt-1.5 text-sm text-zinc-600">
              Defina se cada máquina está em produção ou liberada para
              abastecimento
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
            Seu usuário não tem <strong>setor</strong> vinculado. Solicite ao
            administrador o ajuste do cadastro.
          </p>
        ) : null}

        {machinesEmpty ? (
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            Não há máquinas no seu setor. Cadastre máquinas em «Máquinas de
            produção» ou verifique o setor do usuário.
          </p>
        ) : null}

        {machinesQuery.isError ? (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {machinesQuery.error instanceof Error
              ? machinesQuery.error.message
              : 'Erro ao carregar máquinas.'}
          </p>
        ) : null}

        {!apiReady || !hasSector ? (
          <Card className="mt-6 border border-zinc-200 px-4 py-10 text-center text-sm text-zinc-500 shadow-sm">
            —
          </Card>
        ) : machinesQuery.isLoading ? (
          <Card className="mt-6 flex items-center justify-center border border-zinc-200 px-4 py-10 shadow-sm">
            <AccordionLoader />
          </Card>
        ) : machines.length === 0 ? (
          <Card className="mt-6 border border-zinc-200 px-4 py-10 text-center text-sm text-zinc-500 shadow-sm">
            <EmptyStateMessage title="Nenhuma máquina no setor." />
          </Card>
        ) : (
          <ul
            className="mt-6 m-0 grid list-none gap-4 p-0 sm:grid-cols-2"
            aria-label="Máquinas do setor"
          >
            {machines.map((machine) => (
              <MachineStatusCard
                key={machine.id}
                machine={machine}
                disabled={!apiReady || busy || machinesEmpty}
                pendingUpdate={pendingStatusUpdate}
                onSetStatus={(status) => setMachineStatus(machine, status)}
              />
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

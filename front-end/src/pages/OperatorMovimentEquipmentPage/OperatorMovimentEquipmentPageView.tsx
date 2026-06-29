import { Button } from '@/components/ui/brand-button';
import { Card } from '@/components/ui/card';
import { PageLoader } from '@/components/layout/PageLoader';
import { ENV } from '@/constants/env';
import { cn } from '@/lib/utils';
import {
  movimentTypeLabel,
  movimentTypePublicIconPath,
} from '@/utils/operator-moviment-display';
import type { IsOperatingMode } from '@/types/operator-moviment-pallet.types';
import type { OperatorMovimentEquipmentPageViewModel } from './useOperatorMovimentEquipmentPage';
import { Undo2Icon } from 'lucide-react';
import AccordionLoader from '@/components/accordionLoader/accordion-loader';

const MODES: IsOperatingMode[] = ['FORKLIFT', 'PALLET_TRUCK'];

const modeCardBaseClass =
  'group flex w-full flex-col items-center gap-3 rounded-2xl border-2 bg-white p-5 text-center outline-none transition-all focus-visible:ring-[3px] focus-visible:ring-brand/25 disabled:cursor-not-allowed disabled:opacity-60';

export function OperatorMovimentEquipmentPageView(
  vm: OperatorMovimentEquipmentPageViewModel,
) {
  const {
    token,
    sectorMissing,
    currentOperatingMode,
    bound,
    changeOperatingMode,
    redirectingToTasks,
    operatingQuery,
    selectOperatingMode,
    unbindMut,
    busy,
    bindPending,
  } = vm;

  if (redirectingToTasks) {
    return <PageLoader />;
  }

  const pickingTitle = changeOperatingMode
    ? 'Trocar modo de operação'
    : 'Como você vai operar hoje?';
  const pickingDescription = changeOperatingMode
    ? 'Qual equipamento você vai operar hoje?'
    : 'Selecione se está operando empilhadeira ou transpaleteira para acessar as tarefas do setor.';

  return (
    <main className="px-4 py-8 max-[800px]:px-3">
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-6 border-b border-zinc-200 pb-6">
          <h1 className="m-0 text-2xl font-bold tracking-tight text-zinc-900">
            {pickingTitle}
          </h1>
          <p className="mt-1.5 text-sm text-zinc-600">{pickingDescription}</p>
        </header>

        {!ENV.API_URL ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Defina <code className="font-mono">VITE_BASE_URL_API</code> e faça login.
          </p>
        ) : !token ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Faça login para continuar.
          </p>
        ) : null}

        {sectorMissing ? (
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            Seu usuário não possui setor cadastrado. Peça a um administrador
            para associar seu perfil a um setor.
          </p>
        ) : null}

        {changeOperatingMode && bound && currentOperatingMode ? (
          <Card className="mb-6 p-5 shadow-sm">
            <p className="m-0 text-xs font-semibold uppercase tracking-wider text-brand">
              Modo ativo
            </p>
            <div className="mt-3 flex items-center gap-4">
              <img
                src={movimentTypePublicIconPath(currentOperatingMode)}
                alt=""
                className="h-12 w-auto object-contain"
                width={144}
                height={64}
              />
              <p className="m-0 text-lg font-bold text-zinc-900">
                {movimentTypeLabel(currentOperatingMode)}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="mt-5 w-full border-red-200 text-red-700 hover:bg-red-50 sm:w-auto"
              disabled={busy}
              onClick={() => unbindMut.mutate()}
            >
              <Undo2Icon className="size-4" />
              Desconectar modo de operação
            </Button>
          </Card>
        ) : null}

        <Card className="border border-zinc-200 p-5 shadow-sm">
          {operatingQuery.isLoading ? (
            <div className="flex items-center justify-center py-8">
              <AccordionLoader />
            </div>
          ) : (
            <ul
              className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2"
              role="listbox"
              aria-label="Modo de operação"
            >
              {MODES.map((mode) => {
                const selected = currentOperatingMode === mode;
                return (
                  <li key={mode}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={selected}
                      disabled={busy || sectorMissing}
                      className={cn(
                        modeCardBaseClass,
                        selected
                          ? 'border-brand bg-gradient-to-br from-brand/[0.08] to-white ring-2 ring-brand/20'
                          : 'border-zinc-200 hover:border-zinc-300 hover:shadow-sm',
                      )}
                      onClick={() => selectOperatingMode(mode)}
                    >
                      <img
                        src={movimentTypePublicIconPath(mode)}
                        alt=""
                        className="h-14 w-auto object-contain"
                        width={160}
                        height={72}
                      />
                      <span className="text-base font-bold text-zinc-900">
                        {movimentTypeLabel(mode)}
                      </span>
                      {bindPending ? (
                        <span className="text-xs text-zinc-500">
                          Confirmando…
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </main>
  );
}

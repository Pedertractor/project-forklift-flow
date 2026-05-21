import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { PageLoader } from '@/components/layout/PageLoader';
import { ENV } from '@/constants/env';
import { cn } from '@/lib/utils';
import {
  movimentTypeLabel,
  movimentTypePublicIconPath,
} from '@/utils/operator-moviment-display';
import type { OperatorMovimentEquipmentPageViewModel } from './useOperatorMovimentEquipmentPage';
import { Undo2Icon } from 'lucide-react';

const equipmentCardBaseClass =
  'group flex w-full flex-col items-stretch gap-3 rounded-2xl border-2 bg-white p-4 text-left outline-none transition-all focus-visible:ring-[3px] focus-visible:ring-[#005fb8]/25 disabled:cursor-not-allowed disabled:opacity-60';

const equipmentCardIdleClass =
  'border-zinc-200 hover:border-zinc-300 hover:shadow-sm';
const equipmentCardSelectedClass =
  'border-[#005fb8] bg-gradient-to-br from-[#005fb8]/[0.08] to-white shadow-sm ring-2 ring-[#005fb8]/20';
const equipmentCardOccupiedClass =
  'cursor-not-allowed border-zinc-200 bg-zinc-50 opacity-75';

export function OperatorMovimentEquipmentPageView(
  vm: OperatorMovimentEquipmentPageViewModel,
) {
  const {
    token,
    currentUserId,
    sectorMissing,
    currentPallet,
    bound,
    changeEquipment,
    redirectingToTasks,
    myPalletQuery,
    pickerQuery,
    pickerMovimentId,
    selectMovimentEquipment,
    unbindMut,
    busy,
    bindPending,
  } = vm;

  if (redirectingToTasks) {
    return <PageLoader />;
  }

  const pickingTitle = changeEquipment
    ? 'Trocar equipamento'
    : 'Selecionar equipamento';
  const pickingDescription = changeEquipment
    ? 'Toque no equipamento que você vai operar. A troca é confirmada na hora e você segue para as tarefas.'
    : 'Toque no equipamento que você vai operar para vincular e abrir as tarefas disponíveis.';

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
            Defina <code className="font-mono">VITE_API_URL</code> e faça login.
          </p>
        ) : !token ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Faça login para vincular um equipamento.
          </p>
        ) : null}

        {sectorMissing ? (
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            Seu usuário não possui setor cadastrado. Peça a um administrador
            para associar seu perfil a um setor.
          </p>
        ) : null}

        {changeEquipment && bound && currentPallet ? (
          <Card className="mb-6 p-5 shadow-sm">
            <p className="m-0 text-xs font-semibold uppercase tracking-wider text-[#005fb8]">
              Equipamento ativo
            </p>
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
              <div className="min-w-0">
                <img
                  src={movimentTypePublicIconPath(currentPallet.type)}
                  alt=""
                  className="h-10 w-auto max-w-[min(100%,9rem)] object-contain"
                  width={144}
                  height={64}
                />
              </div>
              <div>
                <dt className="text-xs font-medium text-zinc-500">Código</dt>
                <dd className="mt-0.5 font-mono text-lg font-bold text-zinc-900">
                  {currentPallet.code}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-zinc-500">Tipo</dt>
                <dd className="mt-0.5 font-medium text-zinc-900">
                  {movimentTypeLabel(currentPallet.type)}
                </dd>
              </div>
            </dl>
            <Button
              type="button"
              variant="outline"
              className="mt-5 w-full border-red-200 text-red-700 hover:bg-red-50 sm:w-auto"
              disabled={busy}
              onClick={() => unbindMut.mutate()}
            >
              <Undo2Icon className="size-4" />
              Desconectar da máquina
            </Button>
          </Card>
        ) : null}

        <Card className="border border-zinc-200 p-5 shadow-sm">
          <h2 className="m-0 text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Equipamentos do seu setor
          </h2>
          {myPalletQuery.isLoading || pickerQuery.isLoading ? (
            <p className="mt-3 text-sm text-zinc-600">Carregando…</p>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label id="operator-equipment-picker-label">
                  {bindPending
                    ? 'Vinculando equipamento…'
                    : 'Toque para selecionar'}
                </Label>
                <ul
                  className="m-0 mt-3 grid list-none gap-3 p-0 sm:grid-cols-3"
                  role="listbox"
                  aria-labelledby="operator-equipment-picker-label"
                >
                  {(pickerQuery.data ?? []).map((p) => {
                    const selected = pickerMovimentId === p.id;
                    const isActive = currentPallet?.id === p.id;
                    const occupiedByOther =
                      p.operatorId !== null &&
                      p.operatorId !== currentUserId;
                    const operatorName = p.operator?.name?.trim();
                    return (
                      <li key={p.id} className="min-w-0">
                        <button
                          type="button"
                          role="option"
                          aria-selected={selected}
                          aria-current={isActive ? 'true' : undefined}
                          aria-disabled={occupiedByOther ? true : undefined}
                          className={cn(
                            equipmentCardBaseClass,
                            occupiedByOther
                              ? equipmentCardOccupiedClass
                              : selected
                                ? equipmentCardSelectedClass
                                : equipmentCardIdleClass,
                          )}
                          onClick={() => selectMovimentEquipment(p.id)}
                          disabled={
                            occupiedByOther || pickerQuery.isFetching || busy
                          }
                        >
                          <div
                            className={cn(
                              'flex items-center justify-center rounded-xl bg-zinc-50 px-3 py-5 min-[480px]:py-4',
                              !occupiedByOther &&
                                'group-hover:bg-zinc-100/90',
                            )}
                          >
                            <img
                              src={movimentTypePublicIconPath(p.type)}
                              alt=""
                              className="h-16 w-auto max-w-[min(100%,9rem)] object-contain"
                              width={144}
                              height={64}
                            />
                          </div>
                          <div className="min-w-0 text-center sm:text-left">
                            <p className="m-0 font-mono text-lg font-bold tracking-tight text-zinc-900">
                              {p.code}
                            </p>
                            <p className="mt-1 text-sm font-medium text-zinc-600">
                              {movimentTypeLabel(p.type)}
                            </p>
                            {occupiedByOther && operatorName ? (
                              <p className="mt-1 text-xs font-semibold text-zinc-500">
                                {operatorName}
                              </p>
                            ) : isActive ? (
                              <p className="mt-1 text-xs font-semibold text-[#005fb8]">
                                Em uso
                              </p>
                            ) : null}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
                {pickerQuery.isError ? (
                  <p className="text-sm text-red-700">
                    {pickerQuery.error instanceof Error
                      ? pickerQuery.error.message
                      : 'Erro ao listar equipamentos.'}
                  </p>
                ) : null}
                {pickerQuery.isSuccess &&
                (pickerQuery.data?.length ?? 0) === 0 ? (
                  <p className="text-sm text-zinc-600">
                    Nenhum equipamento disponível no momento para o seu setor e
                    perfil.
                  </p>
                ) : null}
              </div>
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}

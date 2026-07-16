import { Check, Link2, Road, Search, UserRound, Zap } from 'lucide-react';

import AccordionLoader from '@/components/accordionLoader/accordion-loader';
import { Button } from '@/components/ui/brand-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SelectCombobox } from '@/components/ui/select-combobox';
import { ENV } from '@/constants/env';
import { cn } from '@/lib/utils';
import { typeMachineImageSrc } from '@/pages/TypeMachinesPage/useTypeMachinesPage';

import type { MovimentOperatorPriorityPageViewModel } from './useMovimentOperatorPriorityPage';
import { captalizeString } from '@/utils/captalizeString';

export function MovimentOperatorPriorityPageView(
  vm: MovimentOperatorPriorityPageViewModel,
) {
  const {
    apiReady,
    token,
    canAccess,
    canFilterBySector,
    sectorScopeLabel,
    leaderMissingSector,
    sectorFilter,
    setSectorFilter,
    sectors,
    boardQuery,
    operators,
    selectedOperator,
    selectedOperatorId,
    setSelectedOperatorId,
    operatorSearch,
    setOperatorSearch,
    machineSearch,
    setMachineSearch,
    machinesForOperator,
    linkedSet,
    toggleMachine,
    clearAll,
    busy,
  } = vm;

  if (!canAccess) {
    return (
      <main className="px-4 py-8">
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Esta tela está disponível para administradores e líderes.
        </p>
      </main>
    );
  }

  if (leaderMissingSector) {
    return (
      <main className="px-4 py-8">
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Seu usuário líder não está vinculado a um setor. Solicite ao
          administrador a correção do cadastro para gerenciar prioridades.
        </p>
      </main>
    );
  }

  return (
    <main className="px-4 py-8 max-[800px]:px-3">
      <div className="mx-auto w-full max-w-6xl">
        <header className="mb-6 border-b border-zinc-200 pb-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="m-0 text-2xl font-bold tracking-tight text-zinc-900">
                Prioridade por operador
              </h1>
              <p className="m-0 mt-1 max-w-2xl text-sm text-zinc-600">
                Vincule máquinas a um operador de movimentação. Na tela de
                sugestão, essas máquinas cortam a fila — mesmo diante de
                pedidos mais antigos ou críticos.
                {!canFilterBySector && sectorScopeLabel
                  ? ` Você gerencia apenas o setor ${sectorScopeLabel}.`
                  : null}
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-medium text-sky-900">
              <Zap className="size-3.5 shrink-0" aria-hidden />
              Corta fila na sugestão
            </div>
          </div>
        </header>

        {!ENV.API_URL ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Defina <code className="font-mono">VITE_BASE_URL_API</code> e faça
            login.
          </p>
        ) : !token ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Faça login para gerenciar prioridades.
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap items-end gap-3">
          {canFilterBySector ? (
            <div className="flex min-w-48 flex-col gap-2">
              <Label htmlFor="priority-sector-filter">Filtrar por setor</Label>
              <SelectCombobox
                id="priority-sector-filter"
                value={sectorFilter}
                onValueChange={(value) => {
                  setSectorFilter(value);
                  setSelectedOperatorId(null);
                }}
                disabled={!apiReady}
                placeholder="Todos"
                options={[
                  { value: '', label: 'Todos' },
                  ...sectors.map((s) => ({
                    value: s.id,
                    label: s.typeSector,
                  })),
                ]}
              />
            </div>
          ) : (
            <div className="flex min-w-48 flex-col gap-2">
              <Label>Setor</Label>
              <p className="m-0 flex h-[var(--control-height,2.5rem)] items-center rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-sm text-zinc-700">
                {sectorScopeLabel ?? 'Seu setor'}
              </p>
            </div>
          )}
        </div>

        {boardQuery.isError ? (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {boardQuery.error instanceof Error
              ? boardQuery.error.message
              : 'Erro ao carregar vínculos.'}
          </p>
        ) : null}

        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
          <section className="flex min-h-[28rem] flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white">
            <div className="border-b border-zinc-100 px-4 py-3">
              <p className="m-0 text-sm font-semibold text-zinc-900">
                Operadores de movimentação
              </p>
              <div className="relative mt-2">
                <Search
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400"
                  aria-hidden
                />
                <Input
                  value={operatorSearch}
                  onChange={(e) => setOperatorSearch(e.target.value)}
                  placeholder="Buscar nome ou cartão…"
                  className="pl-9"
                  disabled={!apiReady}
                />
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {boardQuery.isLoading ? (
                <div className="flex justify-center py-10">
                  <AccordionLoader />
                </div>
              ) : operators.length === 0 ? (
                <p className="m-0 px-3 py-8 text-center text-sm text-zinc-500">
                  Nenhum transportador neste filtro.
                </p>
              ) : (
                <ul className="m-0 flex list-none flex-col gap-1 p-0">
                  {operators.map((op) => {
                    const active = op.id === selectedOperatorId;
                    const count = op.linkedMachineIds.length;
                    return (
                      <li key={op.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedOperatorId(op.id)}
                          className={cn(
                            'flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
                            active
                              ? 'bg-brand/12 ring-1 ring-brand/25'
                              : 'hover:bg-zinc-50',
                          )}
                        >
                          <span
                            className={cn(
                              'mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl border',
                              active
                                ? 'border-brand/30 bg-white text-brand'
                                : 'border-zinc-200 bg-zinc-50 text-zinc-500',
                            )}
                          >
                            <UserRound className="size-4" aria-hidden />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-zinc-900">
                              {op.name}
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-zinc-500">
                              Cartão {op.card}
                              {op.sector?.typeSector
                                ? ` · ${op.sector.typeSector}`
                                : ''}
                            </span>
                          </span>
                          <span
                            className={cn(
                              'shrink-0 rounded-full px-2 py-0.5 text-[0.65rem] font-bold tabular-nums',
                              count > 0
                                ? 'bg-sky-100 text-sky-800'
                                : 'bg-zinc-100 text-zinc-500',
                            )}
                          >
                            {count}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>

          <section className="flex min-h-[28rem] flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white">
            {!selectedOperator ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-16 text-center">
                <Link2 className="size-8 text-zinc-300" aria-hidden />
                <p className="m-0 text-sm font-medium text-zinc-700">
                  Selecione um operador
                </p>
                <p className="m-0 max-w-sm text-sm text-zinc-500">
                  Escolha à esquerda e marque as máquinas que devem aparecer
                  primeiro na sugestão dele.
                </p>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-100 px-4 py-3">
                  <div className="min-w-0">
                    <p className="m-0 text-sm font-semibold text-zinc-900">
                      Máquinas de {captalizeString(selectedOperator.name)}
                    </p>
                    <p className="m-0 mt-0.5 text-xs text-zinc-500">
                      {selectedOperator.sector?.typeSector
                        ? `Setor ${selectedOperator.sector.typeSector} · `
                        : null}
                      Clique para vincular ou desvincular. Salvamento
                      automático.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={
                      !apiReady ||
                      busy ||
                      selectedOperator.linkedMachineIds.length === 0
                    }
                    onClick={clearAll}
                  >
                    Limpar vínculos
                  </Button>
                </div>

                <div className="border-b border-zinc-100 px-4 py-3">
                  <div className="relative">
                    <Search
                      className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400"
                      aria-hidden
                    />
                    <Input
                      value={machineSearch}
                      onChange={(e) => setMachineSearch(e.target.value)}
                      placeholder="Buscar máquina, patrimônio, rua…"
                      className="pl-9"
                      disabled={!apiReady}
                    />
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto p-3">
                  {boardQuery.isLoading ? (
                    <div className="flex justify-center py-10">
                      <AccordionLoader />
                    </div>
                  ) : !selectedOperator.sectorId ? (
                    <p className="m-0 rounded-xl border border-dashed border-amber-200 bg-amber-50/70 px-4 py-8 text-center text-sm text-amber-950">
                      Este operador não tem setor. Vincule um setor no cadastro
                      de usuários antes de priorizar máquinas.
                    </p>
                  ) : machinesForOperator.length === 0 ? (
                    <p className="m-0 px-3 py-8 text-center text-sm text-zinc-500">
                      Nenhuma máquina disponível neste setor.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                      {machinesForOperator.map((machine) => {
                        const linked = linkedSet.has(machine.id);
                        return (
                          <button
                            key={machine.id}
                            type="button"
                            disabled={!apiReady || busy}
                            onClick={() => toggleMachine(machine.id)}
                            className={cn(
                              'group flex min-w-0 items-start gap-3 rounded-xl border px-3 py-3 text-left transition-all',
                              linked
                                ? 'border-sky-300 bg-sky-50 shadow-sm ring-1 ring-sky-200'
                                : 'border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50',
                              busy && 'opacity-70',
                            )}
                          >
                            <img
                              src={typeMachineImageSrc(
                                machine.typeMachine.urlImage,
                              )}
                              alt=""
                              className="size-11 shrink-0 rounded-lg border border-zinc-200 object-cover"
                              loading="lazy"
                            />
                            <span className="min-w-0 flex-1">
                              <span className="flex items-start justify-between gap-2">
                                <span className="truncate text-sm font-semibold text-zinc-900">
                                  {machine.name}
                                </span>
                                <span
                                  className={cn(
                                    'flex size-5 shrink-0 items-center justify-center rounded-full border',
                                    linked
                                      ? 'border-sky-500 bg-sky-500 text-white'
                                      : 'border-zinc-300 bg-white text-transparent',
                                  )}
                                >
                                  <Check className="size-3" strokeWidth={3} />
                                </span>
                              </span>
                              <span className="mt-0.5 block truncate text-xs text-zinc-500">
                                {machine.assetNumber
                                  ? `Pat. ${machine.assetNumber}`
                                  : machine.typeMachine.name}
                                {machine.pillar ? ` · ${machine.pillar}` : ''}
                              </span>
                              {machine.machineStreet ? (
                                <span
                                  className="mt-1 inline-flex max-w-full items-center gap-1 truncate text-xs font-medium"
                                  style={{
                                    color:
                                      machine.machineStreet.machineStreetColor,
                                  }}
                                >
                                  <Road
                                    className="size-3 shrink-0"
                                    strokeWidth={2.5}
                                    aria-hidden
                                  />
                                  <span className="truncate">
                                    {machine.machineStreet.name}
                                  </span>
                                </span>
                              ) : null}
                              {linked ? (
                                <span className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-sky-100 px-1.5 py-0.5 text-[0.65rem] font-semibold tracking-wide text-sky-800 uppercase">
                                  <Zap className="size-3" aria-hidden />
                                  Priorizada
                                </span>
                              ) : null}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

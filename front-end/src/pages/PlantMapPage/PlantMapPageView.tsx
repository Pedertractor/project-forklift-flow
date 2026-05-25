import { useEffect, useRef } from 'react';
import { MapPin, Move, Plus, RotateCcw, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { PlantMapCreateMachineModal } from './PlantMapCreateMachineModal';
import { PlantMapKonvaStage } from './PlantMapKonvaStage';
import { PlantMapMachineDetail } from './PlantMapMachineDetail';
import { PlantMapMobileDetailSheet } from './PlantMapMobileDetailSheet';
import type { PlantMapPageViewModel } from './usePlantMapPage';
import { PlantMapAreasToolbar } from './PlantMapAreasToolbar';
import {
  PLANT_MAP_LEGEND_ITEMS,
  plantMapNodeFill,
} from '@/utils/plantMapNodeColors';
import { plantMapAreaLegendItems } from '@/utils/plantMapAreaStyles';

export function PlantMapPageView(props: PlantMapPageViewModel) {
  const {
    canEditMachines,
    placementMode,
    placementMarker,
    savingMachineId,
    handleMachinePositionCommit,
    handlePlantMapClick,
    startPlacementMode,
    cancelPlacement,
    createModalOpen,
    closeCreateModal,
    createName,
    setCreateName,
    createTypeMachineId,
    setCreateTypeMachineId,
    createSectorId,
    setCreateSectorId,
    createMachineMut,
    createError,
    cannotCreateMachine,
    sectorsForSelect,
    typesQuery,
    newMachineDraft,
    plantUnit,
    setPlantUnit,
    containerRef,
    backgroundImage,
    plantDimensions,
    scale,
    minScale,
    setScale,
    stagePos,
    setStagePos,
    clampStagePos,
    handleResetView,
    placedMachines,
    selectedMachineId,
    setSelectedMachineId,
    sidebarRows,
    selectedDetail,
    mapInitialLoading,
    mapStageReady,
    machinesError,
    replenishmentError,
    plantAreas,
    areaEditMode,
    areaDrawKind,
    areaDraftRect,
    areaSaveBusy,
    openAreaEdit,
    closeAreaEdit,
    startAreaDraw,
    clearAreaDraw,
    removePlantMapArea,
    handleAreaDrawStart,
    handleAreaDrawMove,
    handleAreaDrawEnd,
    containerSize,
    machinesWithExplicitMapCount,
    mapRefetching,
    dataUpdatedAt,
  } = props;

  const machineCount = sidebarRows.length;
  const showMapPlacementHint =
    canEditMachines &&
    machineCount > 0 &&
    machinesWithExplicitMapCount === 0 &&
    !mapInitialLoading &&
    !machinesError;

  const lastSyncLabel =
    dataUpdatedAt > 0
      ? new Date(dataUpdatedAt).toLocaleString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        })
      : null;

  const listRef = useRef<HTMLUListElement>(null);
  const mobileDetailOpen = Boolean(selectedDetail);

  const selectMachine = (id: string) => {
    setSelectedMachineId(id);
  };

  const clearMachineSelection = () => {
    setSelectedMachineId(null);
  };

  useEffect(() => {
    if (!selectedMachineId) {
      return;
    }
    const mq = window.matchMedia('(min-width: 1024px)');
    if (mq.matches) {
      return;
    }
    const item = listRef.current?.querySelector<HTMLElement>(
      `[data-machine-id="${selectedMachineId}"]`,
    );
    item?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedMachineId]);

  return (
    <section className="flex h-[calc(100dvh-3.5rem)] max-h-[calc(100dvh-3.5rem)] min-h-0 flex-col gap-2 overflow-hidden px-3 py-2">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-zinc-200 pb-2">
        <div className="min-w-0">
          <h1 className="m-0 text-lg font-bold tracking-tight text-zinc-900 sm:text-xl">
            Mapa da planta
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 rounded-lg border border-zinc-200 bg-white p-0.5">
            {(['PEDERTRACTOR', 'TRACTOR'] as const).map((u) => (
              <Button
                key={u}
                type="button"
                variant="ghost"
                className={
                  plantUnit === u
                    ? 'bg-[#005fb8] text-white hover:bg-[#004a94] hover:text-white'
                    : 'text-zinc-600'
                }
                onClick={() => setPlantUnit(u)}
                disabled={placementMode}
              >
                {u === 'PEDERTRACTOR' ? 'Unidade P' : 'Unidade T'}
              </Button>
            ))}
          </div>
          {canEditMachines ? (
            <span className="hidden lg:contents">
              {placementMode ? (
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  onClick={cancelPlacement}
                >
                  <X className="size-4" aria-hidden />
                  Cancelar posicionamento
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="default"
                  className="gap-2"
                  onClick={startPlacementMode}
                  disabled={cannotCreateMachine || mapInitialLoading}
                >
                  <Plus className="size-4" aria-hidden />
                  Nova máquina no mapa
                </Button>
              )}
            </span>
          ) : null}
          <div className="hidden items-center gap-1 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs text-zinc-600 sm:flex">
            <Move className="size-3.5 shrink-0" aria-hidden />
            {placementMode
              ? 'Clique no mapa para posicionar a nova máquina'
              : canEditMachines
                ? 'Arraste o mapa ou uma máquina · roda para zoom'
                : 'Arraste o mapa · roda do mouse para zoom'}
          </div>
          <Button
            type="button"
            variant="outline"
            className="hidden gap-2 lg:inline-flex"
            onClick={handleResetView}
          >
            <RotateCcw className="size-4" aria-hidden />
            Resetar visão
          </Button>
          <span className="hidden lg:contents">
            <PlantMapAreasToolbar
              canEdit={canEditMachines}
              areaEditMode={areaEditMode}
              areaDrawKind={areaDrawKind}
              areas={plantAreas}
              areaSaveBusy={areaSaveBusy}
              onOpenEdit={openAreaEdit}
              onCloseEdit={closeAreaEdit}
              onStartDraw={startAreaDraw}
              onCancelDraw={clearAreaDraw}
              onRemove={removePlantMapArea}
            />
          </span>
          {mapRefetching ? (
            <span className="text-xs text-zinc-500" aria-live="polite">
              Atualizando dados…
            </span>
          ) : null}
          {lastSyncLabel ? (
            <span
              className="hidden text-xs text-zinc-500 sm:inline"
              title="Última sincronização com a API"
            >
              Sincronizado {lastSyncLabel}
            </span>
          ) : null}
        </div>
      </header>

      {placementMode ? (
        <p className="hidden shrink-0 rounded-lg border border-[#005fb8]/30 bg-sky-50 px-3 py-2 text-xs text-sky-950 lg:block">
          <MapPin
            className="mr-1 inline size-3.5 align-text-bottom"
            aria-hidden
          />
          <strong>Modo posicionamento:</strong> clique no desenho da planta onde
          a nova máquina deve ficar. Pressione{' '}
          <kbd className="rounded border border-sky-200 bg-white px-1 font-mono text-[10px]">
            Esc
          </kbd>{' '}
          para cancelar.
        </p>
      ) : null}

      <div
        className={cn(
          'flex shrink-0 flex-wrap items-center gap-2 border-b border-zinc-100 pb-2',
          mobileDetailOpen && 'hidden lg:flex',
        )}
      >
        <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
          Legenda
        </span>
        <span className="text-[11px] text-zinc-500">
          (cor do ponto = situação da máquina)
        </span>
        <ul className="m-0 flex list-none flex-wrap gap-x-3 gap-y-1 p-0">
          {PLANT_MAP_LEGEND_ITEMS.map((item) => (
            <li
              key={item.key}
              className="flex items-center gap-1.5 text-[11px] text-zinc-700"
            >
              <span
                className="inline-block size-2.5 shrink-0 rounded-full border border-white shadow-sm"
                style={{ backgroundColor: item.color }}
                aria-hidden
              />
              {item.label}
            </li>
          ))}
        </ul>
        <span className="mx-1 hidden text-zinc-300 lg:inline" aria-hidden>
          |
        </span>
        <span className="hidden text-[11px] font-medium uppercase tracking-wide text-zinc-500 lg:inline">
          Áreas
        </span>
        <ul className="m-0 hidden list-none flex-wrap gap-x-3 gap-y-1 p-0 lg:flex">
          {plantMapAreaLegendItems().map((item) => (
            <li
              key={item.kind}
              className="flex items-center gap-1.5 text-[11px] text-zinc-700"
            >
              <span
                className="inline-block size-2.5 shrink-0 rounded-sm border border-white shadow-sm"
                style={{ backgroundColor: item.color }}
                aria-hidden
              />
              {item.label}
            </li>
          ))}
        </ul>
      </div>

      {areaEditMode ? (
        <p className="hidden shrink-0 rounded-lg border border-[#005fb8]/30 bg-sky-50 px-3 py-2 text-xs text-sky-950 lg:block">
          <strong>Edição de áreas:</strong> use os botões acima para desenhar
          recebimento (laranja) ou expedição (roxo) na planta da unidade
          selecionada. Cada tipo permite uma área por unidade.
        </p>
      ) : null}

      {replenishmentError ? (
        <p className="shrink-0 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Não foi possível atualizar a lista de pedidos; a lista de máquinas
          segue disponível.
        </p>
      ) : null}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 lg:flex-row">
        <div
          ref={containerRef}
          className={
            placementMode
              ? 'relative hidden min-h-0 min-w-0 flex-1 cursor-crosshair overflow-hidden rounded-xl border-2 border-[#005fb8] bg-white lg:block lg:min-h-[360px]'
              : 'relative hidden min-h-0 min-w-0 flex-1 overflow-hidden rounded-xl border border-zinc-200 bg-white lg:block lg:min-h-[360px]'
          }
        >
          {mapInitialLoading ? (
            <div className="flex h-full min-h-[240px] items-center justify-center text-sm text-zinc-500">
              Carregando máquinas…
            </div>
          ) : null}
          {machinesError && !mapStageReady ? (
            <div className="flex h-full min-h-[240px] flex-col items-center justify-center gap-2 p-4 text-center text-sm text-zinc-600">
              <p className="m-0 font-medium text-zinc-800">
                Não foi possível carregar as máquinas.
              </p>
              <p className="m-0 text-xs">
                Verifique a API e tente atualizar a página.
              </p>
            </div>
          ) : null}
          {!machinesError &&
          mapStageReady &&
          backgroundImage &&
          containerSize.width > 0 ? (
            <div
              className="absolute inset-0"
              role="application"
              aria-label={
                areaDrawKind
                  ? 'Arraste no mapa para desenhar a área de expedição ou recebimento.'
                  : placementMode
                    ? 'Clique no mapa para definir a posição da nova máquina.'
                    : 'Mapa interativo da planta: arraste para mover, use a roda do mouse para ampliar ou reduzir. Clique em um ponto para selecionar a máquina.'
              }
            >
              <PlantMapKonvaStage
                containerWidth={containerSize.width}
                containerHeight={containerSize.height}
                plantPixelWidth={plantDimensions.width}
                plantPixelHeight={plantDimensions.height}
                backgroundImage={backgroundImage}
                scale={scale}
                minScale={minScale}
                stagePos={stagePos}
                placedMachines={placedMachines}
                plantAreas={plantAreas}
                areaDraftRect={areaDraftRect}
                areaDrawKind={areaDrawKind}
                onAreaDrawStart={
                  canEditMachines ? handleAreaDrawStart : undefined
                }
                onAreaDrawMove={
                  canEditMachines ? handleAreaDrawMove : undefined
                }
                onAreaDrawEnd={canEditMachines ? handleAreaDrawEnd : undefined}
                selectedMachineId={selectedMachineId}
                canEditMachines={canEditMachines && !areaEditMode}
                placementMode={placementMode}
                placementMarker={placementMarker}
                savingMachineId={savingMachineId}
                onSelectMachine={(id) =>
                  setSelectedMachineId((prev) => (prev === id ? null : id))
                }
                onStagePosChange={setStagePos}
                onScaleChange={setScale}
                clampStagePos={clampStagePos}
                onPlantMapClick={
                  canEditMachines ? handlePlantMapClick : undefined
                }
                onMachinePositionCommit={
                  canEditMachines ? handleMachinePositionCommit : undefined
                }
              />
            </div>
          ) : null}
        </div>

        <aside className="flex min-h-0 min-w-0 w-full flex-1 flex-col gap-2 lg:w-[22rem] lg:max-w-[min(100%,22rem)] lg:flex-none">
          {mapInitialLoading ? (
            <p className="shrink-0 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600 lg:hidden">
              Carregando máquinas…
            </p>
          ) : null}
          {machinesError && !mapStageReady ? (
            <p className="shrink-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900 lg:hidden">
              Não foi possível carregar as máquinas. Verifique a API e atualize
              a página.
            </p>
          ) : null}
          <Card className="flex min-h-0 flex-1 flex-col overflow-hidden border border-zinc-200 p-0 shadow-sm lg:max-h-full">
            <div className="border-b border-zinc-100 px-3 py-2">
              <h2 className="m-0 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Máquinas
              </h2>
              <p className="mt-0.5 text-[11px] leading-snug text-zinc-500">
                Processo conforme pedido em aberto. Tempo desde a entrada no
                status atual.
              </p>
            </div>
            <ul
              ref={listRef}
              className="min-h-0 flex-1 list-none overflow-y-auto p-2"
            >
              {sidebarRows.length === 0 ? (
                <li className="px-2 py-4 text-center text-sm text-zinc-500">
                  Nenhuma máquina cadastrada.
                  {canEditMachines ? (
                    <>
                      {' '}
                      <span className="lg:hidden">
                        Cadastre máquinas na tela de máquinas.
                      </span>
                      <span className="hidden lg:inline">
                        Use <strong>Nova máquina no mapa</strong> para
                        adicionar.
                      </span>
                    </>
                  ) : null}
                </li>
              ) : (
                sidebarRows.map((row) => {
                  const active = row.machine.id === selectedMachineId;
                  return (
                    <li
                      key={row.machine.id}
                      data-machine-id={row.machine.id}
                      className="mb-1"
                    >
                      <button
                        type="button"
                        aria-pressed={active}
                        onClick={() => {
                          if (
                            window.matchMedia('(min-width: 1024px)').matches
                          ) {
                            setSelectedMachineId((prev) =>
                              prev === row.machine.id ? null : row.machine.id,
                            );
                          } else {
                            selectMachine(row.machine.id);
                          }
                        }}
                        className={cn(
                          'w-full rounded-lg px-3 py-2.5 text-left text-sm transition-colors active:scale-[0.99]',
                          active
                            ? 'border-2 border-[#005fb8] bg-sky-50 shadow-sm'
                            : 'border border-transparent hover:bg-zinc-50',
                        )}
                      >
                        <span className="flex items-start gap-2">
                          <span
                            className="mt-1.5 inline-block size-2.5 shrink-0 rounded-full border border-white shadow-sm"
                            style={{
                              backgroundColor: plantMapNodeFill(row.visualKey),
                            }}
                            aria-hidden
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block font-semibold text-zinc-900">
                              {row.machine.name}
                            </span>
                            <span className="mt-0.5 block text-xs text-zinc-600">
                              {row.processLabel}
                            </span>
                            <span className="mt-0.5 block text-[11px] text-zinc-500">
                              Há {row.sinceLabel} neste estado
                            </span>
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </Card>

          {selectedDetail ? (
            <Card className="hidden shrink-0 border border-zinc-200 p-3 shadow-sm lg:block">
              <PlantMapMachineDetail detail={selectedDetail} />
            </Card>
          ) : null}

          {/* {canEditMachines ? (
            <>
              <p className="m-0 hidden shrink-0 rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-2 py-2 text-[11px] leading-snug text-zinc-600 lg:block">
                <strong>Reposicionar:</strong> arraste o ponto da máquina no
                mapa — a posição é salva automaticamente.{' '}
                <strong>Nova máquina:</strong> use o botão no topo e clique no
                mapa.
              </p>
              <p
                className={cn(
                  'm-0 shrink-0 rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-2 py-2 text-[11px] leading-snug text-zinc-600 lg:hidden',
                  mobileDetailOpen && 'hidden',
                )}
              >
                Toque em uma máquina para ver processo e pedidos em aberto.
              </p>
            </>
          ) : (
            <p
              className={cn(
                'm-0 shrink-0 rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-2 py-2 text-[11px] leading-snug text-zinc-600',
                mobileDetailOpen && 'hidden lg:block',
              )}
            >
              <span className="lg:hidden">
                Toque em uma máquina para ver o detalhe da supervisão.
              </span>
              <span className="hidden lg:inline">
                Alterações de posição e cadastro no mapa exigem perfil de
                abastecimento, líder ou administrador.
              </span>
            </p>
          )} */}
        </aside>
      </div>

      <PlantMapMobileDetailSheet
        detail={selectedDetail}
        onClose={clearMachineSelection}
      />

      {newMachineDraft ? (
        <PlantMapCreateMachineModal
          open={createModalOpen}
          busy={createMachineMut.isPending}
          error={createError}
          draftNx={newMachineDraft.nx}
          draftNy={newMachineDraft.ny}
          name={createName}
          onNameChange={setCreateName}
          typeMachineId={createTypeMachineId}
          onTypeMachineIdChange={setCreateTypeMachineId}
          sectorId={createSectorId}
          onSectorIdChange={setCreateSectorId}
          types={typesQuery.data}
          sectors={sectorsForSelect}
          plantUnit={plantUnit}
          onClose={closeCreateModal}
          onSubmit={() => createMachineMut.mutate()}
        />
      ) : null}
    </section>
  );
}

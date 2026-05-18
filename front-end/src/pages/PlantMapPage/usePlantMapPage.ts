import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiServerOrigin } from '@/lib/api';
import { toast } from '@/lib/toast';
import { toastApiError } from '@/lib/toast-helpers';
import { ENV } from '@/constants/env';
import { PLANT_IMAGE_BY_UNIT, type PlantMapUnit } from '@/constants/plant-map';
import { createMachine, fetchMachines, updateMachine } from '@/services/machines-api';
import { fetchReplenishmentRequests } from '@/services/machine-replenishment-requests-api';
import {
  deletePlantMapArea,
  fetchPlantMapAreas,
  upsertPlantMapArea,
} from '@/services/plant-map-areas-api';
import { fetchSectors } from '@/services/sectors-api';
import { fetchTypeMachines } from '@/services/type-machines-api';
import { useAuthStore } from '@/store/auth.store';
import type { AppRole } from '@/types/role.types';
import { MACHINE_DOMAIN_ROLES } from '@/types/role.types';
import type { PlantMapAreaKindValue } from '@/types/plant-map-area.types';
import type { MachineListItem, SectorListItem } from '@/types/machine.types';
import { normalizedRectFromCorners } from '@/utils/plantMapAreaGeometry';
import { formatDurationSincePt } from '@/utils/formatDurationSincePt';
import {
  formatMapPlacement,
  layoutMapSlotsNormalized,
  parseMapPlacementFromPosition,
} from '@/utils/mapPlantPosition';
import { summarizeMachineProcess } from '@/utils/plantMapMachineProcess';
import {
  clampPlantMapStagePos,
  computePlantMapFitScale,
  computePlantMapInitialTransform,
} from '@/utils/plantMapStageGeometry';
import type { PlantMapAreaDraftRect, PlantMapPlacedMachine } from './PlantMapKonvaStage';

/** Cache por unidade: troca P↔T instantânea sem novo loading visível. */
const PLANT_MAP_QUERY_STALE_MS = 60_000;
const PLANT_MAP_MAX_SCALE = 2;

interface MapViewport {
  scale: number;
  stagePos: { x: number; y: number };
}

function typeMachineImageSrc(urlImage: string): string {
  if (urlImage.startsWith('http://') || urlImage.startsWith('https://')) {
    return urlImage;
  }
  return `${apiServerOrigin()}${urlImage.startsWith('/') ? urlImage : `/${urlImage}`}`;
}

function useApiReady(): boolean {
  const token = useAuthStore((s) => s.token);
  return Boolean(ENV.API_URL && token);
}

function sectorsForForms(
  userSectorId: string | null | undefined,
  userSectorLabel: string | undefined,
  apiSectors: SectorListItem[] | undefined,
  sectorsError: boolean,
): SectorListItem[] {
  if (apiSectors !== undefined && apiSectors.length > 0) {
    return apiSectors;
  }
  if (userSectorId && sectorsError) {
    return [{ id: userSectorId, typeSector: userSectorLabel ?? 'Seu setor' }];
  }
  if (userSectorId && (apiSectors === undefined || apiSectors.length === 0)) {
    return [{ id: userSectorId, typeSector: userSectorLabel ?? 'Seu setor' }];
  }
  return apiSectors ?? [];
}

export function usePlantMapPage() {
  const queryClient = useQueryClient();
  const apiReady = useApiReady();
  const user = useAuthStore((s) => s.user);
  const canEditMachines =
    user?.role != null && MACHINE_DOMAIN_ROLES.includes(user.role as AppRole);
  const [plantUnit, setPlantUnit] = useState<PlantMapUnit>('PEDERTRACTOR');
  const [backgroundImage, setBackgroundImage] = useState<HTMLImageElement | null>(null);
  const [plantDimensions, setPlantDimensions] = useState({ width: 1200, height: 800 });
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const [viewport, setViewport] = useState<MapViewport>({
    scale: 1,
    stagePos: { x: 0, y: 0 },
  });
  const [selectedMachineId, setSelectedMachineId] = useState<string | null>(null);
  const [positionOverrides, setPositionOverrides] = useState<
    Record<string, { nx: number; ny: number }>
  >({});
  const [savingMachineId, setSavingMachineId] = useState<string | null>(null);
  const [placementMode, setPlacementMode] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newMachineDraft, setNewMachineDraft] = useState<{ nx: number; ny: number } | null>(null);
  const [createName, setCreateName] = useState('');
  const [createTypeMachineId, setCreateTypeMachineId] = useState('');
  const [createSectorId, setCreateSectorId] = useState('');
  const [areaEditMode, setAreaEditMode] = useState(false);
  const [areaDrawKind, setAreaDrawKind] = useState<PlantMapAreaKindValue | null>(null);
  const [areaDraftRect, setAreaDraftRect] = useState<PlantMapAreaDraftRect | null>(null);
  const areaDrawStartRef = useRef<{ nx: number; ny: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  /**
   * Planta para a qual já aplicamos o encaixe inicial no container atual.
   * Atualiza só dentro do rAF após `setViewport` (evita Strict Mode cancelar o rAF com ref já setado).
   * Não reagimos a resize: em letterbox, `clamp` fixava y no centro e qualquer oscilação de altura
   * (flex, sidebar, scrollbar) fazia o mapa “fugir” na vertical.
   */
  const fittedPlantKeyRef = useRef<string | null>(null);
  /** Por eixo: em letterbox, mantém posição estável (evita “fuga” com dragBoundFunc + container a oscilar). */
  const letterboxFreezeXRef = useRef<number | null>(null);
  const letterboxFreezeYRef = useRef<number | null>(null);

  useEffect(() => {
    setSelectedMachineId(null);
    setPlacementMode(false);
    setNewMachineDraft(null);
    setCreateModalOpen(false);
  }, [plantUnit]);

  useEffect(() => {
    const img = new window.Image();
    img.src = PLANT_IMAGE_BY_UNIT[plantUnit];
    img.onload = () => {
      fittedPlantKeyRef.current = null;
      letterboxFreezeXRef.current = null;
      letterboxFreezeYRef.current = null;
      setBackgroundImage(img);
      setPlantDimensions({ width: img.width, height: img.height });
    };
  }, [plantUnit]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) {
      return;
    }
    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      const width = Math.max(0, Math.round(rect.width));
      const height = Math.max(0, Math.round(rect.height));
      setContainerSize((prev) =>
        prev.width === width && prev.height === height ? prev : { width, height },
      );
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const contentWidth = plantDimensions.width;
  const contentHeight = plantDimensions.height;

  const minScale = useMemo(
    () =>
      computePlantMapFitScale(
        contentWidth,
        contentHeight,
        containerSize.width,
        containerSize.height,
      ),
    [contentWidth, contentHeight, containerSize.width, containerSize.height],
  );

  /** Encaixe inicial ao carregar imagem/trocar planta; não reencaixa em resize (evita drift vertical). */
  useEffect(() => {
    if (!backgroundImage || containerSize.width <= 0 || containerSize.height <= 0) {
      return;
    }
    const plantKey = `${plantUnit}-${plantDimensions.width}x${plantDimensions.height}`;
    if (fittedPlantKeyRef.current === plantKey) {
      return;
    }

    const { scale: initialScale, x, y } = computePlantMapInitialTransform(
      plantDimensions.width,
      plantDimensions.height,
      containerSize.width,
      containerSize.height,
    );

    const id = requestAnimationFrame(() => {
      letterboxFreezeXRef.current = x;
      letterboxFreezeYRef.current = y;
      setViewport({ scale: initialScale, stagePos: { x, y } });
      fittedPlantKeyRef.current = plantKey;
    });
    return () => cancelAnimationFrame(id);
  }, [
    backgroundImage,
    plantDimensions.height,
    plantDimensions.width,
    plantUnit,
    containerSize.height,
    containerSize.width,
  ]);

  const clampStagePos = useCallback(
    (pos: { x: number; y: number }, scaleOverride?: number) => {
      const scale = scaleOverride ?? viewport.scale;
      const scaledW = contentWidth * scale;
      const scaledH = contentHeight * scale;
      const cw = containerSize.width;
      const ch = containerSize.height;
      if (scaledW > cw) {
        letterboxFreezeXRef.current = null;
      }
      if (scaledH > ch) {
        letterboxFreezeYRef.current = null;
      }

      const result = clampPlantMapStagePos(
        pos,
        {
          scale,
          contentWidth,
          contentHeight,
          containerWidth: cw,
          containerHeight: ch,
        },
        {
          x: scaledW <= cw ? letterboxFreezeXRef.current : null,
          y: scaledH <= ch ? letterboxFreezeYRef.current : null,
        },
      );

      if (scaledW <= cw && letterboxFreezeXRef.current == null) {
        letterboxFreezeXRef.current = result.x;
      }
      if (scaledH <= ch && letterboxFreezeYRef.current == null) {
        letterboxFreezeYRef.current = result.y;
      }

      return result;
    },
    [contentWidth, contentHeight, viewport.scale, containerSize],
  );

  const handleResetView = useCallback(() => {
    if (containerSize.width <= 0 || containerSize.height <= 0) {
      return;
    }
    const { scale: initialScale, x, y } = computePlantMapInitialTransform(
      plantDimensions.width,
      plantDimensions.height,
      containerSize.width,
      containerSize.height,
    );
    letterboxFreezeXRef.current = x;
    letterboxFreezeYRef.current = y;
    setViewport({ scale: initialScale, stagePos: { x, y } });
  }, [plantDimensions, containerSize]);

  const setScale = useCallback(
    (next: number) => {
      const clamped = Math.max(minScale, Math.min(PLANT_MAP_MAX_SCALE, next));
      setViewport((v) => ({ ...v, scale: clamped }));
    },
    [minScale],
  );

  useEffect(() => {
    setViewport((v) => {
      if (v.scale >= minScale) {
        return v;
      }
      const stagePos = clampPlantMapStagePos(
        v.stagePos,
        {
          scale: minScale,
          contentWidth,
          contentHeight,
          containerWidth: containerSize.width,
          containerHeight: containerSize.height,
        },
        {
          x: letterboxFreezeXRef.current,
          y: letterboxFreezeYRef.current,
        },
      );
      letterboxFreezeXRef.current = stagePos.x;
      letterboxFreezeYRef.current = stagePos.y;
      return { scale: minScale, stagePos };
    });
  }, [minScale, contentWidth, contentHeight, containerSize.width, containerSize.height]);

  const setStagePos = useCallback((next: { x: number; y: number }) => {
    setViewport((v) => ({ ...v, stagePos: next }));
  }, []);

  const machinesQuery = useQuery({
    queryKey: ['machines', 'plant-map', plantUnit],
    queryFn: () => fetchMachines({ plantUnit }),
    enabled: apiReady,
    staleTime: PLANT_MAP_QUERY_STALE_MS,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  const replenishmentQuery = useQuery({
    queryKey: ['machine-replenishment-requests', 'plant-map'],
    queryFn: () => fetchReplenishmentRequests(),
    enabled: apiReady,
    staleTime: PLANT_MAP_QUERY_STALE_MS,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  const areasQuery = useQuery({
    queryKey: ['plant-map-areas', plantUnit],
    queryFn: () => fetchPlantMapAreas(plantUnit),
    enabled: apiReady,
    staleTime: PLANT_MAP_QUERY_STALE_MS,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!apiReady) {
      return;
    }
    const units: PlantMapUnit[] = ['PEDERTRACTOR', 'TRACTOR'];
    for (const unit of units) {
      void queryClient.prefetchQuery({
        queryKey: ['machines', 'plant-map', unit],
        queryFn: () => fetchMachines({ plantUnit: unit }),
        staleTime: PLANT_MAP_QUERY_STALE_MS,
      });
      void queryClient.prefetchQuery({
        queryKey: ['plant-map-areas', unit],
        queryFn: () => fetchPlantMapAreas(unit),
        staleTime: PLANT_MAP_QUERY_STALE_MS,
      });
    }
  }, [apiReady, queryClient]);

  const plantAreas = useMemo(() => areasQuery.data ?? [], [areasQuery.data]);

  /** Atualiza textos “há X min” sem novo request (cores vêm do refetch acima). */
  const [durationTick, setDurationTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setDurationTick((n) => n + 1), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const sectorsQuery = useQuery({
    queryKey: ['sectors'],
    queryFn: fetchSectors,
    enabled: apiReady && canEditMachines,
    retry: false,
  });

  const typesQuery = useQuery({
    queryKey: ['type-machines'],
    queryFn: fetchTypeMachines,
    enabled: apiReady && canEditMachines,
  });

  const sectorsForSelect = sectorsForForms(
    user?.sectorId ?? undefined,
    user?.sector?.typeSector,
    sectorsQuery.data,
    sectorsQuery.isError,
  );

  const cannotCreateMachine =
    canEditMachines &&
    apiReady &&
    sectorsQuery.isSuccess &&
    typesQuery.isSuccess &&
    (sectorsForSelect.length === 0 || (typesQuery.data?.length ?? 0) === 0);

  const machinesSorted = useMemo(() => {
    const list = machinesQuery.data ?? [];
    return [...list].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [machinesQuery.data]);

  const machineIdsForUnit = useMemo(
    () => new Set(machinesSorted.map((m) => m.id)),
    [machinesSorted],
  );

  const requests = useMemo(() => {
    const all = replenishmentQuery.data ?? [];
    if (machineIdsForUnit.size === 0) {
      return [];
    }
    return all.filter((r) => machineIdsForUnit.has(r.destinationId));
  }, [replenishmentQuery.data, machineIdsForUnit]);

  const placedMachines: PlantMapPlacedMachine[] = useMemo(() => {
    const slots = layoutMapSlotsNormalized(machinesSorted.length, 4);
    return machinesSorted.map((m, i) => {
      const override = positionOverrides[m.id];
      const parsed = parseMapPlacementFromPosition(m.position);
      const nx = override?.nx ?? parsed?.nx ?? slots[i]?.nx ?? 0.5;
      const ny = override?.ny ?? parsed?.ny ?? slots[i]?.ny ?? 0.5;
      const summary = summarizeMachineProcess(m, requests);
      return {
        machineId: m.id,
        name: m.name,
        nx,
        ny,
        visualKey: summary.visualKey,
      };
    });
  }, [machinesSorted, requests, positionOverrides]);

  const savePositionMut = useMutation({
    mutationFn: async ({
      machineId,
      nx,
      ny,
    }: {
      machineId: string;
      nx: number;
      ny: number;
    }) => {
      return updateMachine(machineId, { position: formatMapPlacement(nx, ny) });
    },
    onMutate: ({ machineId, nx, ny }) => {
      setSavingMachineId(machineId);
      setPositionOverrides((prev) => ({ ...prev, [machineId]: { nx, ny } }));
    },
    onSuccess: (updated, { machineId }) => {
      queryClient.setQueriesData<MachineListItem[]>({ queryKey: ['machines'] }, (old) => {
        if (!old) {
          return old;
        }
        return old.map((m) =>
          m.id === machineId ? { ...m, position: updated.position } : m,
        );
      });
      setPositionOverrides((prev) => {
        const next = { ...prev };
        delete next[machineId];
        return next;
      });
      toast.success('Posição da máquina salva.');
    },
    onError: (error, { machineId }) => {
      setPositionOverrides((prev) => {
        const next = { ...prev };
        delete next[machineId];
        return next;
      });
      toastApiError(error instanceof Error ? error : new Error('Erro ao salvar posição.'));
    },
    onSettled: () => {
      setSavingMachineId(null);
    },
  });

  const createMachineMut = useMutation({
    mutationFn: async () => {
      if (!newMachineDraft) {
        throw new Error('Clique no mapa para definir a posição.');
      }
      const n = createName.trim();
      if (!n) {
        throw new Error('Informe o nome da máquina.');
      }
      if (!createTypeMachineId || !createSectorId) {
        throw new Error('Selecione o tipo e o setor.');
      }
      return createMachine({
        name: n,
        position: formatMapPlacement(newMachineDraft.nx, newMachineDraft.ny),
        plantUnit,
        typeMachineId: createTypeMachineId,
        sectorId: createSectorId,
      });
    },
    onSuccess: (created) => {
      queryClient.setQueryData<MachineListItem[]>(
        ['machines', 'plant-map', plantUnit],
        (old) => {
          if (!old) {
            return [created];
          }
          if (old.some((m) => m.id === created.id)) {
            return old;
          }
          return [...old, created];
        },
      );
      setCreateModalOpen(false);
      setPlacementMode(false);
      setNewMachineDraft(null);
      setCreateName('');
      setCreateTypeMachineId('');
      setCreateSectorId('');
      setSelectedMachineId(created.id);
      toast.success('Máquina cadastrada no mapa.');
    },
    onError: toastApiError,
  });

  const handleMachinePositionCommit = useCallback(
    (machineId: string, nx: number, ny: number) => {
      if (!canEditMachines) {
        return;
      }
      savePositionMut.mutate({ machineId, nx, ny });
    },
    [canEditMachines, savePositionMut],
  );

  const resetCreateForm = useCallback(() => {
    setCreateName('');
    setCreateTypeMachineId('');
    setCreateSectorId('');
    setNewMachineDraft(null);
  }, []);

  const cancelPlacement = useCallback(() => {
    setPlacementMode(false);
    setCreateModalOpen(false);
    resetCreateForm();
  }, [resetCreateForm]);

  const clearAreaDraw = useCallback(() => {
    areaDrawStartRef.current = null;
    setAreaDraftRect(null);
    setAreaDrawKind(null);
  }, []);

  const openAreaEdit = useCallback(() => {
    setPlacementMode(false);
    setNewMachineDraft(null);
    setCreateModalOpen(false);
    setAreaEditMode(true);
    clearAreaDraw();
  }, [clearAreaDraw]);

  const closeAreaEdit = useCallback(() => {
    setAreaEditMode(false);
    clearAreaDraw();
  }, [clearAreaDraw]);

  const startAreaDraw = useCallback((kind: PlantMapAreaKindValue) => {
    setPlacementMode(false);
    setNewMachineDraft(null);
    setAreaDrawKind(kind);
    areaDrawStartRef.current = null;
    setAreaDraftRect(null);
    toast.message('Desenhe no mapa', {
      description: `Clique e arraste para delimitar a área de ${kind === 'RECEIVING' ? 'recebimento' : 'expedição'}.`,
    });
  }, []);

  const upsertAreaMut = useMutation({
    mutationFn: upsertPlantMapArea,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plant-map-areas', plantUnit] });
      toast.success('Área salva no mapa.');
      clearAreaDraw();
    },
    onError: toastApiError,
  });

  const deleteAreaMut = useMutation({
    mutationFn: deletePlantMapArea,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plant-map-areas', plantUnit] });
      toast.success('Área removida.');
    },
    onError: toastApiError,
  });

  const handleAreaDrawStart = useCallback(
    (nx: number, ny: number) => {
      if (!areaDrawKind) {
        return;
      }
      areaDrawStartRef.current = { nx, ny };
      setAreaDraftRect({ nx, ny, nw: 0.001, nh: 0.001, kind: areaDrawKind });
    },
    [areaDrawKind],
  );

  const handleAreaDrawMove = useCallback(
    (nx: number, ny: number) => {
      const start = areaDrawStartRef.current;
      if (!start || !areaDrawKind) {
        return;
      }
      const rect = normalizedRectFromCorners(start.nx, start.ny, nx, ny);
      if (rect) {
        setAreaDraftRect({ ...rect, kind: areaDrawKind });
      }
    },
    [areaDrawKind],
  );

  const handleAreaDrawEnd = useCallback(
    (nx: number, ny: number) => {
      const start = areaDrawStartRef.current;
      if (!start || !areaDrawKind) {
        clearAreaDraw();
        return;
      }
      const rect = normalizedRectFromCorners(start.nx, start.ny, nx, ny);
      areaDrawStartRef.current = null;
      setAreaDraftRect(null);
      if (!rect) {
        toast.error('Área muito pequena. Arraste um retângulo maior.');
        return;
      }
      upsertAreaMut.mutate({
        plantUnit,
        kind: areaDrawKind,
        ...rect,
      });
    },
    [areaDrawKind, plantUnit, upsertAreaMut, clearAreaDraw],
  );

  const removePlantMapArea = useCallback(
    (kind: PlantMapAreaKindValue) => {
      const row = plantAreas.find((a) => a.kind === kind);
      if (!row) {
        return;
      }
      deleteAreaMut.mutate(row.id);
    },
    [plantAreas, deleteAreaMut],
  );

  useEffect(() => {
    setAreaEditMode(false);
    clearAreaDraw();
  }, [plantUnit, clearAreaDraw]);

  const startPlacementMode = useCallback(() => {
    if (cannotCreateMachine) {
      toast.message('Cadastro indisponível', {
        description: 'Cadastre ao menos um tipo de máquina e um setor antes de criar no mapa.',
      });
      return;
    }
    resetCreateForm();
    setAreaEditMode(false);
    clearAreaDraw();
    setPlacementMode(true);
    setCreateModalOpen(false);
    toast.message('Clique no mapa', {
      description: 'Escolha o ponto onde a nova máquina ficará.',
    });
  }, [cannotCreateMachine, resetCreateForm, clearAreaDraw]);

  const handlePlantMapClick = useCallback(
    (nx: number, ny: number) => {
      setNewMachineDraft({ nx, ny });
      setCreateModalOpen(true);
      setPlacementMode(false);
      if (sectorsForSelect.length === 1) {
        setCreateSectorId(sectorsForSelect[0].id);
      } else if (user?.sectorId) {
        const match = sectorsForSelect.find((s) => s.id === user.sectorId);
        if (match) {
          setCreateSectorId(match.id);
        }
      }
      if (typesQuery.data?.length === 1) {
        setCreateTypeMachineId(typesQuery.data[0].id);
      }
    },
    [sectorsForSelect, typesQuery.data, user?.sectorId],
  );

  const closeCreateModal = useCallback(() => {
    if (createMachineMut.isPending) {
      return;
    }
    setCreateModalOpen(false);
    resetCreateForm();
  }, [createMachineMut.isPending, resetCreateForm]);

  useEffect(() => {
    if (!placementMode) {
      return;
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cancelPlacement();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [placementMode, cancelPlacement]);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const exitMapOnlyModes = () => {
      if (!mq.matches) {
        cancelPlacement();
        closeAreaEdit();
      }
    };
    exitMapOnlyModes();
    mq.addEventListener('change', exitMapOnlyModes);
    return () => mq.removeEventListener('change', exitMapOnlyModes);
  }, [cancelPlacement, closeAreaEdit]);

  const machinesWithExplicitMapCount = useMemo(
    () => machinesSorted.filter((m) => parseMapPlacementFromPosition(m.position) !== null).length,
    [machinesSorted],
  );

  const sidebarRows = useMemo(() => {
    return machinesSorted.map((m) => {
      const summary = summarizeMachineProcess(m, requests);
      return {
        machine: m,
        processLabel: summary.processLabel,
        sinceLabel: summary.sinceIso ? formatDurationSincePt(summary.sinceIso) : '—',
        visualKey: summary.visualKey,
        openRequest: summary.openRequest,
      };
    });
  }, [machinesSorted, requests, durationTick]);

  const selectedMachine = useMemo(() => {
    if (!selectedMachineId) {
      return null;
    }
    return machinesSorted.find((m) => m.id === selectedMachineId) ?? null;
  }, [machinesSorted, selectedMachineId]);

  const selectedDetail = useMemo(() => {
    if (!selectedMachine) {
      return null;
    }
    const summary = summarizeMachineProcess(selectedMachine, requests);
    return {
      machine: selectedMachine,
      processLabel: summary.processLabel,
      sinceLabel: summary.sinceIso ? formatDurationSincePt(summary.sinceIso) : '—',
      typeImageSrc: typeMachineImageSrc(selectedMachine.typeMachine.urlImage),
      openRequest: summary.openRequest,
      hasMapPlacement: parseMapPlacementFromPosition(selectedMachine.position) !== null,
      visualKey: summary.visualKey,
    };
  }, [selectedMachine, requests, durationTick]);

  const mapInitialLoading =
    machinesQuery.isLoading && machinesQuery.data === undefined;

  const mapStageReady = Boolean(machinesQuery.data) || machinesQuery.isSuccess;

  /** Só refetch em segundo plano da unidade atual — não inclui lista global de pedidos. */
  const mapRefetching = machinesQuery.isRefetching || areasQuery.isRefetching;

  const dataUpdatedAt = Math.max(
    machinesQuery.dataUpdatedAt ?? 0,
    replenishmentQuery.dataUpdatedAt ?? 0,
    areasQuery.dataUpdatedAt ?? 0,
  );

  const areaSaveBusy = upsertAreaMut.isPending || deleteAreaMut.isPending;

  const createError =
    createMachineMut.error instanceof Error ? createMachineMut.error.message : null;

  return {
    canEditMachines,
    placementMode,
    placementMarker: newMachineDraft,
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
    containerSize,
    backgroundImage,
    plantDimensions,
    scale: viewport.scale,
    minScale,
    setScale,
    stagePos: viewport.stagePos,
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
    machinesError: machinesQuery.isError,
    replenishmentError: replenishmentQuery.isError,
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
    contentWidth,
    contentHeight,
    machinesWithExplicitMapCount,
    mapRefetching,
    dataUpdatedAt,
  };
}

export type PlantMapPageViewModel = ReturnType<typeof usePlantMapPage>;

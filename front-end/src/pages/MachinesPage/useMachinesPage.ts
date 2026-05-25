import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { plantMapCreateMachinePath } from '@/constants/plant-map-routes';
import { toast } from '@/lib/toast';
import { ENV } from '@/constants/env';
import { toastApiError } from '@/lib/toast-helpers';
import {
  createMachine,
  deleteMachine,
  fetchMachines,
  updateMachine,
} from '@/services/machines-api';
import { fetchSectors } from '@/services/sectors-api';
import { fetchTypeMachines } from '@/services/type-machines-api';
import { useAuthStore } from '@/store/auth.store';
import type { PlantMapUnit } from '@/constants/plant-map';
import { PLANT_MAP_UNIT_SHORT_LABEL } from '@/constants/plant-map';
import type { MachineListItem, SectorListItem } from '@/types/machine.types';

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

export function useMachinesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const apiReady = useApiReady();
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);

  const sectorsQuery = useQuery({
    queryKey: ['sectors'],
    queryFn: fetchSectors,
    enabled: apiReady,
    retry: false,
  });

  const sectorsForSelect = sectorsForForms(
    user?.sectorId ?? undefined,
    user?.sector?.typeSector,
    sectorsQuery.data,
    sectorsQuery.isError,
  );

  const typesQuery = useQuery({
    queryKey: ['type-machines'],
    queryFn: fetchTypeMachines,
    enabled: apiReady,
  });

  const [sectorFilter, setSectorFilter] = useState('');
  const [plantUnitFilter, setPlantUnitFilter] = useState<'' | PlantMapUnit>('');

  const machinesQuery = useQuery({
    queryKey: ['machines', sectorFilter, plantUnitFilter],
    queryFn: () =>
      fetchMachines({
        sectorId: sectorFilter || undefined,
        plantUnit: plantUnitFilter || undefined,
      }),
    enabled: apiReady,
  });

  const sectorsEmpty =
    apiReady &&
    sectorsQuery.isSuccess &&
    (sectorsQuery.data?.length ?? 0) === 0 &&
    sectorsForSelect.length === 0;
  const typesEmpty =
    apiReady && typesQuery.isSuccess && (typesQuery.data?.length ?? 0) === 0;
  const cannotCreateMachine = sectorsEmpty || typesEmpty;

  const [createOpen, setCreateOpen] = useState(false);
  const [editRow, setEditRow] = useState<MachineListItem | null>(null);
  const [deleteRow, setDeleteRow] = useState<MachineListItem | null>(null);

  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [typeMachineId, setTypeMachineId] = useState('');
  const [sectorId, setSectorId] = useState('');
  const [userId, setUserId] = useState('');
  const [plantUnit, setPlantUnit] = useState<PlantMapUnit>('PEDERTRACTOR');

  const resetForm = useCallback(() => {
    setName('');
    setPosition('');
    setTypeMachineId('');
    setSectorId('');
    setUserId('');
    setPlantUnit('PEDERTRACTOR');
  }, []);

  const goToMapToCreateMachine = useCallback(() => {
    if (cannotCreateMachine) {
      toast.message('Cadastro indisponível', {
        description:
          'Cadastre ao menos um tipo de máquina e um setor antes de criar no mapa.',
      });
      return;
    }
    navigate(
      plantMapCreateMachinePath(
        plantUnitFilter === '' ? undefined : plantUnitFilter,
      ),
    );
  }, [cannotCreateMachine, navigate, plantUnitFilter]);

  const openEdit = (row: MachineListItem) => {
    setName(row.name);
    setPosition(row.position);
    setPlantUnit(row.plantUnit);
    setTypeMachineId(row.typeMachineId);
    setSectorId(row.sectorId);
    setUserId(row.userId ?? '');
    setEditRow(row);
  };

  const editMachineLive = useMemo(() => {
    if (!editRow) {
      return null;
    }
    return machinesQuery.data?.find((m) => m.id === editRow.id) ?? editRow;
  }, [editRow, machinesQuery.data]);

  const editOperator = editMachineLive?.user ?? null;

  const createMut = useMutation({
    mutationFn: async () => {
      const n = name.trim();
      const p = position.trim();
      if (!n || !p) {
        throw new Error('Nome e posição são obrigatórios.');
      }
      if (!typeMachineId || !sectorId) {
        throw new Error('Selecione o tipo e o setor.');
      }
      return createMachine({
        name: n,
        position: p,
        plantUnit,
        typeMachineId,
        sectorId,
        userId: userId.trim() === '' ? undefined : userId.trim(),
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['machines'] });
      setCreateOpen(false);
      resetForm();
      toast.success('Máquina cadastrada.');
    },
    onError: toastApiError,
  });

  const updateMut = useMutation({
    mutationFn: async () => {
      if (!editRow) {
        throw new Error('Sem registro.');
      }
      const n = name.trim();
      const p = position.trim();
      if (!n || !p) {
        throw new Error('Nome e posição são obrigatórios.');
      }
      if (!typeMachineId || !sectorId) {
        throw new Error('Selecione o tipo e o setor.');
      }
      return updateMachine(editRow.id, {
        name: n,
        position: p,
        plantUnit,
        typeMachineId,
        sectorId,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['machines'] });
      setEditRow(null);
      resetForm();
      toast.success('Máquina atualizada.');
    },
    onError: toastApiError,
  });

  const unlinkOperatorMut = useMutation({
    mutationFn: async () => {
      if (!editRow) {
        throw new Error('Sem máquina selecionada.');
      }
      return updateMachine(editRow.id, { userId: null });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['machines'] });
      setEditRow((prev) =>
        prev ? { ...prev, userId: null, user: null } : null,
      );
      setUserId('');
      toast.success('Operador desvinculado da máquina.');
    },
    onError: toastApiError,
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => deleteMachine(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['machines'] });
      setDeleteRow(null);
      toast.success('Máquina excluída.');
    },
    onError: toastApiError,
  });

  const busy =
    createMut.isPending ||
    updateMut.isPending ||
    deleteMut.isPending ||
    unlinkOperatorMut.isPending;
  const createError =
    createMut.error instanceof Error ? createMut.error.message : null;
  const updateError =
    updateMut.error instanceof Error ? updateMut.error.message : null;

  return {
    apiReady,
    token,
    sectorsQuery,
    sectorsForSelect,
    typesQuery,
    sectorFilter,
    setSectorFilter,
    plantUnitFilter,
    setPlantUnitFilter,
    plantUnit,
    setPlantUnit,
    plantUnitLabel: PLANT_MAP_UNIT_SHORT_LABEL,
    machinesQuery,
    sectorsEmpty,
    typesEmpty,
    cannotCreateMachine,
    createOpen,
    setCreateOpen,
    editRow,
    setEditRow,
    editOperator,
    deleteRow,
    setDeleteRow,
    name,
    setName,
    position,
    setPosition,
    typeMachineId,
    setTypeMachineId,
    sectorId,
    setSectorId,
    userId,
    setUserId,
    unlinkOperatorMut,
    goToMapToCreateMachine,
    openEdit,
    createMut,
    updateMut,
    deleteMut,
    busy,
    createError,
    updateError,
  };
}

export type MachinesPageViewModel = ReturnType<typeof useMachinesPage>;

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from '@/lib/toast';
import { ENV } from '@/constants/env';
import { toastApiError } from '@/lib/toast-helpers';
import {
  createMachineStreet,
  deleteMachineStreet,
  fetchMachineStreets,
  updateMachineStreet,
} from '@/services/machine-streets-api';
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
import { hasAdminPrivileges } from '@/types/role.types';
import type {
  MachineListItem,
  MachineStreetListItem,
  SectorListItem,
} from '@/types/machine.types';

function useApiReady(): boolean {
  const token = useAuthStore((s) => s.token);
  return Boolean(ENV.API_URL && token);
}

function invalidateMachineListQueries(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: ['machines'] });
  void queryClient.invalidateQueries({
    queryKey: ['operator-machine', 'machines'],
  });
}

function invalidateStreetQueries(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: ['machine-streets'] });
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

const DEFAULT_STREET_COLOR = '#2563eb';

export function useMachinesPage() {
  const queryClient = useQueryClient();
  const apiReady = useApiReady();
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const isAdmin = hasAdminPrivileges(user?.role);

  const sectorsQuery = useQuery({
    queryKey: ['sectors'],
    queryFn: fetchSectors,
    enabled: apiReady,
    retry: false,
  });

  const sectorsForSelect = useMemo(() => {
    const all = sectorsForForms(
      user?.sectorId ?? undefined,
      user?.sector?.typeSector,
      sectorsQuery.data,
      sectorsQuery.isError,
    );
    if (isAdmin) {
      return all;
    }
    if (!user?.sectorId) {
      return [];
    }
    return all.filter((s) => s.id === user.sectorId);
  }, [
    isAdmin,
    user?.sectorId,
    user?.sector?.typeSector,
    sectorsQuery.data,
    sectorsQuery.isError,
  ]);

  const typesQuery = useQuery({
    queryKey: ['type-machines'],
    queryFn: fetchTypeMachines,
    enabled: apiReady,
  });

  const [sectorFilter, setSectorFilter] = useState('');
  const [plantUnitFilter, setPlantUnitFilter] = useState<'' | PlantMapUnit>('');

  useEffect(() => {
    if (!isAdmin && user?.sectorId) {
      setSectorFilter(user.sectorId);
    }
  }, [isAdmin, user?.sectorId]);

  const machinesQuery = useQuery({
    queryKey: [
      'machines',
      isAdmin ? sectorFilter : (user?.sectorId ?? ''),
      plantUnitFilter,
    ],
    queryFn: () =>
      fetchMachines({
        sectorId: isAdmin
          ? sectorFilter || undefined
          : (user?.sectorId ?? undefined),
        plantUnit: plantUnitFilter || undefined,
      }),
    enabled: apiReady && (isAdmin || Boolean(user?.sectorId)),
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
  const [streetCreateOpen, setStreetCreateOpen] = useState(false);
  const [streetEditRow, setStreetEditRow] =
    useState<MachineStreetListItem | null>(null);
  const [deleteStreetRow, setDeleteStreetRow] =
    useState<MachineStreetListItem | null>(null);

  const [name, setName] = useState('');
  const [assetNumber, setAssetNumber] = useState('');
  const [pillar, setPillar] = useState('');
  const [typeMachineId, setTypeMachineId] = useState('');
  const [sectorId, setSectorId] = useState('');
  const [machineStreetId, setMachineStreetId] = useState('');
  const [userId, setUserId] = useState('');
  const [plantUnit, setPlantUnit] = useState<PlantMapUnit>('PEDERTRACTOR');

  const [streetName, setStreetName] = useState('');
  const [streetColor, setStreetColor] = useState(DEFAULT_STREET_COLOR);
  const [streetSectorId, setStreetSectorId] = useState('');

  /** Setor usado no select de rua do create/edit de máquina. */
  const machineStreetsSectorId = useMemo(() => {
    if (createOpen || editRow) {
      return sectorId || undefined;
    }
    if (!isAdmin) {
      return user?.sectorId ?? undefined;
    }
    return sectorFilter || undefined;
  }, [
    createOpen,
    editRow,
    sectorId,
    isAdmin,
    user?.sectorId,
    sectorFilter,
  ]);

  /** Setor da lista dentro do dialog de ruas. */
  const dialogStreetsSectorId = useMemo(() => {
    if (!streetCreateOpen) {
      return undefined;
    }
    if (isAdmin) {
      return streetSectorId || undefined;
    }
    return user?.sectorId ?? undefined;
  }, [streetCreateOpen, isAdmin, streetSectorId, user?.sectorId]);

  const streetsQuery = useQuery({
    queryKey: ['machine-streets', machineStreetsSectorId ?? 'all'],
    queryFn: () =>
      fetchMachineStreets(
        machineStreetsSectorId
          ? { sectorId: machineStreetsSectorId }
          : undefined,
      ),
    enabled: apiReady && (isAdmin || Boolean(user?.sectorId)),
  });

  const dialogStreetsQuery = useQuery({
    queryKey: ['machine-streets', 'dialog', dialogStreetsSectorId ?? 'none'],
    queryFn: () =>
      fetchMachineStreets({ sectorId: dialogStreetsSectorId! }),
    enabled: apiReady && streetCreateOpen && Boolean(dialogStreetsSectorId),
  });

  const streetsForMachineSector = useMemo(() => {
    const rows = streetsQuery.data ?? [];
    if (!sectorId) {
      return rows;
    }
    return rows.filter((s) => s.sectorId === sectorId);
  }, [streetsQuery.data, sectorId]);

  const streetsForDialogSector = dialogStreetsQuery.data ?? [];

  const resetForm = useCallback(() => {
    setName('');
    setAssetNumber('');
    setPillar('');
    setTypeMachineId('');
    setSectorId('');
    setMachineStreetId('');
    setUserId('');
    setPlantUnit('PEDERTRACTOR');
  }, []);

  const resetStreetForm = useCallback(() => {
    setStreetName('');
    setStreetColor(DEFAULT_STREET_COLOR);
    setStreetEditRow(null);
  }, []);

  const openCreate = useCallback(() => {
    if (cannotCreateMachine) {
      toast.message('Cadastro indisponível', {
        description:
          'Cadastre ao menos um tipo de máquina e um setor antes de criar uma máquina.',
      });
      return;
    }
    resetForm();
    if (plantUnitFilter !== '') {
      setPlantUnit(plantUnitFilter);
    }
    if (!isAdmin && user?.sectorId) {
      setSectorId(user.sectorId);
    } else if (sectorFilter) {
      setSectorId(sectorFilter);
    }
    setCreateOpen(true);
  }, [
    cannotCreateMachine,
    plantUnitFilter,
    resetForm,
    isAdmin,
    user?.sectorId,
    sectorFilter,
  ]);

  const openEdit = (row: MachineListItem) => {
    setName(row.name);
    setAssetNumber(row.assetNumber ?? '');
    setPillar(row.pillar ?? '');
    setPlantUnit(row.plantUnit);
    setTypeMachineId(row.typeMachineId);
    setSectorId(row.sectorId);
    setMachineStreetId(row.machineStreetId ?? '');
    setUserId(row.userId ?? '');
    setEditRow(row);
  };

  const openStreetCreate = useCallback(() => {
    resetStreetForm();
    const defaultSectorId = isAdmin
      ? sectorFilter ||
        sectorId ||
        user?.sectorId ||
        sectorsForSelect[0]?.id ||
        ''
      : (user?.sectorId ?? '');
    setStreetSectorId(defaultSectorId);
    setStreetCreateOpen(true);
  }, [
    resetStreetForm,
    isAdmin,
    sectorFilter,
    sectorId,
    user?.sectorId,
    sectorsForSelect,
  ]);

  const openStreetEdit = useCallback((street: MachineStreetListItem) => {
    setStreetEditRow(street);
    setStreetName(street.name);
    setStreetColor(street.machineStreetColor || DEFAULT_STREET_COLOR);
    setStreetSectorId(street.sectorId);
  }, []);

  const closeStreetDialog = useCallback(() => {
    setStreetCreateOpen(false);
    resetStreetForm();
  }, [resetStreetForm]);

  const handleSectorIdChange = useCallback((nextSectorId: string) => {
    setSectorId(nextSectorId);
    setMachineStreetId('');
  }, []);

  useEffect(() => {
    if (!machineStreetId || !sectorId) {
      return;
    }
    const stillValid = streetsForMachineSector.some(
      (s) => s.id === machineStreetId,
    );
    if (!stillValid && streetsQuery.isSuccess) {
      setMachineStreetId('');
    }
  }, [
    machineStreetId,
    sectorId,
    streetsForMachineSector,
    streetsQuery.isSuccess,
  ]);

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
      if (!n) {
        throw new Error('Informe o nome da máquina.');
      }
      const asset = assetNumber.trim();
      if (!asset) {
        throw new Error('Informe o patrimônio da máquina.');
      }
      const pillarValue = pillar.trim();
      if (!pillarValue) {
        throw new Error('Informe o pilar da máquina.');
      }
      if (!typeMachineId || !sectorId) {
        throw new Error('Selecione o tipo e o setor.');
      }
      const resolvedSectorId = isAdmin ? sectorId : (user?.sectorId ?? '');
      if (!resolvedSectorId) {
        throw new Error(
          isAdmin
            ? 'Selecione o setor.'
            : 'Usuário sem setor; não é possível criar máquina.',
        );
      }
      return createMachine({
        name: n,
        plantUnit,
        typeMachineId,
        sectorId: resolvedSectorId,
        assetNumber: asset,
        pillar: pillarValue,
        userId: userId.trim() === '' ? undefined : userId.trim(),
        machineStreetId:
          machineStreetId.trim() === '' ? null : machineStreetId.trim(),
      });
    },
    onSuccess: () => {
      invalidateMachineListQueries(queryClient);
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
      if (!n) {
        throw new Error('Informe o nome da máquina.');
      }
      const asset = assetNumber.trim();
      if (!asset) {
        throw new Error('Informe o patrimônio da máquina.');
      }
      const pillarValue = pillar.trim();
      if (!pillarValue) {
        throw new Error('Informe o pilar da máquina.');
      }
      if (!typeMachineId || !sectorId) {
        throw new Error('Selecione o tipo e o setor.');
      }
      const resolvedSectorId = isAdmin ? sectorId : (user?.sectorId ?? '');
      if (!resolvedSectorId) {
        throw new Error(
          isAdmin
            ? 'Selecione o setor.'
            : 'Usuário sem setor; não é possível atualizar máquina.',
        );
      }
      return updateMachine(editRow.id, {
        name: n,
        plantUnit,
        typeMachineId,
        ...(isAdmin ? { sectorId: resolvedSectorId } : {}),
        assetNumber: asset,
        pillar: pillarValue,
        machineStreetId:
          machineStreetId.trim() === '' ? null : machineStreetId.trim(),
      });
    },
    onSuccess: () => {
      invalidateMachineListQueries(queryClient);
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
      invalidateMachineListQueries(queryClient);
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
      invalidateMachineListQueries(queryClient);
      setDeleteRow(null);
      toast.success('Máquina excluída.');
    },
    onError: toastApiError,
  });

  const createStreetMut = useMutation({
    mutationFn: async () => {
      const n = streetName.trim();
      if (!n) {
        throw new Error('Informe o nome da rua.');
      }
      const color = streetColor.trim();
      if (!color) {
        throw new Error('Informe a cor da rua.');
      }
      const resolvedSectorId = isAdmin
        ? streetSectorId.trim()
        : (user?.sectorId ?? '').trim();
      if (!resolvedSectorId) {
        throw new Error(
          isAdmin
            ? 'Selecione o setor da rua.'
            : 'Usuário sem setor; não é possível criar rua.',
        );
      }
      return createMachineStreet({
        name: n,
        machineStreetColor: color,
        sectorId: isAdmin ? resolvedSectorId : undefined,
      });
    },
    onSuccess: (created) => {
      invalidateStreetQueries(queryClient);
      closeStreetDialog();
      if (createOpen || editRow) {
        if (!sectorId || sectorId === created.sectorId) {
          if (!sectorId) {
            setSectorId(created.sectorId);
          }
          setMachineStreetId(created.id);
        }
      }
      toast.success('Rua cadastrada.');
    },
    onError: toastApiError,
  });

  const updateStreetMut = useMutation({
    mutationFn: async () => {
      if (!streetEditRow) {
        throw new Error('Nenhuma rua selecionada para editar.');
      }
      const n = streetName.trim();
      if (!n) {
        throw new Error('Informe o nome da rua.');
      }
      const color = streetColor.trim();
      if (!color) {
        throw new Error('Informe a cor da rua.');
      }
      return updateMachineStreet(streetEditRow.id, {
        name: n,
        machineStreetColor: color,
      });
    },
    onSuccess: () => {
      invalidateStreetQueries(queryClient);
      resetStreetForm();
      toast.success('Rua atualizada.');
    },
    onError: toastApiError,
  });

  const deleteStreetMut = useMutation({
    mutationFn: async (id: string) => deleteMachineStreet(id),
    onSuccess: (_data, id) => {
      invalidateStreetQueries(queryClient);
      setDeleteStreetRow(null);
      if (streetEditRow?.id === id) {
        resetStreetForm();
      }
      if (machineStreetId === id) {
        setMachineStreetId('');
      }
      toast.success('Rua excluída.');
    },
    onError: toastApiError,
  });

  const busy =
    createMut.isPending ||
    updateMut.isPending ||
    deleteMut.isPending ||
    unlinkOperatorMut.isPending ||
    createStreetMut.isPending ||
    updateStreetMut.isPending ||
    deleteStreetMut.isPending;
  const createError =
    createMut.error instanceof Error ? createMut.error.message : null;
  const updateError =
    updateMut.error instanceof Error ? updateMut.error.message : null;
  const createStreetError =
    createStreetMut.error instanceof Error
      ? createStreetMut.error.message
      : null;
  const updateStreetError =
    updateStreetMut.error instanceof Error
      ? updateStreetMut.error.message
      : null;

  return {
    apiReady,
    token,
    isAdmin,
    user,
    sectorsQuery,
    sectorsForSelect,
    typesQuery,
    streetsQuery,
    streetsForMachineSector,
    streetsForDialogSector,
    dialogStreetsQuery,
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
    streetCreateOpen,
    setStreetCreateOpen,
    streetEditRow,
    deleteStreetRow,
    setDeleteStreetRow,
    name,
    setName,
    assetNumber,
    setAssetNumber,
    pillar,
    setPillar,
    typeMachineId,
    setTypeMachineId,
    sectorId,
    setSectorId: handleSectorIdChange,
    machineStreetId,
    setMachineStreetId,
    userId,
    setUserId,
    streetName,
    setStreetName,
    streetColor,
    setStreetColor,
    streetSectorId,
    setStreetSectorId,
    unlinkOperatorMut,
    openCreate,
    openEdit,
    openStreetCreate,
    openStreetEdit,
    closeStreetDialog,
    createMut,
    updateMut,
    deleteMut,
    createStreetMut,
    updateStreetMut,
    deleteStreetMut,
    busy,
    createError,
    updateError,
    createStreetError,
    updateStreetError,
  };
}

export type MachinesPageViewModel = ReturnType<typeof useMachinesPage>;

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { toast } from '@/lib/toast';
import { toastApiError } from '@/lib/toast-helpers';
import { ENV } from '@/constants/env';
import {
  createMovimentPallet,
  deleteMovimentPallet,
  fetchMovimentPallets,
  updateMovimentPallet,
} from '@/services/moviment-pallets-api';
import { fetchSectors } from '@/services/sectors-api';
import { useAuthStore } from '@/store/auth.store';
import { hasAdminPrivileges } from '@/types/role.types';
import type { SectorListItem } from '@/types/machine.types';
import type { MovimentPalletEquipmentType, MovimentPalletListItem } from '@/types/moviment-pallet.types';

function useApiReady(): boolean {
  const token = useAuthStore((s) => s.token);
  return Boolean(ENV.API_URL && token);
}

function buildSectorOptions(
  userSectorId: string | null | undefined,
  userSectorLabel: string | undefined,
  apiSectors: SectorListItem[] | undefined,
  sectorsError: boolean,
): SectorListItem[] {
  if (apiSectors !== undefined && apiSectors.length > 0) {
    return apiSectors;
  }
  if (sectorsError && userSectorId) {
    return [{ id: userSectorId, typeSector: userSectorLabel ?? 'Seu setor' }];
  }
  if (userSectorId && (apiSectors === undefined || apiSectors.length === 0)) {
    return [{ id: userSectorId, typeSector: userSectorLabel ?? 'Seu setor' }];
  }
  return apiSectors ?? [];
}

export function useMovimentPalletsPage() {
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

  const sectorOptions = useMemo(
    () =>
      buildSectorOptions(
        user?.sectorId ?? undefined,
        user?.sector?.typeSector,
        sectorsQuery.data,
        sectorsQuery.isError,
      ),
    [
      user?.sectorId,
      user?.sector?.typeSector,
      sectorsQuery.data,
      sectorsQuery.isError,
    ],
  );

  const [sectorFilter, setSectorFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | MovimentPalletEquipmentType>('all');

  const listQuery = useQuery({
    queryKey: ['moviment-pallets', sectorFilter, typeFilter],
    queryFn: () =>
      fetchMovimentPallets({
        ...(sectorFilter.trim() !== '' ? { sectorId: sectorFilter } : {}),
        ...(typeFilter !== 'all' ? { type: typeFilter } : {}),
      }),
    enabled: apiReady,
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [editRow, setEditRow] = useState<MovimentPalletListItem | null>(null);
  const [deleteRow, setDeleteRow] = useState<MovimentPalletListItem | null>(null);

  const [code, setCode] = useState('');
  const [equipmentType, setEquipmentType] = useState<MovimentPalletEquipmentType>('FORKLIFT');
  const [sectorId, setSectorId] = useState<string>('');
  const [noSector, setNoSector] = useState(false);

  const resetForm = useCallback(() => {
    setCode('');
    setEquipmentType('FORKLIFT');
    setSectorId('');
    setNoSector(false);
  }, []);

  const openCreate = () => {
    resetForm();
    if (sectorOptions.length === 1) {
      setSectorId(sectorOptions[0].id);
    } else if (user?.sectorId) {
      setSectorId(user.sectorId);
    }
    setCreateOpen(true);
  };

  const openEdit = (row: MovimentPalletListItem) => {
    setCode(row.code);
    setEquipmentType(row.type);
    setSectorId(row.sectorId ?? '');
    setNoSector(row.sectorId === null);
    setEditRow(row);
  };

  const createMut = useMutation({
    mutationFn: async () => {
      const c = code.trim();
      if (!c) {
        throw new Error('Informe o código do equipamento.');
      }
      return createMovimentPallet({
        code: c,
        type: equipmentType,
        sectorId: noSector ? null : sectorId.trim() === '' ? undefined : sectorId.trim(),
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['moviment-pallets'] });
      setCreateOpen(false);
      resetForm();
      toast.success('Equipamento cadastrado.');
    },
    onError: toastApiError,
  });

  const updateMut = useMutation({
    mutationFn: async () => {
      if (!editRow) {
        throw new Error('Sem registro.');
      }
      const c = code.trim();
      if (!c) {
        throw new Error('Informe o código do equipamento.');
      }
      return updateMovimentPallet(editRow.id, {
        code: c,
        type: equipmentType,
        sectorId: noSector ? null : sectorId.trim() === '' ? null : sectorId.trim(),
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['moviment-pallets'] });
      setEditRow(null);
      resetForm();
      toast.success('Equipamento atualizado.');
    },
    onError: toastApiError,
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => deleteMovimentPallet(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['moviment-pallets'] });
      setDeleteRow(null);
      toast.success('Equipamento excluído.');
    },
    onError: toastApiError,
  });

  const busy =
    createMut.isPending || updateMut.isPending || deleteMut.isPending;
  const createError =
    createMut.error instanceof Error ? createMut.error.message : null;
  const updateError =
    updateMut.error instanceof Error ? updateMut.error.message : null;

  const missingUserSector =
    Boolean(apiReady && token) &&
    !hasAdminPrivileges(user?.role) &&
    !user?.sectorId &&
    sectorOptions.length === 0 &&
    !sectorsQuery.isLoading;

  return {
    apiReady,
    token,
    sectorOptions,
    sectorsQuery,
    sectorFilter,
    setSectorFilter,
    typeFilter,
    setTypeFilter,
    listQuery,
    createOpen,
    setCreateOpen,
    editRow,
    setEditRow,
    deleteRow,
    setDeleteRow,
    code,
    setCode,
    equipmentType,
    setEquipmentType,
    sectorId,
    setSectorId,
    noSector,
    setNoSector,
    openCreate,
    openEdit,
    createMut,
    updateMut,
    deleteMut,
    busy,
    createError,
    updateError,
    missingUserSector,
  };
}

export type MovimentPalletsPageViewModel = ReturnType<typeof useMovimentPalletsPage>;

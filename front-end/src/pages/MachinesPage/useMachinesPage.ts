import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { ENV } from '@/constants/env';
import {
  createMachine,
  deleteMachine,
  fetchMachines,
  updateMachine,
} from '@/services/machines-api';
import { fetchSectors } from '@/services/sectors-api';
import { fetchTypeMachines } from '@/services/type-machines-api';
import { useAuthStore } from '@/store/auth.store';
import type { MachineListItem } from '@/types/machine.types';

function useApiReady(): boolean {
  const token = useAuthStore((s) => s.token);
  return Boolean(ENV.API_URL && token);
}

export function useMachinesPage() {
  const queryClient = useQueryClient();
  const apiReady = useApiReady();
  const token = useAuthStore((s) => s.token);

  const sectorsQuery = useQuery({
    queryKey: ['sectors'],
    queryFn: fetchSectors,
    enabled: apiReady,
  });

  const typesQuery = useQuery({
    queryKey: ['type-machines'],
    queryFn: fetchTypeMachines,
    enabled: apiReady,
  });

  const [sectorFilter, setSectorFilter] = useState('');

  const machinesQuery = useQuery({
    queryKey: ['machines', sectorFilter],
    queryFn: () => fetchMachines(sectorFilter || undefined),
    enabled: apiReady,
  });

  const sectorsEmpty =
    apiReady && sectorsQuery.isSuccess && (sectorsQuery.data?.length ?? 0) === 0;
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
  const [clearOperator, setClearOperator] = useState(false);

  const resetForm = useCallback(() => {
    setName('');
    setPosition('');
    setTypeMachineId('');
    setSectorId('');
    setUserId('');
    setClearOperator(false);
  }, []);

  const openCreate = () => {
    resetForm();
    if (sectorsQuery.data?.length === 1) {
      setSectorId(sectorsQuery.data[0].id);
    }
    if (typesQuery.data?.length === 1) {
      setTypeMachineId(typesQuery.data[0].id);
    }
    setCreateOpen(true);
  };

  const openEdit = (row: MachineListItem) => {
    setName(row.name);
    setPosition(row.position);
    setTypeMachineId(row.typeMachineId);
    setSectorId(row.sectorId);
    setUserId(row.userId ?? '');
    setClearOperator(false);
    setEditRow(row);
  };

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
        typeMachineId,
        sectorId,
        userId: userId.trim() === '' ? undefined : userId.trim(),
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['machines'] });
      setCreateOpen(false);
      resetForm();
    },
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
      const patch: Parameters<typeof updateMachine>[1] = {
        name: n,
        position: p,
        typeMachineId,
        sectorId,
      };
      if (clearOperator) {
        patch.userId = null;
      } else if (userId.trim() !== '') {
        patch.userId = userId.trim();
      }
      return updateMachine(editRow.id, patch);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['machines'] });
      setEditRow(null);
      resetForm();
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => deleteMachine(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['machines'] });
      setDeleteRow(null);
    },
  });

  const busy =
    createMut.isPending || updateMut.isPending || deleteMut.isPending;
  const createError =
    createMut.error instanceof Error ? createMut.error.message : null;
  const updateError =
    updateMut.error instanceof Error ? updateMut.error.message : null;

  return {
    apiReady,
    token,
    sectorsQuery,
    typesQuery,
    sectorFilter,
    setSectorFilter,
    machinesQuery,
    sectorsEmpty,
    typesEmpty,
    cannotCreateMachine,
    createOpen,
    setCreateOpen,
    editRow,
    setEditRow,
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
    clearOperator,
    setClearOperator,
    openCreate,
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

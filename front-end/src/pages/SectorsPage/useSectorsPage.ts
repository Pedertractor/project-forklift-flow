import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { ENV } from '@/constants/env';
import {
  createSector,
  deleteSector,
  fetchSectors,
  updateSector,
} from '@/services/sectors-api';
import { useAuthStore } from '@/store/auth.store';
import type { SectorListItem } from '@/types/machine.types';

function useApiReady(): boolean {
  const token = useAuthStore((s) => s.token);
  return Boolean(ENV.API_URL && token);
}

export function useSectorsPage() {
  const queryClient = useQueryClient();
  const apiReady = useApiReady();
  const token = useAuthStore((s) => s.token);

  const listQuery = useQuery({
    queryKey: ['sectors'],
    queryFn: fetchSectors,
    enabled: apiReady,
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [editRow, setEditRow] = useState<SectorListItem | null>(null);
  const [deleteRow, setDeleteRow] = useState<SectorListItem | null>(null);
  const [formTypeSector, setFormTypeSector] = useState('');

  const resetForm = useCallback(() => {
    setFormTypeSector('');
  }, []);

  const openCreate = () => {
    resetForm();
    setCreateOpen(true);
  };

  const openEdit = (row: SectorListItem) => {
    setFormTypeSector(row.typeSector);
    setEditRow(row);
  };

  const createMut = useMutation({
    mutationFn: async () => {
      const typeSector = formTypeSector.trim();
      if (!typeSector) {
        throw new Error('Informe o nome do setor (tipo).');
      }
      return createSector({ typeSector });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sectors'] });
      setCreateOpen(false);
      resetForm();
    },
  });

  const updateMut = useMutation({
    mutationFn: async () => {
      if (!editRow) {
        throw new Error('Sem registro.');
      }
      const typeSector = formTypeSector.trim();
      if (!typeSector) {
        throw new Error('Informe o nome do setor (tipo).');
      }
      return updateSector(editRow.id, { typeSector });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sectors'] });
      setEditRow(null);
      resetForm();
    },
  });

  const deleteMut = useMutation({
    mutationFn: async () => {
      if (!deleteRow) {
        throw new Error('Sem registro.');
      }
      return deleteSector(deleteRow.id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sectors'] });
      setDeleteRow(null);
    },
  });

  const busy = createMut.isPending || updateMut.isPending || deleteMut.isPending;

  return {
    apiReady,
    token,
    listQuery,
    createOpen,
    setCreateOpen,
    editRow,
    setEditRow,
    deleteRow,
    setDeleteRow,
    formTypeSector,
    setFormTypeSector,
    openCreate,
    openEdit,
    createMut,
    updateMut,
    deleteMut,
    busy,
    createError: createMut.error,
    updateError: updateMut.error,
    deleteError: deleteMut.error,
  };
}

export type SectorsPageViewModel = ReturnType<typeof useSectorsPage>;

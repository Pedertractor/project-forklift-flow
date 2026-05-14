import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { ENV } from '@/constants/env';
import { apiServerOrigin } from '@/lib/api';
import {
  createTypeMachineMultipart,
  deleteTypeMachine,
  fetchTypeMachines,
  updateTypeMachineJson,
  updateTypeMachineMultipart,
} from '@/services/type-machines-api';
import { useAuthStore } from '@/store/auth.store';
import type { TypeMachine } from '@/types/machine.types';

export function typeMachineImageSrc(urlImage: string): string {
  if (urlImage.startsWith('http://') || urlImage.startsWith('https://')) {
    return urlImage;
  }
  return `${apiServerOrigin()}${urlImage.startsWith('/') ? urlImage : `/${urlImage}`}`;
}

function useApiReady(): boolean {
  const token = useAuthStore((s) => s.token);
  return Boolean(ENV.API_URL && token);
}

export function useTypeMachinesPage() {
  const queryClient = useQueryClient();
  const apiReady = useApiReady();
  const token = useAuthStore((s) => s.token);

  const listQuery = useQuery({
    queryKey: ['type-machines'],
    queryFn: fetchTypeMachines,
    enabled: apiReady,
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [editRow, setEditRow] = useState<TypeMachine | null>(null);
  const [deleteRow, setDeleteRow] = useState<TypeMachine | null>(null);

  const [formName, setFormName] = useState('');
  const [formFile, setFormFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);

  const setFormFileAndPreview = useCallback((file: File | null) => {
    setFilePreviewUrl((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev);
      }
      return file ? URL.createObjectURL(file) : null;
    });
    setFormFile(file);
  }, []);

  const resetForm = useCallback(() => {
    setFormName('');
    setFilePreviewUrl((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev);
      }
      return null;
    });
    setFormFile(null);
  }, []);

  const openCreate = () => {
    resetForm();
    setCreateOpen(true);
  };

  const openEdit = (row: TypeMachine) => {
    setFormName(row.name);
    setFilePreviewUrl((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev);
      }
      return null;
    });
    setFormFile(null);
    setEditRow(row);
  };

  const createMut = useMutation({
    mutationFn: async () => {
      const name = formName.trim();
      if (!name) {
        throw new Error('Informe o nome.');
      }
      if (!formFile) {
        throw new Error(
          'Selecione uma imagem ilustrativa (JPEG, PNG, GIF ou WebP).',
        );
      }
      const fd = new FormData();
      fd.set('name', name);
      fd.set('image', formFile);
      return createTypeMachineMultipart(fd);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['type-machines'] });
      setCreateOpen(false);
      resetForm();
    },
  });

  const updateMut = useMutation({
    mutationFn: async () => {
      if (!editRow) {
        throw new Error('Sem registro.');
      }
      const name = formName.trim();
      if (!name) {
        throw new Error('Informe o nome.');
      }
      if (formFile) {
        const fd = new FormData();
        fd.set('name', name);
        fd.set('image', formFile);
        return updateTypeMachineMultipart(editRow.id, fd);
      }
      return updateTypeMachineJson(editRow.id, { name });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['type-machines'] });
      setEditRow(null);
      resetForm();
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => deleteTypeMachine(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['type-machines'] });
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
    listQuery,
    createOpen,
    setCreateOpen,
    editRow,
    setEditRow,
    deleteRow,
    setDeleteRow,
    formName,
    setFormName,
    filePreviewUrl,
    setFormFileAndPreview,
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

export type TypeMachinesPageViewModel = ReturnType<typeof useTypeMachinesPage>;

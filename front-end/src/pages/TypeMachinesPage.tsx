import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ModalActions, SimpleModal } from '@/components/crud/SimpleModal';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ENV } from '@/constants/env';
import { apiServerOrigin } from '@/lib/api';
import {
  createTypeMachineJson,
  createTypeMachineMultipart,
  deleteTypeMachine,
  fetchTypeMachines,
  updateTypeMachineJson,
  updateTypeMachineMultipart,
} from '@/services/type-machines-api';
import { useAuthStore } from '@/store/auth.store';
import type { TypeMachine } from '@/types/machine.types';

function imageSrc(urlImage: string): string {
  if (urlImage.startsWith('http://') || urlImage.startsWith('https://')) {
    return urlImage;
  }
  return `${apiServerOrigin()}${urlImage.startsWith('/') ? urlImage : `/${urlImage}`}`;
}

function useApiReady(): boolean {
  const token = useAuthStore((s) => s.token);
  return Boolean(ENV.API_URL && token);
}

export function TypeMachinesPage() {
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
  const [formUrl, setFormUrl] = useState('');
  const [formFile, setFormFile] = useState<File | null>(null);

  const resetForm = useCallback(() => {
    setFormName('');
    setFormUrl('');
    setFormFile(null);
  }, []);

  const openCreate = () => {
    resetForm();
    setCreateOpen(true);
  };

  const openEdit = (row: TypeMachine) => {
    setFormName(row.name);
    setFormUrl(row.urlImage.startsWith('/uploads/') ? '' : row.urlImage);
    setFormFile(null);
    setEditRow(row);
  };

  const createMut = useMutation({
    mutationFn: async () => {
      const name = formName.trim();
      if (!name) {
        throw new Error('Informe o nome.');
      }
      if (formFile) {
        const fd = new FormData();
        fd.set('name', name);
        fd.set('image', formFile);
        return createTypeMachineMultipart(fd);
      }
      const url = formUrl.trim();
      if (!url) {
        throw new Error('Informe a URL da imagem ou escolha um arquivo.');
      }
      return createTypeMachineJson({ name, urlImage: url });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['type-machines'] });
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
      const url = formUrl.trim();
      if (!url) {
        return updateTypeMachineJson(editRow.id, { name });
      }
      return updateTypeMachineJson(editRow.id, { name, urlImage: url });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['type-machines'] });
      setEditRow(null);
      resetForm();
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => deleteTypeMachine(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['type-machines'] });
      setDeleteRow(null);
    },
  });

  const busy = createMut.isPending || updateMut.isPending || deleteMut.isPending;
  const createError = createMut.error instanceof Error ? createMut.error.message : null;
  const updateError = updateMut.error instanceof Error ? updateMut.error.message : null;

  return (
    <main className="px-4 py-8 max-[800px]:px-3">
      <div className="mx-auto w-full max-w-6xl">
        <header className="mb-6 flex flex-col gap-4 border-b border-zinc-200 pb-6 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <div>
            <h1 className="m-0 text-2xl font-bold tracking-tight text-zinc-900">Tipos de máquina</h1>
            <p className="mt-1.5 text-sm text-zinc-600">
              Cadastro de tipos (nome e imagem). Alinhado ao endpoint{' '}
              <code className="rounded bg-zinc-100 px-1 font-mono text-xs">/api/type-machines</code>.
            </p>
          </div>
          <Button type="button" onClick={openCreate} disabled={!apiReady || busy}>
            Novo tipo
          </Button>
        </header>

        {!ENV.API_URL ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Defina <code className="font-mono">VITE_API_URL</code> e faça login para gerenciar tipos de máquina.
          </p>
        ) : !token ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Faça login com a API ativa (token JWT) para acessar este cadastro.
          </p>
        ) : null}

        {listQuery.isError ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {listQuery.error instanceof Error ? listQuery.error.message : 'Erro ao carregar lista.'}
          </p>
        ) : null}

        <Card className="mt-6 overflow-x-auto border border-zinc-200 shadow-sm">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50/90">
                <th className="px-4 py-3 font-semibold text-zinc-700">Imagem</th>
                <th className="px-4 py-3 font-semibold text-zinc-700">Nome</th>
                <th className="px-4 py-3 font-semibold text-zinc-700">URL</th>
                <th className="px-4 py-3 text-right font-semibold text-zinc-700">Ações</th>
              </tr>
            </thead>
            <tbody>
              {listQuery.isLoading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">
                    Carregando…
                  </td>
                </tr>
              ) : listQuery.data?.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">
                    Nenhum tipo cadastrado.
                  </td>
                </tr>
              ) : (
                listQuery.data?.map((row) => (
                  <tr key={row.id} className="border-b border-zinc-100 last:border-0">
                    <td className="px-4 py-3">
                      <img
                        src={imageSrc(row.urlImage)}
                        alt=""
                        className="size-12 rounded-lg border border-zinc-200 object-cover"
                        loading="lazy"
                      />
                    </td>
                    <td className="px-4 py-3 font-medium text-zinc-900">{row.name}</td>
                    <td className="max-w-56 truncate px-4 py-3 font-mono text-xs text-zinc-600">
                      {row.urlImage}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="default"
                          className="h-9 min-w-0 px-3 text-xs"
                          disabled={!apiReady || busy}
                          onClick={() => openEdit(row)}
                        >
                          Editar
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="default"
                          className="h-9 min-w-0 border-red-200 px-3 text-xs text-red-700 hover:bg-red-50"
                          disabled={!apiReady || busy}
                          onClick={() => setDeleteRow(row)}
                        >
                          Excluir
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>
      </div>

      <SimpleModal
        open={createOpen}
        title="Novo tipo de máquina"
        description="Informe o nome e uma imagem por URL ou arquivo (JPEG, PNG, GIF ou WebP)."
        onClose={() => (!busy ? setCreateOpen(false) : undefined)}
        footer={
          <ModalActions
            onCancel={() => !busy && setCreateOpen(false)}
            submitLabel={busy ? 'Salvando…' : 'Criar'}
            disabled={busy}
            onSubmit={() => createMut.mutate()}
          />
        }
      >
        {createError ? (
          <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{createError}</p>
        ) : null}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tm-name">Nome</Label>
            <Input id="tm-name" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Ex.: Empilhadeira frontal" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tm-url">URL da imagem</Label>
            <Input
              id="tm-url"
              value={formUrl}
              onChange={(e) => setFormUrl(e.target.value)}
              placeholder="https://…"
              disabled={Boolean(formFile)}
            />
            <p className="m-0 text-xs text-zinc-500">Deixe em branco se for enviar arquivo abaixo.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="tm-file">Arquivo de imagem</Label>
            <Input
              id="tm-file"
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={(e) => setFormFile(e.target.files?.[0] ?? null)}
              disabled={formUrl.trim().length > 0}
            />
          </div>
        </div>
      </SimpleModal>

      <SimpleModal
        open={Boolean(editRow)}
        title="Editar tipo de máquina"
        onClose={() => (!busy ? setEditRow(null) : undefined)}
        footer={
          <ModalActions
            onCancel={() => !busy && setEditRow(null)}
            submitLabel={busy ? 'Salvando…' : 'Salvar'}
            disabled={busy}
            onSubmit={() => updateMut.mutate()}
          />
        }
      >
        {updateError ? (
          <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{updateError}</p>
        ) : null}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tm-edit-name">Nome</Label>
            <Input id="tm-edit-name" value={formName} onChange={(e) => setFormName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tm-edit-url">Nova URL da imagem</Label>
            <Input
              id="tm-edit-url"
              value={formUrl}
              onChange={(e) => setFormUrl(e.target.value)}
              placeholder="Opcional se enviar novo arquivo"
              disabled={Boolean(formFile)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tm-edit-file">Substituir por arquivo</Label>
            <Input
              id="tm-edit-file"
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={(e) => setFormFile(e.target.files?.[0] ?? null)}
              disabled={formUrl.trim().length > 0}
            />
          </div>
        </div>
      </SimpleModal>

      <SimpleModal
        open={Boolean(deleteRow)}
        title="Excluir tipo de máquina"
        description={
          deleteRow
            ? `Confirma a exclusão de «${deleteRow.name}»? Não será possível excluir se existir máquina usando este tipo.`
            : undefined
        }
        onClose={() => (!busy ? setDeleteRow(null) : undefined)}
        footer={
          <ModalActions
            onCancel={() => !busy && setDeleteRow(null)}
            submitLabel={busy ? 'Excluindo…' : 'Excluir'}
            disabled={busy}
            danger
            onSubmit={() => deleteRow && deleteMut.mutate(deleteRow.id)}
          />
        }
      >
        {deleteMut.error instanceof Error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {deleteMut.error.message}
          </p>
        ) : null}
      </SimpleModal>
    </main>
  );
}

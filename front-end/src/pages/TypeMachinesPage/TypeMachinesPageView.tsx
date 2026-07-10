import { Button } from '@/components/ui/brand-button';
import { ModalActions, SimpleModal } from '@/components/crud/SimpleModal';
import { DataTableCard } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ENV } from '@/constants/env';
import { typeMachineImageSrc, type TypeMachinesPageViewModel } from './useTypeMachinesPage';
import AccordionLoader from '@/components/accordionLoader/accordion-loader';
import { PlusIcon } from 'lucide-react';

export function TypeMachinesPageView(vm: TypeMachinesPageViewModel) {
  const {
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
  } = vm;

  return (
    <main className="px-4 py-8 max-[800px]:px-3">
      <div className="mx-auto w-full max-w-6xl">
        <header className="mb-6 flex flex-col gap-4 border-b border-zinc-200 pb-6 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <div>
            <h1 className="m-0 text-2xl font-bold tracking-tight text-zinc-900">
              Tipos de máquina
            </h1>
            <p className="mt-1.5 text-sm text-zinc-600">
              Cadastre os tipos de máquinas que farão parte da plataforma.
            </p>
          </div>
          <Button
            type="button"
            onClick={openCreate}
            disabled={!apiReady || busy}
          >
            <PlusIcon className="size-4" />
            Novo tipo
          </Button>
        </header>

        {!ENV.API_URL ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Defina <code className="font-mono">VITE_BASE_URL_API</code> e faça login
            para gerenciar tipos de máquina.
          </p>
        ) : !token ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Faça login com a API ativa (token JWT) para acessar este cadastro.
          </p>
        ) : null}

        {listQuery.isError ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {listQuery.error instanceof Error
              ? listQuery.error.message
              : 'Erro ao carregar lista.'}
          </p>
        ) : null}

        <DataTableCard className="mt-6">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50/90">
                <th className="px-4 py-3 font-semibold text-zinc-700">
                  Imagem
                </th>
                <th className="px-4 py-3 font-semibold text-zinc-700">Nome</th>
                <th className="px-4 py-3 text-right font-semibold text-zinc-700">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {listQuery.isLoading ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-zinc-500"
                  >
                    <div className="flex items-center justify-center">
                      <AccordionLoader />
                    </div>
                  </td>
                </tr>
              ) : listQuery.data?.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-zinc-500"
                  >
                    Nenhum tipo cadastrado.
                  </td>
                </tr>
              ) : (
                listQuery.data?.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-zinc-100 last:border-0"
                  >
                    <td className="px-4 py-3">
                      <img
                        src={typeMachineImageSrc(row.urlImage)}
                        alt=""
                        className="size-12 rounded-lg border border-zinc-200 object-cover"
                        loading="lazy"
                      />
                    </td>
                    <td className="px-4 py-3 font-medium text-zinc-900">
                      {row.name}
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
        </DataTableCard>
      </div>

      <SimpleModal
        open={createOpen}
        title="Novo tipo de máquina"
        description="Cadastre um novo tipo de máquina."
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
          <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {createError}
          </p>
        ) : null}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tm-name">Nome</Label>
            <Input
              id="tm-name"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Ex.: solda"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tm-file">Imagem ilustrativa</Label>
            <Input
              id="tm-file"
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp,.jpg,.jpeg,.png,.gif,.webp"
              onChange={(e) =>
                setFormFileAndPreview(e.target.files?.[0] ?? null)
              }
            />
            <p className="m-0 text-xs text-zinc-500">
              Obrigatório no cadastro. Formatos: JPEG, PNG, GIF ou WebP (até 5
              MB).
            </p>
            {filePreviewUrl ? (
              <div className="flex items-center gap-3 pt-1">
                <img
                  src={filePreviewUrl}
                  alt=""
                  className="size-20 rounded-lg border border-zinc-200 object-cover"
                />
                <span className="text-xs text-zinc-600">Pré-visualização</span>
              </div>
            ) : null}
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
          <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {updateError}
          </p>
        ) : null}
        <div className="space-y-4">
          {editRow ? (
            <div className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50/80 px-3 py-2">
              <img
                src={typeMachineImageSrc(editRow.urlImage)}
                alt=""
                className="size-16 shrink-0 rounded-lg border border-zinc-200 object-cover"
              />
              <p className="m-0 min-w-0 flex-1 text-xs text-zinc-600">
                <span className="font-medium text-zinc-700">Imagem atual.</span>{' '}
                Para trocar, envie um novo arquivo abaixo (o caminho no servidor
                será atualizado automaticamente).
              </p>
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="tm-edit-name">Nome</Label>
            <Input
              id="tm-edit-name"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tm-edit-file">Nova imagem (opcional)</Label>
            <Input
              id="tm-edit-file"
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp,.jpg,.jpeg,.png,.gif,.webp"
              onChange={(e) =>
                setFormFileAndPreview(e.target.files?.[0] ?? null)
              }
            />
            {filePreviewUrl ? (
              <div className="flex items-center gap-3 pt-1">
                <img
                  src={filePreviewUrl}
                  alt=""
                  className="size-20 rounded-lg border border-zinc-200 object-cover"
                />
                <span className="text-xs text-zinc-600">
                  Nova imagem (pré-visualização)
                </span>
              </div>
            ) : null}
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

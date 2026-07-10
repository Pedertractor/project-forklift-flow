import { Button } from '@/components/ui/brand-button';
import { ModalActions, SimpleModal } from '@/components/crud/SimpleModal';
import { DataTableCard } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ENV } from '@/constants/env';
import type { SectorsPageViewModel } from './useSectorsPage';
import AccordionLoader from '@/components/accordionLoader/accordion-loader';
import { PlusIcon } from 'lucide-react';

export function SectorsPageView(vm: SectorsPageViewModel) {
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
    formTypeSector,
    setFormTypeSector,
    openCreate,
    openEdit,
    createMut,
    updateMut,
    deleteMut,
    busy,
    createError,
    updateError,
  } = vm;

  const createErrMsg =
    createError instanceof Error ? createError.message : null;
  const updateErrMsg =
    updateError instanceof Error ? updateError.message : null;

  return (
    <main className="px-4 py-8 max-[800px]:px-3">
      <div className="mx-auto w-full max-w-6xl">
        <header className="mb-6 flex flex-col gap-4 border-b border-zinc-200 pb-6 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <div>
            <h1 className="m-0 text-2xl font-bold tracking-tight text-zinc-900">
              Setores
            </h1>
            <p className="mt-1.5 text-sm text-zinc-600">
              Cadastre os setores que farão parte da plataforma.
            </p>
          </div>
          <Button
            type="button"
            onClick={openCreate}
            disabled={!apiReady || busy}
          >
            <PlusIcon className="size-4" />
            Novo setor
          </Button>
        </header>

        {!ENV.API_URL ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Defina <code className="font-mono">VITE_BASE_URL_API</code> e faça
            login para gerenciar setores.
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
          <table className="w-full min-w-[320px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50/90">
                <th className="px-4 py-3 font-semibold text-zinc-700">Setor</th>
                <th className="px-4 py-3 text-right font-semibold text-zinc-700">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {listQuery.isLoading ? (
                <tr>
                  <td colSpan={2} className="px-4 py-8 text-zinc-500">
                    <div className="flex items-center justify-center">
                      <AccordionLoader />
                    </div>
                  </td>
                </tr>
              ) : listQuery.data?.length === 0 ? (
                <tr>
                  <td
                    colSpan={2}
                    className="px-4 py-8 text-center text-zinc-500"
                  >
                    Nenhum setor cadastrado.
                  </td>
                </tr>
              ) : (
                listQuery.data?.map((row) => {
                  const hasLinks = (row.references ?? 0) > 0;
                  return (
                    <tr
                      key={row.id}
                      className="border-b border-zinc-100 last:border-0"
                    >
                      <td className="px-4 py-3 font-medium text-zinc-900">
                        {row.typeSector}
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
                            disabled={!apiReady || busy || hasLinks}
                            title={
                              hasLinks
                                ? 'Não é possível excluir: há máquinas, usuários ou equipamentos vinculados a este setor.'
                                : undefined
                            }
                            onClick={() => setDeleteRow(row)}
                          >
                            Excluir
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </DataTableCard>
      </div>

      <SimpleModal
        open={createOpen}
        title="Novo setor"
        description="Informe o nome ou identificação do setor."
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
        {createErrMsg ? (
          <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {createErrMsg}
          </p>
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="sector-type">Nome do setor</Label>
          <Input
            id="sector-type"
            value={formTypeSector}
            onChange={(e) => setFormTypeSector(e.target.value)}
            placeholder="Ex.: Linha de montagem A"
          />
        </div>
      </SimpleModal>

      <SimpleModal
        open={Boolean(editRow)}
        title="Editar setor"
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
        {updateErrMsg ? (
          <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {updateErrMsg}
          </p>
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="sector-edit-type">Nome do setor</Label>
          <Input
            id="sector-edit-type"
            value={formTypeSector}
            onChange={(e) => setFormTypeSector(e.target.value)}
          />
        </div>
      </SimpleModal>

      <SimpleModal
        open={Boolean(deleteRow)}
        title="Excluir setor"
        description={
          deleteRow
            ? `Confirma a exclusão de «${deleteRow.typeSector}»? Não será possível excluir se houver máquinas, usuários ou equipamentos vinculados.`
            : undefined
        }
        onClose={() => (!busy ? setDeleteRow(null) : undefined)}
        footer={
          <ModalActions
            onCancel={() => !busy && setDeleteRow(null)}
            submitLabel={busy ? 'Excluindo…' : 'Excluir'}
            disabled={busy}
            danger
            onSubmit={() => deleteMut.mutate()}
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

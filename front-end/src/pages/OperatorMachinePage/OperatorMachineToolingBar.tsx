import { useState } from 'react';
import { Button } from '@/components/ui/brand-button';
import { ModalActions, SimpleModal } from '@/components/crud/SimpleModal';
import { Input } from '@/components/ui/input';
import type { MachineToolingListItem } from '@/types/operator-machine.types';
import { Plus, Wrench, X } from 'lucide-react';

export interface OperatorMachineToolingBarProps {
  toolings: MachineToolingListItem[];
  loading?: boolean;
  createPending?: boolean;
  deletePendingId?: string | null;
  disabled?: boolean;
  onCreate: (name: string) => Promise<void> | void;
  onDelete: (toolingId: string) => Promise<void> | void;
}

export function OperatorMachineToolingBar({
  toolings,
  loading = false,
  createPending = false,
  deletePendingId = null,
  disabled = false,
  onCreate,
  onDelete,
}: OperatorMachineToolingBarProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [removeId, setRemoveId] = useState<string | null>(null);

  const removeTarget =
    removeId != null ? (toolings.find((t) => t.id === removeId) ?? null) : null;
  const deletePending = deletePendingId != null;

  const closeAdd = () => {
    if (createPending) return;
    setAddOpen(false);
    setName('');
  };

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    await onCreate(trimmed);
    setAddOpen(false);
    setName('');
  };

  const handleConfirmDelete = async () => {
    if (!removeId) return;
    await onDelete(removeId);
    setRemoveId(null);
  };

  return (
    <>
      <div className="flex w-full items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-3 py-2 shadow-sm">
        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
          <span className="flex shrink-0 items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            <Wrench className="size-3.5" aria-hidden />
            Ferramental
          </span>
          {loading ? (
            <span className="text-sm text-zinc-500">Carregando…</span>
          ) : toolings.length === 0 ? (
            <span className="text-sm text-zinc-500">
              Nenhum cadastrado nesta máquina
            </span>
          ) : (
            toolings.map((item) => {
              const removing = deletePendingId === item.id;
              return (
                <span
                  key={item.id}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 py-1 pl-2.5 pr-1 text-sm font-medium text-zinc-800"
                >
                  {item.name}
                  <button
                    type="button"
                    className="inline-flex size-6 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-200 hover:text-zinc-900 disabled:opacity-50"
                    aria-label={`Remover ${item.name}`}
                    disabled={disabled || deletePending || createPending}
                    onClick={() => setRemoveId(item.id)}
                  >
                    <X className="size-3.5" aria-hidden />
                  </button>
                  {removing ? (
                    <span className="sr-only">Removendo…</span>
                  ) : null}
                </span>
              );
            })
          )}
        </div>
        <Button
          type="button"
          size="icon"
          className="size-10 shrink-0 rounded-xl"
          disabled={disabled || createPending || deletePending}
          aria-label="Adicionar ferramental"
          onClick={() => setAddOpen(true)}
        >
          <Plus className="size-5" aria-hidden />
        </Button>
      </div>

      <SimpleModal
        open={addOpen}
        onClose={closeAdd}
        title="Novo ferramental"
        description="Cadastre o ferramental que está sendo usado nesta máquina."
        footer={
          <ModalActions
            onCancel={closeAdd}
            submitLabel={createPending ? 'Salvando…' : 'Adicionar'}
            onSubmit={() => {
              void handleCreate();
            }}
            disabled={createPending || name.trim() === ''}
          />
        }
      >
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-zinc-800">Nome</span>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Matriz 45°"
            disabled={createPending}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void handleCreate();
              }
            }}
          />
        </label>
      </SimpleModal>

      <SimpleModal
        open={removeId !== null}
        onClose={() => !deletePending && setRemoveId(null)}
        title="Remover ferramental"
        footer={
          <ModalActions
            onCancel={() => !deletePending && setRemoveId(null)}
            submitLabel={deletePending ? 'Removendo…' : 'Remover'}
            onSubmit={() => {
              void handleConfirmDelete();
            }}
            disabled={deletePending}
            danger
          />
        }
      >
        <p className="m-0 text-sm text-zinc-600">
          Remover{' '}
          <span className="font-semibold text-zinc-900">
            {removeTarget?.name ?? 'este ferramental'}
          </span>{' '}
          desta máquina? Esta ação não pode ser desfeita.
        </p>
      </SimpleModal>
    </>
  );
}

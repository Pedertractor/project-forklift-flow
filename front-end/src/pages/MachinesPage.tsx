import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ModalActions, SimpleModal } from '@/components/crud/SimpleModal';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

const selectClass =
  'flex h-[var(--control-height,2.5rem)] w-full rounded-xl border-2 border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition-colors focus-visible:border-[#005fb8] focus-visible:ring-[3px] focus-visible:ring-[#005fb8]/25';

export function MachinesPage() {
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
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['machines'] });
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
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['machines'] });
      setEditRow(null);
      resetForm();
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => deleteMachine(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['machines'] });
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
            <h1 className="m-0 text-2xl font-bold tracking-tight text-zinc-900">Máquinas</h1>
            <p className="mt-1.5 text-sm text-zinc-600">
              Cadastro de máquinas (nome, posição, tipo, setor e operador opcional). Endpoint{' '}
              <code className="rounded bg-zinc-100 px-1 font-mono text-xs">/api/machines</code>.
            </p>
          </div>
          <Button type="button" onClick={openCreate} disabled={!apiReady || busy}>
            Nova máquina
          </Button>
        </header>

        {!ENV.API_URL ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Defina <code className="font-mono">VITE_API_URL</code> e faça login para gerenciar máquinas.
          </p>
        ) : !token ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Faça login com a API ativa (token JWT) para acessar este cadastro.
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="min-w-[12rem] space-y-2">
            <Label htmlFor="machine-sector-filter">Filtrar por setor</Label>
            <select
              id="machine-sector-filter"
              className={selectClass}
              value={sectorFilter}
              onChange={(e) => setSectorFilter(e.target.value)}
              disabled={!apiReady}
            >
              <option value="">Todos</option>
              {sectorsQuery.data?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.typeSector} (#{s.sectorIdAPI})
                </option>
              ))}
            </select>
          </div>
        </div>

        {machinesQuery.isError ? (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {machinesQuery.error instanceof Error ? machinesQuery.error.message : 'Erro ao carregar máquinas.'}
          </p>
        ) : null}

        <Card className="mt-6 overflow-x-auto border border-zinc-200 shadow-sm">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50/90">
                <th className="px-4 py-3 font-semibold text-zinc-700">Nome</th>
                <th className="px-4 py-3 font-semibold text-zinc-700">Posição</th>
                <th className="px-4 py-3 font-semibold text-zinc-700">Tipo</th>
                <th className="px-4 py-3 font-semibold text-zinc-700">Setor</th>
                <th className="px-4 py-3 text-right font-semibold text-zinc-700">Ações</th>
              </tr>
            </thead>
            <tbody>
              {machinesQuery.isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                    Carregando…
                  </td>
                </tr>
              ) : machinesQuery.data?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                    Nenhuma máquina neste filtro.
                  </td>
                </tr>
              ) : (
                machinesQuery.data?.map((row) => (
                  <tr key={row.id} className="border-b border-zinc-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-zinc-900">{row.name}</td>
                    <td className="px-4 py-3 font-mono text-zinc-700">{row.position}</td>
                    <td className="px-4 py-3 text-zinc-700">{row.typeMachine.name}</td>
                    <td className="px-4 py-3 text-zinc-700">{row.sector.typeSector}</td>
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
        title="Nova máquina"
        description="Operador: informe o UUID do usuário apenas se souber o id (opcional)."
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
            <Label htmlFor="m-name">Nome</Label>
            <Input id="m-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Máquina linha A-01" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="m-pos">Posição</Label>
            <Input id="m-pos" value={position} onChange={(e) => setPosition(e.target.value)} placeholder="Ex.: A1" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="m-type">Tipo de máquina</Label>
            <select
              id="m-type"
              className={selectClass}
              value={typeMachineId}
              onChange={(e) => setTypeMachineId(e.target.value)}
            >
              <option value="">Selecione…</option>
              {typesQuery.data?.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="m-sector">Setor</Label>
            <select
              id="m-sector"
              className={selectClass}
              value={sectorId}
              onChange={(e) => setSectorId(e.target.value)}
            >
              <option value="">Selecione…</option>
              {sectorsQuery.data?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.typeSector} (#{s.sectorIdAPI})
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="m-user">Operador (UUID, opcional)</Label>
            <Input
              id="m-user"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Deixe vazio se não houver"
              className="font-mono text-xs"
            />
          </div>
        </div>
      </SimpleModal>

      <SimpleModal
        open={Boolean(editRow)}
        title="Editar máquina"
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
            <Label htmlFor="m-edit-name">Nome</Label>
            <Input id="m-edit-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="m-edit-pos">Posição</Label>
            <Input id="m-edit-pos" value={position} onChange={(e) => setPosition(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="m-edit-type">Tipo de máquina</Label>
            <select
              id="m-edit-type"
              className={selectClass}
              value={typeMachineId}
              onChange={(e) => setTypeMachineId(e.target.value)}
            >
              {typesQuery.data?.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="m-edit-sector">Setor</Label>
            <select
              id="m-edit-sector"
              className={selectClass}
              value={sectorId}
              onChange={(e) => setSectorId(e.target.value)}
            >
              {sectorsQuery.data?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.typeSector} (#{s.sectorIdAPI})
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="m-edit-user">Operador (UUID)</Label>
            <Input
              id="m-edit-user"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="font-mono text-xs"
              disabled={clearOperator}
            />
            <label className="flex items-center gap-2 text-sm text-zinc-700">
              <input
                type="checkbox"
                checked={clearOperator}
                onChange={(e) => setClearOperator(e.target.checked)}
                className="size-4 rounded border-zinc-300"
              />
              Remover operador
            </label>
          </div>
        </div>
      </SimpleModal>

      <SimpleModal
        open={Boolean(deleteRow)}
        title="Excluir máquina"
        description={deleteRow ? `Confirma a exclusão de «${deleteRow.name}»?` : undefined}
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

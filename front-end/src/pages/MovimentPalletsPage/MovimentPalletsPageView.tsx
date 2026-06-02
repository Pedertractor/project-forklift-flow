import { Button } from '@/components/ui/Button';
import { ModalActions, SimpleModal } from '@/components/crud/SimpleModal';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ENV } from '@/constants/env';
import { cn } from '@/lib/utils';
import type { MovimentPalletEquipmentType } from '@/types/moviment-pallet.types';
import type { MovimentPalletsPageViewModel } from './useMovimentPalletsPage';
import { movimentTypePublicIconPath } from '@/utils/operator-moviment-display';
import { PlusIcon } from 'lucide-react';
import AccordionLoader from '@/components/accordionLoader/accordion-loader';

const selectClass =
  'flex h-[var(--control-height,2.5rem)] w-full rounded-xl border-2 border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition-colors focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-brand/25';

function typeLabel(t: string): string {
  return t === 'FORKLIFT' ? 'Empilhadeira' : 'Transpaleteira';
}

const EQUIPMENT_TYPE_OPTIONS: {
  value: MovimentPalletEquipmentType;
  label: string;
}[] = [
  { value: 'FORKLIFT', label: 'Empilhadeira' },
  { value: 'PALLET_TRUCK', label: 'Transpaleteira' },
];

function EquipmentTypePicker({
  value,
  onChange,
  disabled,
  idPrefix,
}: {
  value: MovimentPalletEquipmentType;
  onChange: (next: MovimentPalletEquipmentType) => void;
  disabled?: boolean;
  idPrefix: string;
}) {
  return (
    <div
      className="grid grid-cols-2 gap-3"
      role="radiogroup"
      aria-label="Tipo de equipamento"
    >
      {EQUIPMENT_TYPE_OPTIONS.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            id={`${idPrefix}-${opt.value}`}
            disabled={disabled}
            className={cn(
              'flex flex-col items-center gap-2.5 rounded-2xl border-2 bg-white p-4 text-center outline-none transition-all focus-visible:ring-[3px] focus-visible:ring-brand/25 disabled:cursor-not-allowed disabled:opacity-60',
              selected
                ? 'border-brand bg-gradient-to-br from-brand/[0.08] to-white shadow-sm ring-2 ring-brand/20'
                : 'border-zinc-200 hover:border-zinc-300 hover:shadow-sm',
            )}
            onClick={() => onChange(opt.value)}
          >
            <div className="flex size-16 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50">
              <img
                src={movimentTypePublicIconPath(opt.value)}
                alt=""
                className="h-12 w-auto max-w-[4.5rem] object-contain"
              />
            </div>
            <span className="text-sm font-semibold text-zinc-900">
              {opt.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function MovimentPalletsPageView(vm: MovimentPalletsPageViewModel) {
  const {
    apiReady,
    token,
    sectorOptions,
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
  } = vm;

  return (
    <main className="px-4 py-8 max-[800px]:px-3">
      <div className="mx-auto w-full max-w-6xl">
        <header className="mb-6 flex flex-col gap-4 border-b border-zinc-200 pb-6 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <div>
            <h1 className="m-0 text-2xl font-bold tracking-tight text-zinc-900">
              Equipamentos de movimentação
            </h1>
            <p className="mt-1.5 text-sm text-zinc-600">
              Cadastro de empilhadeiras e transpaleteiras usadas pelos
              operadores de transporte no setor.
            </p>
          </div>
          <Button
            type="button"
            onClick={openCreate}
            disabled={!apiReady || busy}
          >
            <PlusIcon className="size-4" />
            Novo equipamento
          </Button>
        </header>

        {!ENV.API_URL ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Defina <code className="font-mono">VITE_API_URL</code> e faça login
            para gerenciar equipamentos.
          </p>
        ) : !token ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Faça login com a API ativa (token JWT) para acessar este cadastro.
          </p>
        ) : null}

        {missingUserSector ? (
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            Seu usuário não tem setor vinculado e não foi possível listar
            setores pela API. Solicite ao administrador o cadastro do setor no
            seu perfil para vincular equipamentos corretamente.
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="min-w-48 space-y-2">
            <Label htmlFor="mp-sector-filter">Filtrar por setor</Label>
            <select
              id="mp-sector-filter"
              className={selectClass}
              value={sectorFilter}
              onChange={(e) => setSectorFilter(e.target.value)}
              disabled={!apiReady}
            >
              <option value="">Todos</option>
              {sectorOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.typeSector}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-48 space-y-2">
            <Label htmlFor="mp-type-filter">Tipo</Label>
            <select
              id="mp-type-filter"
              className={selectClass}
              value={typeFilter}
              onChange={(e) =>
                setTypeFilter(
                  e.target.value as 'all' | 'FORKLIFT' | 'PALLET_TRUCK',
                )
              }
              disabled={!apiReady}
            >
              <option value="all">Todos</option>
              <option value="FORKLIFT">Empilhadeira</option>
              <option value="PALLET_TRUCK">Transpaleteira</option>
            </select>
          </div>
        </div>

        {listQuery.isError ? (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {listQuery.error instanceof Error
              ? listQuery.error.message
              : 'Erro ao carregar equipamentos.'}
          </p>
        ) : null}

        <Card className="mt-6 overflow-x-auto border border-zinc-200 shadow-sm">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50/90">
                <th className="px-4 py-3 font-semibold text-zinc-700"></th>
                <th className="px-4 py-3 font-semibold text-zinc-700">
                  Código
                </th>
                <th className="px-4 py-3 font-semibold text-zinc-700">Tipo</th>
                <th className="px-4 py-3 font-semibold text-zinc-700">Setor</th>
                <th className="px-4 py-3 font-semibold text-zinc-700">
                  Operador
                </th>
                <th className="px-4 py-3 text-right font-semibold text-zinc-700">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {listQuery.isLoading ? (
                <tr>
                  <td
                    colSpan={6}
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
                    colSpan={6}
                    className="px-4 py-8 text-center text-zinc-500"
                  >
                    Nenhum equipamento neste filtro.
                  </td>
                </tr>
              ) : (
                listQuery.data?.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-zinc-100 last:border-0"
                  >
                    <td className="px-4 py-3">
                      {' '}
                      <img
                        src={movimentTypePublicIconPath(row.type)}
                        alt={row.type}
                        className="size-12 p-1 rounded-lg border border-zinc-200 object-cover"
                      />{' '}
                    </td>
                    <td className="px-4 py-3 font-mono font-medium text-zinc-900">
                      {row.code}
                    </td>
                    <td className="px-4 py-3 text-zinc-700">
                      {typeLabel(row.type)}
                    </td>
                    <td className="px-4 py-3 text-zinc-700">
                      {row.sector ? row.sector.typeSector : '—'}
                    </td>
                    <td className="px-4 py-3 text-zinc-700">
                      {row.operator ? row.operator.name : '—'}
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
        title="Novo equipamento"
        description="Código único e tipo (empilhadeira ou transpaleteira). O setor alinha o equipamento aos operadores do mesmo setor."
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
            <Label htmlFor="mp-code">Código</Label>
            <Input
              id="mp-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Ex.: EMP-01"
            />
          </div>
          <div className="space-y-2">
            <Label>Tipo</Label>
            <EquipmentTypePicker
              idPrefix="mp-type"
              value={equipmentType}
              onChange={setEquipmentType}
              disabled={busy}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mp-sector">Setor</Label>
            <select
              id="mp-sector"
              className={selectClass}
              value={noSector ? '' : sectorId}
              onChange={(e) => {
                setNoSector(false);
                setSectorId(e.target.value);
              }}
              disabled={noSector}
            >
              <option value="">Selecione…</option>
              {sectorOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.typeSector}
                </option>
              ))}
            </select>
          </div>
        </div>
      </SimpleModal>

      <SimpleModal
        open={Boolean(editRow)}
        title="Editar equipamento"
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
          <div className="space-y-2">
            <Label htmlFor="mp-edit-code">Código</Label>
            <Input
              id="mp-edit-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Tipo</Label>
            <EquipmentTypePicker
              idPrefix="mp-edit-type"
              value={equipmentType}
              onChange={setEquipmentType}
              disabled={busy}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mp-edit-sector">Setor</Label>
            <select
              id="mp-edit-sector"
              className={selectClass}
              value={noSector ? '' : sectorId}
              onChange={(e) => {
                setNoSector(false);
                setSectorId(e.target.value);
              }}
              disabled={noSector}
            >
              <option value="">Nenhum</option>
              {sectorOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.typeSector}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-sm text-zinc-700">
              <input
                type="checkbox"
                checked={noSector}
                onChange={(e) => {
                  setNoSector(e.target.checked);
                  if (e.target.checked) {
                    setSectorId('');
                  }
                }}
                className="size-4 rounded border-zinc-300"
              />
              Remover setor
            </label>
          </div>
        </div>
      </SimpleModal>

      <SimpleModal
        open={Boolean(deleteRow)}
        title="Excluir equipamento"
        description={
          deleteRow
            ? `Confirma a exclusão do equipamento «${deleteRow.code}»?`
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

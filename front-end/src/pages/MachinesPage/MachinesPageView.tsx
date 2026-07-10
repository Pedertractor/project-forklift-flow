import { Link, useNavigate } from 'react-router-dom';
import { Road, UserRound, UserRoundX } from 'lucide-react';
import { Button } from '@/components/ui/brand-button';
import { ModalActions, SimpleModal } from '@/components/crud/SimpleModal';
import { DataTableCard } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ENV } from '@/constants/env';
import { type MachinesPageViewModel } from './useMachinesPage';
import { typeMachineImageSrc } from '../TypeMachinesPage/useTypeMachinesPage';
import AccordionLoader from '@/components/accordionLoader/accordion-loader';

import { SelectCombobox } from '@/components/ui/select-combobox';

export function MachinesPageView(vm: MachinesPageViewModel) {
  const {
    apiReady,
    token,
    isAdmin,
    user,
    sectorsForSelect,
    typesQuery,
    streetsForMachineSector,
    streetsForDialogSector,
    dialogStreetsQuery,
    sectorFilter,
    setSectorFilter,
    plantUnitFilter,
    setPlantUnitFilter,
    plantUnit,
    setPlantUnit,
    plantUnitLabel,
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
    streetCreateOpen,
    setStreetCreateOpen,
    name,
    setName,
    assetNumber,
    setAssetNumber,
    pillar,
    setPillar,
    typeMachineId,
    setTypeMachineId,
    sectorId,
    setSectorId,
    machineStreetId,
    setMachineStreetId,
    streetName,
    setStreetName,
    streetColor,
    setStreetColor,
    streetSectorId,
    setStreetSectorId,
    editOperator,
    unlinkOperatorMut,
    openCreate,
    openEdit,
    openStreetCreate,
    createMut,
    updateMut,
    deleteMut,
    createStreetMut,
    busy,
    createError,
    updateError,
    createStreetError,
  } = vm;

  const navigate = useNavigate();

  return (
    <main className="px-4 py-8 max-[800px]:px-3">
      <div className="mx-auto w-full max-w-6xl">
        <header className="mb-6 flex flex-col gap-4 border-b border-zinc-200 pb-6 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <div>
            <h1 className="m-0 text-2xl font-bold tracking-tight text-zinc-900">
              Máquinas de produção
            </h1>
            <p className="m-0 text-sm text-zinc-600">Máquinas de linha de produção.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => navigate('/cadastro/tipos-maquina')}>
              Tipos de máquina
            </Button>
            <Button
              type="button"
              onClick={openStreetCreate}
              disabled={!apiReady || busy || sectorsEmpty}
            >
              Nova rua
            </Button>
            <Button
              type="button"
              onClick={openCreate}
              disabled={!apiReady || busy}
            >
              Nova máquina de produção
            </Button>
          </div>
        </header>

        {!ENV.API_URL ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Defina <code className="font-mono">VITE_BASE_URL_API</code> e faça login
            para gerenciar máquinas de produção.
          </p>
        ) : !token ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Faça login com a API ativa (token JWT) para acessar este cadastro.
          </p>
        ) : null}

        {apiReady && token && (sectorsEmpty || typesEmpty) ? (
          <div className="mt-4 space-y-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            {typesEmpty ? (
              <p className="m-0">
                Não há tipos de máquina cadastrados. Cadastre ao menos um tipo
                com nome e imagem em{' '}
                <Link
                  to="/cadastro/tipos-maquina"
                  className="font-semibold text-brand underline underline-offset-2 hover:text-[#004a8f]"
                >
                  Tipos de máquina
                </Link>{' '}
                antes de criar uma máquina de produção.
              </p>
            ) : null}
            {sectorsEmpty ? (
              <p className="m-0">
                Não há setores retornados pela API. É necessário existir setor
                no sistema para vincular a máquina; verifique dados e permissões
                no back-end.
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="min-w-48 space-y-2">
            <Label htmlFor="machine-sector-filter">Filtrar por setor</Label>
            <SelectCombobox
              id="machine-sector-filter"
              value={sectorFilter}
              onValueChange={setSectorFilter}
              disabled={!apiReady}
              placeholder="Todos"
              options={[
                { value: '', label: 'Todos' },
                ...sectorsForSelect.map((s) => ({
                  value: s.id,
                  label: `${s.typeSector}${
                    typeof s.sectorIdAPI === 'number'
                      ? ` (#${s.sectorIdAPI})`
                      : ''
                  }`,
                })),
              ]}
            />
          </div>
          <div className="min-w-48 space-y-2">
            <Label htmlFor="machine-plant-unit-filter">
              Filtrar por unidade
            </Label>
            <SelectCombobox
              id="machine-plant-unit-filter"
              value={plantUnitFilter}
              onValueChange={(value) =>
                setPlantUnitFilter(value as '' | 'PEDERTRACTOR' | 'TRACTOR')
              }
              disabled={!apiReady}
              placeholder="Todas"
              searchable={false}
              options={[
                { value: '', label: 'Todas' },
                { value: 'PEDERTRACTOR', label: plantUnitLabel.PEDERTRACTOR },
                { value: 'TRACTOR', label: plantUnitLabel.TRACTOR },
              ]}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-10 shrink-0 whitespace-nowrap"
            disabled={
              !apiReady || (sectorFilter === '' && plantUnitFilter === '')
            }
            onClick={() => {
              setSectorFilter('');
              setPlantUnitFilter('');
            }}
          >
            Limpar filtros
          </Button>
        </div>

        {machinesQuery.isError ? (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {machinesQuery.error instanceof Error
              ? machinesQuery.error.message
              : 'Erro ao carregar máquinas de produção.'}
          </p>
        ) : null}

        <DataTableCard className="mt-6">
          <table className="w-full min-w-[920px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50/90">
                <th className="px-4 py-3 font-semibold text-zinc-700"></th>
                <th className="px-4 py-3 font-semibold text-zinc-700">Nome</th>
                <th className="px-4 py-3 font-semibold text-zinc-700">
                  Patrimônio
                </th>
                <th className="px-4 py-3 font-semibold text-zinc-700">Pilar</th>
                <th className="px-4 py-3 font-semibold text-zinc-700">
                  Tipo da máquina
                </th>
                <th className="px-4 py-3 font-semibold text-zinc-700">Setor</th>
                <th className="px-4 py-3 font-semibold text-zinc-700">
                  Unidade
                </th>
                <th className="px-4 py-3 text-right font-semibold text-zinc-700">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {machinesQuery.isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-zinc-500">
                    <div className="flex items-center justify-center">
                      <AccordionLoader />
                    </div>
                  </td>
                </tr>
              ) : machinesQuery.data?.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-zinc-500"
                  >
                    Nenhuma máquina de produção neste filtro.
                  </td>
                </tr>
              ) : (
                machinesQuery.data?.map((row) => {
                  const hasLinks = (row.references ?? 0) > 0;
                  return (
                    <tr
                      key={row.id}
                      className="border-b border-zinc-100 last:border-0"
                    >
                      <td className="px-4 py-3">
                        <img
                          src={typeMachineImageSrc(row.typeMachine.urlImage)}
                          alt=""
                          className="size-12 rounded-lg border border-zinc-200 object-cover"
                          loading="lazy"
                        />
                      </td>
                      <td className="px-4 py-3 font-medium text-zinc-900">
                        {row.name}
                      </td>
                      <td className="px-4 py-3 text-zinc-700">
                        {row.assetNumber ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-zinc-700">
                        {row.pillar ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-zinc-700">
                        <span className="text-zinc-900">
                          {row.typeMachine.name}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-700">
                        {row.sector.typeSector}
                      </td>
                      <td className="px-4 py-3 text-zinc-700">
                        {row.plantUnit}
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
                                ? 'Não é possível excluir: há tarefas ou solicitações vinculadas a esta máquina.'
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
        title="Nova máquina de produção"
        description="Máquina de linha de produção (não é empilhadeira). Preencha nome, unidade, tipo de máquina (modelo) e setor. O operador é opcional (UUID do usuário, se souber o identificador)."
        onClose={() => (!busy ? setCreateOpen(false) : undefined)}
        footer={
          <ModalActions
            onCancel={() => !busy && setCreateOpen(false)}
            submitLabel={busy ? 'Salvando…' : 'Criar'}
            disabled={busy || cannotCreateMachine}
            onSubmit={() => createMut.mutate()}
          />
        }
      >
        {createError ? (
          <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {createError}
          </p>
        ) : null}
        {cannotCreateMachine ? (
          <div className="mb-4 space-y-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-950">
            {typesEmpty ? (
              <p className="m-0">
                Cadastre um tipo em{' '}
                <Link
                  to="/cadastro/tipos-maquina"
                  className="font-semibold text-brand underline underline-offset-2"
                  onClick={() => !busy && setCreateOpen(false)}
                >
                  Tipos de máquina
                </Link>
                .
              </p>
            ) : null}
            {sectorsEmpty ? (
              <p className="m-0">
                Sem setores disponíveis: não é possível salvar até a API
                retornar setores.
              </p>
            ) : null}
          </div>
        ) : null}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="m-name">Nome</Label>
            <Input
              id="m-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Máquina linha A-01"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="m-asset-number">Patrimônio</Label>
            <Input
              id="m-asset-number"
              value={assetNumber}
              onChange={(e) => setAssetNumber(e.target.value)}
              placeholder="Ex.: 123456"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="m-pillar">Pilar da máquina</Label>
            <Input
              id="m-pillar"
              value={pillar}
              onChange={(e) => setPillar(e.target.value)}
              placeholder="Ex.: Pilar 12"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="m-plant-unit">Unidade</Label>
            <SelectCombobox
              id="m-plant-unit"
              value={plantUnit}
              onValueChange={(value) =>
                setPlantUnit(value as 'PEDERTRACTOR' | 'TRACTOR')
              }
              searchable={false}
              options={[
                { value: 'PEDERTRACTOR', label: plantUnitLabel.PEDERTRACTOR },
                { value: 'TRACTOR', label: plantUnitLabel.TRACTOR },
              ]}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="m-type">Tipo de máquina (modelo de produção)</Label>
            <SelectCombobox
              id="m-type"
              value={typeMachineId}
              onValueChange={setTypeMachineId}
              placeholder="Selecione…"
              options={[
                { value: '', label: 'Selecione…' },
                ...(typesQuery.data?.map((t) => ({
                  value: t.id,
                  label: t.name,
                })) ?? []),
              ]}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="m-sector">Setor</Label>
            <SelectCombobox
              id="m-sector"
              value={sectorId}
              onValueChange={setSectorId}
              placeholder="Selecione…"
              options={[
                { value: '', label: 'Selecione…' },
                ...sectorsForSelect.map((s) => ({
                  value: s.id,
                  label: `${s.typeSector}${
                    typeof s.sectorIdAPI === 'number'
                      ? ` (#${s.sectorIdAPI})`
                      : ''
                  }`,
                })),
              ]}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="m-street">Rua (opcional)</Label>
            <SelectCombobox
              id="m-street"
              value={machineStreetId}
              onValueChange={setMachineStreetId}
              placeholder={
                sectorId ? 'Sem rua…' : 'Selecione o setor primeiro…'
              }
              disabled={!sectorId}
              options={[
                { value: '', label: 'Sem rua' },
                ...streetsForMachineSector.map((s) => ({
                  value: s.id,
                  label: s.name,
                  color: s.machineStreetColor,
                })),
              ]}
            />
          </div>
        </div>
      </SimpleModal>

      <SimpleModal
        open={Boolean(editRow)}
        title="Editar máquina de produção"
        description="Máquina de linha de produção. Transporte (empilhadeira / transpaleteira) cadastra-se em Equipamentos de movimentação."
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
            <Label htmlFor="m-edit-name">Nome</Label>
            <Input
              id="m-edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="m-edit-asset-number">Patrimônio</Label>
            <Input
              id="m-edit-asset-number"
              value={assetNumber}
              onChange={(e) => setAssetNumber(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="m-edit-pillar">Pilar da máquina</Label>
            <Input
              id="m-edit-pillar"
              value={pillar}
              onChange={(e) => setPillar(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="m-edit-plant-unit">Unidade</Label>
            <SelectCombobox
              id="m-edit-plant-unit"
              value={plantUnit}
              onValueChange={(value) =>
                setPlantUnit(value as 'PEDERTRACTOR' | 'TRACTOR')
              }
              searchable={false}
              options={[
                { value: 'PEDERTRACTOR', label: plantUnitLabel.PEDERTRACTOR },
                { value: 'TRACTOR', label: plantUnitLabel.TRACTOR },
              ]}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="m-edit-type">
              Tipo de máquina (modelo de produção)
            </Label>
            <SelectCombobox
              id="m-edit-type"
              value={typeMachineId}
              onValueChange={setTypeMachineId}
              options={
                typesQuery.data?.map((t) => ({
                  value: t.id,
                  label: t.name,
                })) ?? []
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="m-edit-sector">Setor</Label>
            <SelectCombobox
              id="m-edit-sector"
              value={sectorId}
              onValueChange={setSectorId}
              options={sectorsForSelect.map((s) => ({
                value: s.id,
                label: `${s.typeSector}${
                  typeof s.sectorIdAPI === 'number'
                    ? ` (#${s.sectorIdAPI})`
                    : ''
                }`,
              }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="m-edit-street">Rua (opcional)</Label>
            <SelectCombobox
              id="m-edit-street"
              value={machineStreetId}
              onValueChange={setMachineStreetId}
              placeholder={
                sectorId ? 'Sem rua…' : 'Selecione o setor primeiro…'
              }
              disabled={!sectorId}
              options={[
                { value: '', label: 'Sem rua' },
                ...streetsForMachineSector.map((s) => ({
                  value: s.id,
                  label: s.name,
                  color: s.machineStreetColor,
                })),
              ]}
            />
          </div>
          <div className="space-y-2">
            <Label>Operador na máquina</Label>
            {editOperator ? (
              <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-zinc-50/90 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600">
                    <UserRound className="size-5" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="m-0 text-sm font-semibold text-zinc-900">
                      {editOperator.name}
                    </p>
                    <p className="mt-0.5 m-0 font-mono text-xs text-zinc-600">
                      Cartão {editOperator.card}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full shrink-0 border-red-200 text-red-700 hover:bg-red-50 sm:w-auto"
                  disabled={!apiReady || busy}
                  onClick={() => unlinkOperatorMut.mutate()}
                >
                  <UserRoundX className="size-4" aria-hidden />
                  {unlinkOperatorMut.isPending
                    ? 'Desvinculando…'
                    : 'Desvincular operador'}
                </Button>
              </div>
            ) : (
              <p className="m-0 rounded-xl border border-dashed border-zinc-200 bg-zinc-50/60 px-4 py-3 text-sm text-zinc-600">
                Nenhum operador vinculado no momento.
              </p>
            )}
          </div>
        </div>
      </SimpleModal>

      <SimpleModal
        open={Boolean(deleteRow)}
        title="Excluir máquina de produção"
        description={
          deleteRow ? `Confirma a exclusão de «${deleteRow.name}»?` : undefined
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

      <SimpleModal
        open={streetCreateOpen}
        title="Nova rua"
        description="Cadastre uma rua do chão de fábrica vinculada a um setor. Só máquinas desse setor poderão usá-la."
        onClose={() => (!busy ? setStreetCreateOpen(false) : undefined)}
        footer={
          <ModalActions
            onCancel={() => !busy && setStreetCreateOpen(false)}
            submitLabel={busy ? 'Salvando…' : 'Criar rua'}
            disabled={busy || sectorsEmpty}
            onSubmit={() => createStreetMut.mutate()}
          />
        }
      >
        {createStreetError ? (
          <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {createStreetError}
          </p>
        ) : null}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="street-name">Nome da rua</Label>
            <Input
              id="street-name"
              value={streetName}
              onChange={(e) => setStreetName(e.target.value)}
              placeholder="Ex.: Rua A"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="street-color">Cor</Label>
            <div className="flex items-center gap-3">
              <Input
                id="street-color"
                type="color"
                value={streetColor}
                onChange={(e) => setStreetColor(e.target.value)}
                className="h-10 w-14 cursor-pointer p-1"
              />
              <Input
                value={streetColor}
                onChange={(e) => setStreetColor(e.target.value)}
                placeholder="#2563eb"
                className="font-mono"
              />
            </div>
          </div>
          {isAdmin ? (
            <div className="space-y-2">
              <Label htmlFor="street-sector">Setor</Label>
              <SelectCombobox
                id="street-sector"
                value={streetSectorId}
                onValueChange={setStreetSectorId}
                placeholder="Selecione…"
                options={[
                  { value: '', label: 'Selecione…' },
                  ...sectorsForSelect.map((s) => ({
                    value: s.id,
                    label: `${s.typeSector}${
                      typeof s.sectorIdAPI === 'number'
                        ? ` (#${s.sectorIdAPI})`
                        : ''
                    }`,
                  })),
                ]}
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Setor</Label>
              <p className="m-0 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
                {user?.sector?.typeSector ?? 'Seu setor'}
              </p>
            </div>
          )}

          <div className="space-y-3 border-t border-zinc-200 pt-4">
            <div>
              <p className="m-0 text-sm font-semibold text-zinc-900">
                Ruas do setor
              </p>
              <p className="m-0 mt-0.5 text-xs text-zinc-500">
                {isAdmin && !streetSectorId
                  ? 'Selecione um setor para ver as ruas cadastradas.'
                  : 'Todas as ruas vinculadas a este setor.'}
              </p>
            </div>
            {dialogStreetsQuery.isLoading &&
            (streetSectorId || (!isAdmin && user?.sectorId)) ? (
              <div className="flex justify-center py-4">
                <AccordionLoader />
              </div>
            ) : streetsForDialogSector.length === 0 ? (
              <p className="m-0 rounded-xl border border-dashed border-zinc-200 bg-zinc-50/70 px-4 py-6 text-center text-sm text-zinc-500">
                {isAdmin && !streetSectorId
                  ? 'Nenhuma rua para exibir.'
                  : 'Nenhuma rua cadastrada neste setor.'}
              </p>
            ) : (
              <div className="grid max-h-64 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
                {streetsForDialogSector.map((street) => (
                  <div
                    key={street.id}
                    className="flex min-w-0 items-center gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2.5"
                  >
                    <span
                      className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50"
                      style={{ color: street.machineStreetColor }}
                      aria-hidden
                    >
                      <Road className="size-4" strokeWidth={2.5} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p
                        className="m-0 truncate text-sm font-semibold"
                        style={{ color: street.machineStreetColor }}
                      >
                        {street.name}
                      </p>
                      <p className="m-0 mt-0.5 text-xs text-zinc-500">
                        {(street.references ?? 0) === 1
                          ? '1 máquina'
                          : `${street.references ?? 0} máquinas`}
                      </p>
                    </div>
                    <span
                      className="size-3.5 shrink-0 rounded-full border border-zinc-200"
                      style={{ backgroundColor: street.machineStreetColor }}
                      title={street.machineStreetColor}
                      aria-hidden
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </SimpleModal>
    </main>
  );
}

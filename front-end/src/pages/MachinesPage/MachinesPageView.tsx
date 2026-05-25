import { Link, useNavigate } from 'react-router-dom';
import { UserRound, UserRoundX } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ModalActions, SimpleModal } from '@/components/crud/SimpleModal';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ENV } from '@/constants/env';
import { type MachinesPageViewModel } from './useMachinesPage';
import { typeMachineImageSrc } from '../TypeMachinesPage/useTypeMachinesPage';

const selectClass =
  'flex h-[var(--control-height,2.5rem)] w-full rounded-xl border-2 border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition-colors focus-visible:border-[#005fb8] focus-visible:ring-[3px] focus-visible:ring-[#005fb8]/25';

export function MachinesPageView(vm: MachinesPageViewModel) {
  const {
    apiReady,
    token,
    sectorsForSelect,
    typesQuery,
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
    editOperator,
    unlinkOperatorMut,
    goToMapToCreateMachine,
    openEdit,
    createMut,
    updateMut,
    deleteMut,
    busy,
    createError,
    updateError,
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
          </div>
          <div className="flex gap-3">
            <Button onClick={() => navigate('/cadastro/tipos-maquina')}>
              Tipos de máquina
            </Button>
            <Button
              type="button"
              onClick={goToMapToCreateMachine}
              disabled={!apiReady || busy}
            >
              Nova máquina de produção
            </Button>
          </div>
        </header>

        {!ENV.API_URL ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Defina <code className="font-mono">VITE_API_URL</code> e faça login
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
                  className="font-semibold text-[#005fb8] underline underline-offset-2 hover:text-[#004a8f]"
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
            <select
              id="machine-sector-filter"
              className={selectClass}
              value={sectorFilter}
              onChange={(e) => setSectorFilter(e.target.value)}
              disabled={!apiReady}
            >
              <option value="">Todos</option>
              {sectorsForSelect.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.typeSector}
                  {typeof s.sectorIdAPI === 'number'
                    ? ` (#${s.sectorIdAPI})`
                    : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-48 space-y-2">
            <Label htmlFor="machine-plant-unit-filter">
              Filtrar por unidade
            </Label>
            <select
              id="machine-plant-unit-filter"
              className={selectClass}
              value={plantUnitFilter}
              onChange={(e) =>
                setPlantUnitFilter(
                  e.target.value as '' | 'PEDERTRACTOR' | 'TRACTOR',
                )
              }
              disabled={!apiReady}
            >
              <option value="">Todas</option>
              <option value="PEDERTRACTOR">
                {plantUnitLabel.PEDERTRACTOR}
              </option>
              <option value="TRACTOR">{plantUnitLabel.TRACTOR}</option>
            </select>
          </div>
        </div>

        {machinesQuery.isError ? (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {machinesQuery.error instanceof Error
              ? machinesQuery.error.message
              : 'Erro ao carregar máquinas de produção.'}
          </p>
        ) : null}

        <Card className="mt-6 overflow-x-auto border border-zinc-200 shadow-sm">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50/90">
                <th className="px-4 py-3 font-semibold text-zinc-700"></th>
                <th className="px-4 py-3 font-semibold text-zinc-700">Nome</th>
                <th className="px-4 py-3 font-semibold text-zinc-700">
                  Posição
                </th>
                <th className="px-4 py-3 font-semibold text-zinc-700">
                  Tipo (produção)
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
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-zinc-500"
                  >
                    Carregando…
                  </td>
                </tr>
              ) : machinesQuery.data?.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-zinc-500"
                  >
                    Nenhuma máquina de produção neste filtro.
                  </td>
                </tr>
              ) : (
                machinesQuery.data?.map((row) => (
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
                    <td className="px-4 py-3 font-mono text-zinc-700">
                      {row.position}
                    </td>
                    <td className="px-4 py-3 text-zinc-700">
                      <span className="text-zinc-900">
                        {row.typeMachine.name}
                      </span>
                      <span className="mt-0.5 block text-xs font-normal text-zinc-500">
                        modelo de máquina de produção
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-700">
                      {row.sector.typeSector}
                    </td>
                    <td className="px-4 py-3 text-zinc-700">
                      {plantUnitLabel[row.plantUnit]}
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
        title="Nova máquina de produção"
        description="Máquina de linha de produção (não é empilhadeira). Preencha nome, posição, tipo de máquina (modelo) e setor. O operador é opcional (UUID do usuário, se souber o identificador)."
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
                  className="font-semibold text-[#005fb8] underline underline-offset-2"
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
            <Label htmlFor="m-pos">Posição</Label>
            <Input
              id="m-pos"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="Ex.: A1 ou MAP:0.35,0.62"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="m-plant-unit">Unidade (planta no mapa)</Label>
            <select
              id="m-plant-unit"
              className={selectClass}
              value={plantUnit}
              onChange={(e) =>
                setPlantUnit(e.target.value as 'PEDERTRACTOR' | 'TRACTOR')
              }
            >
              <option value="PEDERTRACTOR">
                {plantUnitLabel.PEDERTRACTOR}
              </option>
              <option value="TRACTOR">{plantUnitLabel.TRACTOR}</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="m-type">Tipo de máquina (modelo de produção)</Label>
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
              {sectorsForSelect.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.typeSector}
                  {typeof s.sectorIdAPI === 'number'
                    ? ` (#${s.sectorIdAPI})`
                    : ''}
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
            <Label htmlFor="m-edit-plant-unit">Unidade (planta no mapa)</Label>
            <select
              id="m-edit-plant-unit"
              className={selectClass}
              value={plantUnit}
              onChange={(e) =>
                setPlantUnit(e.target.value as 'PEDERTRACTOR' | 'TRACTOR')
              }
            >
              <option value="PEDERTRACTOR">
                {plantUnitLabel.PEDERTRACTOR}
              </option>
              <option value="TRACTOR">{plantUnitLabel.TRACTOR}</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="m-edit-type">
              Tipo de máquina (modelo de produção)
            </Label>
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
              {sectorsForSelect.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.typeSector}
                  {typeof s.sectorIdAPI === 'number'
                    ? ` (#${s.sectorIdAPI})`
                    : ''}
                </option>
              ))}
            </select>
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
    </main>
  );
}

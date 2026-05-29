import { Button } from '@/components/ui/Button';
import { ModalActions, SimpleModal } from '@/components/crud/SimpleModal';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ENV } from '@/constants/env';
import { LEADER_CREATABLE_ROLES } from '@/types/role.types';
import type { UsersPageViewModel } from './useUsersPage';
import AccordionLoader from '@/components/accordionLoader/accordion-loader';

const selectClass =
  'flex h-[var(--control-height,2.5rem)] w-full rounded-xl border-2 border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition-colors focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-brand/25';

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  LEADER: 'Líder',
  SUPPLY_OPERATOR: 'Operador de abastecimento',
  OPERATOR_MACHINE: 'Operador de máquina',
  PALLET_TRANSPORTER: 'Transportador de pallet',
  SUPERVISOR: 'Supervisor',
  MANAGER: 'Gestor',
};

function roleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role;
}

function unitLabelApi(unit: string): string {
  return unit === 'PEDERTRACTOR' ? 'PEDERTRACTOR' : 'TRACTOR';
}

export function UsersPageView(vm: UsersPageViewModel) {
  const {
    apiReady,
    token,
    isAdmin,
    isLeader,
    canListUsers,
    leaderSectorLabel,
    leaderMissingSector,
    usersQuery,
    rolesQuery,
    sectorsQuery,
    createOpen,
    setCreateOpen,
    openCreateModal,
    resetCreateForm,
    formCard,
    setFormCard,
    formUnit,
    setFormUnit,
    verifiedEmployee,
    verifyState,
    verifyMut,
    formRole,
    setFormRole,
    formSectorId,
    setFormSectorId,
    createMut,
    busyCreate,
    roleEditUser,
    setRoleEditUser,
    roleEditValue,
    setRoleEditValue,
    rolePatchMut,
    detailUser,
    setDetailUser,
    resetTarget,
    setResetTarget,
    resetMut,
    busyAdmin,
    roleEditOptions,
    leaderCanEditUserRole,
    openUserDetail,
    openResetFromDetail,
    openRoleEditFromDetail,
  } = vm;

  const canManageRow = isAdmin || isLeader;

  const createErr =
    createMut.error instanceof Error ? createMut.error.message : null;
  const roleErr =
    rolePatchMut.error instanceof Error ? rolePatchMut.error.message : null;
  const resetErr =
    resetMut.error instanceof Error ? resetMut.error.message : null;

  return (
    <main className="px-4 py-8 max-[800px]:px-3">
      <div className="mx-auto w-full max-w-6xl">
        <header className="mb-6 flex flex-col gap-4 border-b border-zinc-200 pb-6 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <div>
            <h1 className="m-0 text-2xl font-bold tracking-tight text-zinc-900">
              {isAdmin ? 'Usuários' : 'Equipe'}
            </h1>
            <p className="mt-1.5 text-sm text-zinc-600">
              {isAdmin
                ? 'Gestão de usuários.'
                : 'Cadastre colaboradores do seu setor com perfis de operação.'}
            </p>
          </div>
          <Button
            type="button"
            onClick={openCreateModal}
            disabled={!apiReady || busyCreate || leaderMissingSector}
          >
            Novo usuário
          </Button>
        </header>

        {!ENV.API_URL ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Defina <code className="font-mono">VITE_API_URL</code> e faça login.
          </p>
        ) : !token ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Faça login com a API ativa para usar esta tela.
          </p>
        ) : null}

        {leaderMissingSector ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            Seu usuário líder não está vinculado a um setor. Não é possível
            criar colaboradores até o cadastro ser corrigido.
          </p>
        ) : null}

        {canListUsers && usersQuery.isError ? (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {usersQuery.error instanceof Error
              ? usersQuery.error.message
              : 'Erro ao carregar usuários.'}
          </p>
        ) : null}

        {canListUsers ? (
          <Card className="mt-6 overflow-x-auto border border-zinc-200 shadow-sm">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50/90">
                  <th className="px-4 py-3 font-semibold text-zinc-700">
                    Nome
                  </th>
                  <th className="px-4 py-3 font-semibold text-zinc-700">
                    Cartão
                  </th>
                  <th className="px-4 py-3 font-semibold text-zinc-700">
                    Unidade
                  </th>
                  <th className="px-4 py-3 font-semibold text-zinc-700">
                    Perfil
                  </th>
                  {isAdmin ? (
                    <th className="px-4 py-3 font-semibold text-zinc-700">
                      Setor
                    </th>
                  ) : null}
                  <th className="px-4 py-3 font-semibold text-zinc-700">
                    Acesso
                  </th>
                </tr>
              </thead>
              <tbody>
                {usersQuery.isLoading ? (
                  <tr>
                    <td
                      colSpan={isAdmin ? 6 : 5}
                      className="px-4 py-8 text-zinc-500"
                    >
                      <div className="flex items-center justify-center">
                        <AccordionLoader />
                      </div>
                    </td>
                  </tr>
                ) : usersQuery.data?.length === 0 ? (
                  <tr>
                    <td
                      colSpan={isAdmin ? 6 : 5}
                      className="px-4 py-8 text-center text-zinc-500"
                    >
                      {isLeader
                        ? 'Nenhum usuário vinculado ao seu setor.'
                        : 'Nenhum usuário retornado.'}
                    </td>
                  </tr>
                ) : (
                  usersQuery.data?.map((row) => (
                    <tr
                      key={row.id}
                      className={
                        canManageRow
                          ? 'cursor-pointer border-b border-zinc-100 transition-colors last:border-0 hover:bg-zinc-50/90'
                          : 'border-b border-zinc-100 last:border-0'
                      }
                      onClick={
                        canManageRow && !busyAdmin
                          ? () => openUserDetail(row)
                          : undefined
                      }
                    >
                      <td className="px-4 py-3 font-medium text-zinc-900">
                        {row.name}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-zinc-700">
                        {row.card}
                      </td>
                      <td className="px-4 py-3 text-zinc-700">
                        {unitLabelApi(row.unit)}
                      </td>
                      <td className="px-4 py-3 text-zinc-800">
                        {roleLabel(row.role)}
                      </td>
                      {isAdmin ? (
                        <td className="px-4 py-3 text-zinc-700">
                          {row.sector?.typeSector ?? '—'}
                        </td>
                      ) : null}
                      <td className="px-4 py-3 text-zinc-600">
                        {row.isLogged ? 'Senha já definida' : 'Primeiro acesso'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Card>
        ) : null}

        <SimpleModal
          open={createOpen}
          title="Novo usuário"
          description="Informe o cartão e unidade."
          onClose={() => {
            if (!busyCreate) {
              setCreateOpen(false);
              resetCreateForm();
            }
          }}
          footer={
            <ModalActions
              onCancel={() => {
                if (!busyCreate) {
                  setCreateOpen(false);
                  resetCreateForm();
                }
              }}
              submitLabel={busyCreate ? 'Aguarde…' : 'Criar usuário'}
              disabled={busyCreate || verifyState !== 'ok' || !formRole}
              onSubmit={() => createMut.mutate()}
            />
          }
        >
          {createErr ? (
            <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {createErr}
            </p>
          ) : null}

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nu-card">Cartão</Label>
                <Input
                  id="nu-card"
                  value={formCard}
                  onChange={(e) => setFormCard(e.target.value)}
                  inputMode="numeric"
                  placeholder="Número do cartão"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <span className="text-sm font-medium text-zinc-900">
                  Unidade
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={
                      formUnit === 'pedertractor' ? 'default' : 'outline'
                    }
                    className="w-full"
                    onClick={() => setFormUnit('pedertractor')}
                    disabled={busyCreate}
                  >
                    PEDERTRACTOR
                  </Button>
                  <Button
                    type="button"
                    variant={formUnit === 'tractor' ? 'default' : 'outline'}
                    className="w-full"
                    onClick={() => setFormUnit('tractor')}
                    disabled={busyCreate}
                  >
                    TRACTOR
                  </Button>
                </div>
              </div>
            </div>

            <Button
              type="button"
              variant="secondary"
              className="w-full sm:w-auto"
              disabled={busyCreate || !formCard.trim()}
              onClick={() => verifyMut.mutate()}
            >
              {verifyMut.isPending ? 'Validando…' : 'Validar colaborador'}
            </Button>

            {verifyState === 'fail' ? (
              <p className="m-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                Colaborador não encontrado. Ajuste cartão/unidade ou tente
                novamente.
              </p>
            ) : null}

            {verifyState === 'ok' && verifiedEmployee ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/90 px-3 py-2 text-sm text-emerald-900">
                <p className="m-0 font-semibold">Colaborador encontrado</p>
                <p className="mt-1 mb-0 text-emerald-800">
                  {verifiedEmployee.name} · cartão {verifiedEmployee.cardNumber}
                </p>
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="nu-role">Perfil</Label>
              <select
                id="nu-role"
                className={selectClass}
                value={formRole}
                onChange={(e) => setFormRole(e.target.value)}
                disabled={busyCreate || (isAdmin && !rolesQuery.data?.length)}
              >
                {isLeader
                  ? LEADER_CREATABLE_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {roleLabel(r)}
                      </option>
                    ))
                  : (rolesQuery.data ?? []).map((r) => (
                      <option key={r} value={r}>
                        {roleLabel(r)}
                      </option>
                    ))}
              </select>
            </div>

            {isAdmin ? (
              <div className="space-y-2">
                <Label htmlFor="nu-sector">Setor (opcional)</Label>
                <select
                  id="nu-sector"
                  className={selectClass}
                  value={formSectorId}
                  onChange={(e) => setFormSectorId(e.target.value)}
                  disabled={busyCreate || sectorsQuery.isLoading}
                >
                  <option value="">Sem setor</option>
                  {(sectorsQuery.data ?? []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.typeSector}
                    </option>
                  ))}
                </select>
                <p className="m-0 text-xs text-zinc-500">
                  Administradores podem vincular qualquer setor ou deixar sem
                  setor.
                </p>
              </div>
            ) : (
              <p className="m-0 text-xs text-zinc-500">
                O novo usuário será criado no mesmo setor do seu perfil de
                líder.
              </p>
            )}
          </div>
        </SimpleModal>

        <SimpleModal
          open={Boolean(detailUser)}
          title={detailUser?.name ?? 'Usuário'}
          description={
            detailUser
              ? `Cartão ${detailUser.card} · ${unitLabelApi(detailUser.unit)}`
              : undefined
          }
          onClose={() => (!busyAdmin ? setDetailUser(null) : undefined)}
          footer={
            <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={busyAdmin}
                onClick={() => setDetailUser(null)}
              >
                Fechar
              </Button>
              {isAdmin ||
              (isLeader && detailUser && leaderCanEditUserRole(detailUser)) ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={!apiReady || busyAdmin}
                  onClick={openRoleEditFromDetail}
                >
                  Alterar perfil
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                className="border-amber-200 text-amber-900 hover:bg-amber-50"
                disabled={!apiReady || busyAdmin}
                onClick={openResetFromDetail}
              >
                Resetar senha
              </Button>
            </div>
          }
        >
          {detailUser ? (
            <dl className="m-0 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="font-medium text-zinc-500">Perfil</dt>
                <dd className="mt-0.5 text-zinc-900">
                  {roleLabel(detailUser.role)}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-zinc-500">Acesso</dt>
                <dd className="mt-0.5 text-zinc-900">
                  {detailUser.isLogged
                    ? 'Senha já definida'
                    : 'Primeiro acesso'}
                </dd>
              </div>
              {isAdmin && detailUser.sector ? (
                <div className="sm:col-span-2">
                  <dt className="font-medium text-zinc-500">Setor</dt>
                  <dd className="mt-0.5 text-zinc-900">
                    {detailUser.sector.typeSector}
                  </dd>
                </div>
              ) : isLeader && leaderSectorLabel ? (
                <div className="sm:col-span-2">
                  <dt className="font-medium text-zinc-500">Setor</dt>
                  <dd className="mt-0.5 text-zinc-900">{leaderSectorLabel}</dd>
                </div>
              ) : null}
              <p className="m-0 text-xs text-zinc-500 sm:col-span-2">
                {isLeader
                  ? 'Altere o perfil de operação ou redefina a senha inicial de colaboradores do seu setor.'
                  : 'Altere o perfil ou redefina a senha inicial para o padrão do ambiente.'}
              </p>
            </dl>
          ) : null}
        </SimpleModal>

        <SimpleModal
          open={Boolean(roleEditUser)}
          title="Alterar perfil"
          description={
            roleEditUser
              ? `Usuário: ${roleEditUser.name} (${roleEditUser.card})`
              : undefined
          }
          onClose={() => (!busyAdmin ? setRoleEditUser(null) : undefined)}
          footer={
            <ModalActions
              onCancel={() => !busyAdmin && setRoleEditUser(null)}
              submitLabel={busyAdmin ? 'Salvando…' : 'Salvar perfil'}
              disabled={busyAdmin}
              onSubmit={() => {
                if (roleEditUser) {
                  rolePatchMut.mutate({
                    id: roleEditUser.id,
                    role: roleEditValue,
                  });
                }
              }}
            />
          }
        >
          {roleErr ? (
            <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {roleErr}
            </p>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="edit-role">Novo perfil</Label>
            <select
              id="edit-role"
              className={selectClass}
              value={roleEditValue}
              onChange={(e) => setRoleEditValue(e.target.value)}
              disabled={busyAdmin || roleEditOptions.length === 0}
            >
              {roleEditOptions.map((r) => (
                <option key={r} value={r}>
                  {roleLabel(r)}
                </option>
              ))}
            </select>
          </div>
        </SimpleModal>

        <SimpleModal
          open={Boolean(resetTarget)}
          title="Redefinir senha inicial"
          description={
            resetTarget
              ? `Confirma redefinição da senha de «${resetTarget.name}» para a senha padrão do ambiente? O usuário precisará trocar a senha no próximo fluxo de primeiro acesso.`
              : undefined
          }
          onClose={() => (!busyAdmin ? setResetTarget(null) : undefined)}
          footer={
            <ModalActions
              onCancel={() => !busyAdmin && setResetTarget(null)}
              submitLabel={busyAdmin ? 'Enviando…' : 'Confirmar redefinição'}
              disabled={busyAdmin}
              danger
              onSubmit={() => {
                if (resetTarget) {
                  resetMut.mutate(resetTarget.id);
                }
              }}
            />
          }
        >
          {resetErr ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {resetErr}
            </p>
          ) : null}
        </SimpleModal>
      </div>
    </main>
  );
}

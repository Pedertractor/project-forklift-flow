import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from '@/lib/toast';
import { ENV } from '@/constants/env';
import { toastApiError } from '@/lib/toast-helpers';
import { fetchSectors } from '@/services/sectors-api';
import {
  createUserRequest,
  fetchEmployeeInfoByCardAndUnit,
  fetchUserRolesEnum,
  fetchUsersList,
  patchUserRoleRequest,
  postResetUserPasswordRequest,
} from '@/services/users-api';
import { useAuthStore } from '@/store/auth.store';
import type { EmployeeInfoResponse } from '@/types/employee-api.types';
import {
  isAppRole,
  LEADER_CREATABLE_ROLES,
} from '@/types/role.types';
import type { AppUnit } from '@/types/user.types';
import type { UserListRow } from '@/types/users-admin.types';

function useApiReady(): boolean {
  const t = useAuthStore((s) => s.token);
  return Boolean(ENV.API_URL && t);
}

export function useUsersPage() {
  const queryClient = useQueryClient();
  const authUser = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const apiReady = useApiReady();
  const isAdmin = authUser?.role === 'ADMIN';
  const isLeader = authUser?.role === 'LEADER';
  const leaderSectorLabel = authUser?.sector?.typeSector ?? null;
  const leaderMissingSector = isLeader && !authUser?.sectorId;

  const canListUsers =
    apiReady && (isAdmin || isLeader) && !leaderMissingSector;

  const usersQuery = useQuery({
    queryKey: ['users', isLeader ? authUser?.sectorId : 'all'],
    queryFn: fetchUsersList,
    enabled: canListUsers,
  });

  const rolesQuery = useQuery({
    queryKey: ['user-roles'],
    queryFn: fetchUserRolesEnum,
    enabled: apiReady && isAdmin,
  });

  const sectorsQuery = useQuery({
    queryKey: ['sectors'],
    queryFn: fetchSectors,
    enabled: apiReady && isAdmin,
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [formCard, setFormCard] = useState('');
  const [formUnit, setFormUnit] = useState<AppUnit>('pedertractor');
  const [verifiedEmployee, setVerifiedEmployee] = useState<EmployeeInfoResponse | null>(null);
  const [verifyState, setVerifyState] = useState<'idle' | 'ok' | 'fail'>('idle');
  const [formRole, setFormRole] = useState('');
  const [formSectorId, setFormSectorId] = useState('');

  const [roleEditUser, setRoleEditUser] = useState<UserListRow | null>(null);
  const [roleEditValue, setRoleEditValue] = useState('');

  const [detailUser, setDetailUser] = useState<UserListRow | null>(null);
  const [resetTarget, setResetTarget] = useState<UserListRow | null>(null);

  const [searchFilter, setSearchFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [sectorFilter, setSectorFilter] = useState('');
  const [unitFilter, setUnitFilter] = useState<'' | 'PEDERTRACTOR' | 'TRACTOR'>('');

  const filteredUsers = useMemo(() => {
    const rows = usersQuery.data ?? [];
    const search = searchFilter.trim().toLowerCase();

    return rows.filter((row) => {
      if (search) {
        const haystack = `${row.name} ${row.card}`.toLowerCase();
        if (!haystack.includes(search)) {
          return false;
        }
      }
      if (roleFilter && row.role !== roleFilter) {
        return false;
      }
      if (sectorFilter && row.sectorId !== sectorFilter) {
        return false;
      }
      if (unitFilter && row.unit !== unitFilter) {
        return false;
      }
      return true;
    });
  }, [
    usersQuery.data,
    searchFilter,
    roleFilter,
    sectorFilter,
    unitFilter,
  ]);

  const roleFilterOptions = useMemo(() => {
    if (isAdmin) {
      return rolesQuery.data ?? [];
    }
    const fromData = new Set(
      (usersQuery.data ?? []).map((row) => row.role),
    );
    return [...fromData].sort();
  }, [isAdmin, rolesQuery.data, usersQuery.data]);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- limpar validação ao mudar cartão/unidade */
    setVerifiedEmployee(null);
    setVerifyState('idle');
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [formCard, formUnit]);

  const resetCreateForm = useCallback(() => {
    setFormCard('');
    setFormUnit('pedertractor');
    setVerifiedEmployee(null);
    setVerifyState('idle');
    setFormRole('');
    setFormSectorId('');
  }, []);

  const openCreateModal = useCallback(() => {
    resetCreateForm();
    setFormUnit(authUser?.unit ?? 'pedertractor');
    setCreateOpen(true);
    if (isLeader) {
      setFormRole(LEADER_CREATABLE_ROLES[0]);
    }
  }, [authUser?.unit, isLeader, resetCreateForm]);

  useEffect(() => {
    if (!createOpen || !isAdmin) {
      return;
    }
    const roles = rolesQuery.data;
    if (!roles?.length) {
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- default do select quando a lista de roles carrega
    setFormRole((prev) => (prev === '' ? roles[0] : prev));
  }, [createOpen, isAdmin, rolesQuery.data]);

  const verifyMut = useMutation({
    mutationFn: () => {
      const card = formCard.trim();
      if (!card) {
        throw new Error('Informe o número do cartão.');
      }
      return fetchEmployeeInfoByCardAndUnit(card, formUnit);
    },
    onMutate: () => {
      setVerifyState('idle');
      setVerifiedEmployee(null);
    },
    onSuccess: (data) => {
      setVerifiedEmployee(data);
      setVerifyState('ok');
      toast.success('Colaborador encontrado na API de verificação.');
    },
    onError: (err) => {
      setVerifiedEmployee(null);
      setVerifyState('fail');
      toastApiError(err);
    },
  });

  const createMut = useMutation({
    mutationFn: () => {
      if (!verifiedEmployee) {
        throw new Error('Valide o colaborador na API antes de criar o usuário.');
      }
      if (!formRole) {
        throw new Error('Selecione o perfil.');
      }
      return createUserRequest({
        card: formCard.trim(),
        unit: formUnit,
        role: formRole,
        sectorId: isAdmin ? (formSectorId.trim() === '' ? null : formSectorId) : undefined,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
      setCreateOpen(false);
      resetCreateForm();
      toast.success('Usuário criado com sucesso.');
    },
    onError: toastApiError,
  });

  const rolePatchMut = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => patchUserRoleRequest(id, role),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
      setRoleEditUser(null);
      toast.success('Perfil do usuário atualizado.');
    },
    onError: toastApiError,
  });

  const resetMut = useMutation({
    mutationFn: (userId: string) => postResetUserPasswordRequest(userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
      setResetTarget(null);
      toast.success('Senha redefinida para o padrão do ambiente.');
    },
    onError: toastApiError,
  });

  const roleEditOptions = isAdmin
    ? (rolesQuery.data ?? [])
    : [...LEADER_CREATABLE_ROLES];

  const leaderCanEditUserRole = (row: UserListRow) =>
    row.role !== 'ADMIN' && row.role !== 'LEADER';

  const openRoleEdit = (row: UserListRow) => {
    setRoleEditUser(row);
    if (isLeader) {
      const initial = isAppRole(row.role) && LEADER_CREATABLE_ROLES.includes(row.role)
        ? row.role
        : LEADER_CREATABLE_ROLES[0];
      setRoleEditValue(initial);
      return;
    }
    setRoleEditValue(row.role);
  };

  const openUserDetail = (row: UserListRow) => {
    setDetailUser(row);
  };

  const openResetFromDetail = () => {
    if (!detailUser) {
      return;
    }
    setResetTarget(detailUser);
    setDetailUser(null);
  };

  const openRoleEditFromDetail = () => {
    if (!detailUser) {
      return;
    }
    openRoleEdit(detailUser);
    setDetailUser(null);
  };

  const busyCreate = verifyMut.isPending || createMut.isPending;
  const busyAdmin = rolePatchMut.isPending || resetMut.isPending;

  const hasActiveFilters =
    searchFilter.trim() !== '' ||
    roleFilter !== '' ||
    sectorFilter !== '' ||
    unitFilter !== '';

  const clearFilters = useCallback(() => {
    setSearchFilter('');
    setRoleFilter('');
    setSectorFilter('');
    setUnitFilter('');
  }, []);

  return {
    apiReady,
    token,
    authUser,
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
    roleEditOptions,
    leaderCanEditUserRole,
    detailUser,
    setDetailUser,
    resetTarget,
    setResetTarget,
    resetMut,
    busyAdmin,
    openRoleEdit,
    openUserDetail,
    openResetFromDetail,
    openRoleEditFromDetail,
    searchFilter,
    setSearchFilter,
    roleFilter,
    setRoleFilter,
    sectorFilter,
    setSectorFilter,
    unitFilter,
    setUnitFilter,
    filteredUsers,
    roleFilterOptions,
    hasActiveFilters,
    clearFilters,
  };
}

export type UsersPageViewModel = ReturnType<typeof useUsersPage>;

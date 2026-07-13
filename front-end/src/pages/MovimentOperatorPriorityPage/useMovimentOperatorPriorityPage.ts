import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

import { ENV } from '@/constants/env';
import { toast } from '@/lib/toast';
import { toastApiError } from '@/lib/toast-helpers';
import {
  fetchMovimentOperatorPriorityBoard,
  replaceOperatorPreferredMachines,
} from '@/services/moviment-operator-machine-links-api';
import { fetchSectors } from '@/services/sectors-api';
import { useAuthStore } from '@/store/auth.store';
import { hasAdminPrivileges } from '@/types/role.types';

export const MOVIMENT_OPERATOR_PRIORITY_BOARD_KEY =
  'moviment-operator-priority-board' as const;

export function useMovimentOperatorPriorityPage() {
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const apiReady = Boolean(ENV.API_URL && token);
  const isAdmin = hasAdminPrivileges(user?.role);
  const isLeader = user?.role === 'LEADER';
  const canAccess = isAdmin || isLeader;

  const leaderSectorId =
    user?.sectorId?.trim() || user?.sector?.id?.trim() || '';
  const leaderMissingSector = isLeader && !leaderSectorId;

  const [sectorFilter, setSectorFilter] = useState('');
  const [selectedOperatorId, setSelectedOperatorId] = useState<string | null>(
    null,
  );
  const [operatorSearch, setOperatorSearch] = useState('');
  const [machineSearch, setMachineSearch] = useState('');

  useEffect(() => {
    if (isLeader && leaderSectorId) {
      setSectorFilter(leaderSectorId);
    }
  }, [isLeader, leaderSectorId]);

  const sectorIdForQuery = isAdmin
    ? sectorFilter || undefined
    : leaderSectorId || undefined;

  const sectorsQuery = useQuery({
    queryKey: ['sectors', 'moviment-operator-priority'],
    queryFn: fetchSectors,
    enabled: apiReady && isAdmin,
  });

  const boardQuery = useQuery({
    queryKey: [
      MOVIMENT_OPERATOR_PRIORITY_BOARD_KEY,
      sectorIdForQuery ?? 'all',
    ],
    queryFn: () =>
      fetchMovimentOperatorPriorityBoard({
        sectorId: sectorIdForQuery,
      }),
    enabled: apiReady && canAccess && !leaderMissingSector,
  });

  const operators = boardQuery.data?.operators ?? [];
  const machines = boardQuery.data?.machines ?? [];

  const filteredOperators = useMemo(() => {
    const q = operatorSearch.trim().toLocaleLowerCase('pt-BR');
    if (!q) return operators;
    return operators.filter(
      (op) =>
        op.name.toLocaleLowerCase('pt-BR').includes(q) ||
        op.card.toLocaleLowerCase('pt-BR').includes(q) ||
        (op.sector?.typeSector ?? '').toLocaleLowerCase('pt-BR').includes(q),
    );
  }, [operators, operatorSearch]);

  const selectedOperator =
    operators.find((op) => op.id === selectedOperatorId) ??
    filteredOperators[0] ??
    null;

  const effectiveOperatorId = selectedOperator?.id ?? null;

  const machinesForOperator = useMemo(() => {
    if (!selectedOperator) return [];
    const sectorId = selectedOperator.sectorId;
    const scoped = sectorId
      ? machines.filter((m) => m.sectorId === sectorId)
      : machines;
    const q = machineSearch.trim().toLocaleLowerCase('pt-BR');
    if (!q) return scoped;
    return scoped.filter(
      (m) =>
        m.name.toLocaleLowerCase('pt-BR').includes(q) ||
        (m.assetNumber ?? '').toLocaleLowerCase('pt-BR').includes(q) ||
        (m.pillar ?? '').toLocaleLowerCase('pt-BR').includes(q) ||
        (m.machineStreet?.name ?? '').toLocaleLowerCase('pt-BR').includes(q),
    );
  }, [machines, machineSearch, selectedOperator]);

  const linkedSet = useMemo(
    () => new Set(selectedOperator?.linkedMachineIds ?? []),
    [selectedOperator],
  );

  const saveMut = useMutation({
    mutationFn: async (nextIds: string[]) => {
      if (!effectiveOperatorId) {
        throw new Error('Selecione um operador.');
      }
      return replaceOperatorPreferredMachines(effectiveOperatorId, nextIds);
    },
    onMutate: async (nextIds) => {
      if (!effectiveOperatorId) return;
      const queryKey = [
        MOVIMENT_OPERATOR_PRIORITY_BOARD_KEY,
        sectorIdForQuery ?? 'all',
      ] as const;
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<{
        operators: { id: string; linkedMachineIds: string[] }[];
        machines: unknown[];
      }>(queryKey);
      if (previous) {
        queryClient.setQueryData(queryKey, {
          ...previous,
          operators: previous.operators.map((op) =>
            op.id === effectiveOperatorId
              ? { ...op, linkedMachineIds: nextIds }
              : op,
          ),
        });
      }
      return { previous, queryKey };
    },
    onError: (error, _vars, context) => {
      if (context?.previous && context.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previous);
      }
      toastApiError(error);
    },
    onSuccess: () => {
      toast.success('Prioridade atualizada.');
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: [MOVIMENT_OPERATOR_PRIORITY_BOARD_KEY],
      });
    },
  });

  const toggleMachine = (machineId: string) => {
    if (!selectedOperator || saveMut.isPending) return;
    const next = new Set(selectedOperator.linkedMachineIds);
    if (next.has(machineId)) {
      next.delete(machineId);
    } else {
      next.add(machineId);
    }
    saveMut.mutate([...next]);
  };

  const clearAll = () => {
    if (!selectedOperator || saveMut.isPending) return;
    if (selectedOperator.linkedMachineIds.length === 0) return;
    saveMut.mutate([]);
  };

  return {
    apiReady,
    token,
    isAdmin,
    canAccess,
    canFilterBySector: isAdmin,
    sectorScopeLabel: isLeader
      ? (user?.sector?.typeSector ?? null)
      : null,
    leaderMissingSector,
    sectorFilter,
    setSectorFilter,
    sectors: sectorsQuery.data ?? [],
    isSectorsLoading: sectorsQuery.isLoading,
    boardQuery,
    operators: filteredOperators,
    selectedOperator,
    selectedOperatorId: effectiveOperatorId,
    setSelectedOperatorId,
    operatorSearch,
    setOperatorSearch,
    machineSearch,
    setMachineSearch,
    machinesForOperator,
    linkedSet,
    toggleMachine,
    clearAll,
    busy: saveMut.isPending,
  };
}

export type MovimentOperatorPriorityPageViewModel = ReturnType<
  typeof useMovimentOperatorPriorityPage
>;

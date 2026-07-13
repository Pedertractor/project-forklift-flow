import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { fetchSectors } from '@/services/sectors-api';
import { useAuthStore } from '@/store/auth.store';
import { hasAdminPrivileges } from '@/types/role.types';

export function useDashboardSectorFilter() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = hasAdminPrivileges(user?.role);
  const isLeader = user?.role === 'LEADER';
  const [selectedSectorId, setSelectedSectorId] = useState('');

  const leaderSectorId =
    user?.sectorId?.trim() || user?.sector?.id?.trim() || undefined;

  const sectorsQuery = useQuery({
    queryKey: ['sectors', 'dashboard-filter'],
    queryFn: fetchSectors,
    enabled: isAdmin,
  });

  const sectorIdForQuery = useMemo(() => {
    if (isLeader) {
      return leaderSectorId;
    }
    if (isAdmin && selectedSectorId.trim()) {
      return selectedSectorId.trim();
    }
    return undefined;
  }, [isAdmin, isLeader, leaderSectorId, selectedSectorId]);

  const sectorScopeLabel = useMemo(() => {
    if (isLeader) {
      return user?.sector?.typeSector ?? null;
    }
    if (isAdmin && selectedSectorId.trim()) {
      return (
        sectorsQuery.data?.find((sector) => sector.id === selectedSectorId)
          ?.typeSector ?? null
      );
    }
    return null;
  }, [
    isAdmin,
    isLeader,
    selectedSectorId,
    sectorsQuery.data,
    user?.sector?.typeSector,
  ]);

  return {
    /** Só admin/superadmin escolhe setor; líder fica fixo no próprio. */
    canFilterBySector: isAdmin,
    isLeader,
    selectedSectorId,
    setSelectedSectorId,
    sectorIdForQuery,
    sectors: sectorsQuery.data ?? [],
    isSectorsLoading: sectorsQuery.isLoading,
    sectorScopeLabel,
    leaderMissingSector: isLeader && !leaderSectorId,
  };
}

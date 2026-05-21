import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  OPERATOR_MOVIMENT_MY_TASKS_PATH,
  OPERATOR_MOVIMENT_TASKS_QUEUE_LEGACY_PATH,
  OPERATOR_MOVIMENT_TASKS_QUEUE_PATH,
} from '@/constants/operator-moviment-routes';
import { ENV } from '@/constants/env';
import {
  parseOperatorMovimentWsMessage,
  resolveOperatorMovimentWsUrl,
  wsEventMatchesSubscriber,
} from '@/lib/operator-moviment-ws';
import { toast } from '@/lib/toast';
import { fetchOperatorMyMovimentPallet, fetchOperatorMyTasks } from '@/services/operator-moviment-pallet-api';
import { useAuthStore } from '@/store/auth.store';
import {
  MOVIMENT_OPERATOR_ROLES,
  OPERATOR_MACHINE_ROLES,
  type AppRole,
} from '@/types/role.types';
import type { OperatorMovimentWsEvent } from '@/types/operator-moviment-ws.types';
import { countOpenMovimentTasksForPallet } from '@/utils/operator-moviment-work';
import { replenishmentMovimentTypesForRole } from '@/utils/operator-moviment-role';

function isMovimentOperatorRole(role: string | undefined): boolean {
  return (
    role !== undefined &&
    (MOVIMENT_OPERATOR_ROLES as readonly AppRole[]).includes(role as AppRole)
  );
}

function isMachineOperatorRole(role: string | undefined): boolean {
  return (
    role !== undefined &&
    (OPERATOR_MACHINE_ROLES as readonly AppRole[]).includes(role as AppRole)
  );
}

export interface OperatorMovimentWorkContextValue {
  enabled: boolean;
  incompleteTaskCount: number;
  isLoadingTasks: boolean;
  wsConnected: boolean;
  refetchMyTasks: () => Promise<void>;
  invalidateOperatorQueues: () => Promise<void>;
}

const defaultValue: OperatorMovimentWorkContextValue = {
  enabled: false,
  incompleteTaskCount: 0,
  isLoadingTasks: false,
  wsConnected: false,
  refetchMyTasks: async () => {},
  invalidateOperatorQueues: async () => {},
};

const OperatorMovimentWorkContext =
  createContext<OperatorMovimentWorkContextValue>(defaultValue);

export function useOperatorMovimentWork(): OperatorMovimentWorkContextValue {
  return useContext(OperatorMovimentWorkContext);
}

const WS_RECONNECT_MS = 5_000;

export function OperatorMovimentWorkProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const location = useLocation();
  const navigate = useNavigate();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isMovimentOperator = isMovimentOperatorRole(user?.role);
  const isMachineOperator = isMachineOperatorRole(user?.role);
  const realtimeEnabled = Boolean(
    ENV.API_URL && token && (isMovimentOperator || isMachineOperator),
  );
  const allowedMovimentTypes = useMemo(
    () => replenishmentMovimentTypesForRole(user?.role),
    [user?.role],
  );

  const myPalletQuery = useQuery({
    queryKey: ['operator-moviment', 'my-pallet'],
    queryFn: fetchOperatorMyMovimentPallet,
    enabled: realtimeEnabled && isMovimentOperator,
  });

  const myTasksQuery = useQuery({
    queryKey: ['operator-moviment', 'my-tasks'],
    queryFn: fetchOperatorMyTasks,
    enabled:
      realtimeEnabled &&
      isMovimentOperator &&
      myPalletQuery.isSuccess &&
      myPalletQuery.data !== null,
    refetchInterval: realtimeEnabled && isMovimentOperator ? 45_000 : false,
    refetchOnWindowFocus: true,
  });

  const incompleteTaskCount = useMemo(
    () =>
      countOpenMovimentTasksForPallet(
        myTasksQuery.data ?? [],
        myPalletQuery.data?.id,
      ),
    [myTasksQuery.data, myPalletQuery.data?.id],
  );

  const refreshRealtimeData = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['operator-moviment'] }),
      queryClient.invalidateQueries({ queryKey: ['operator-machine'] }),
    ]);
    await queryClient.refetchQueries({ type: 'active' });
  }, [queryClient]);

  const invalidateOperatorQueues = refreshRealtimeData;

  const refetchMyTasks = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['operator-moviment', 'my-tasks'] });
  }, [queryClient]);

  const handleWsEvent = useCallback(
    (event: OperatorMovimentWsEvent) => {
      if (
        !wsEventMatchesSubscriber(event, {
          sectorId: user?.sectorId,
          userId: user?.id,
          allowedMovimentTypes,
          isMovimentOperator,
          isMachineOperator,
        })
      ) {
        return;
      }

      void refreshRealtimeData();

      if (!isMovimentOperator) {
        return;
      }
      if (event.type === 'replenishment_request_created') {
        toast.info('Nova solicitação de reposição disponível para o seu tipo de equipamento.');
      } else if (event.type === 'trip_suggestions_updated') {
        toast.info('Novas sugestões de rota disponíveis na fila.');
      }
    },
    [
      allowedMovimentTypes,
      isMachineOperator,
      isMovimentOperator,
      refreshRealtimeData,
      user?.id,
      user?.sectorId,
    ],
  );

  const [wsConnected, setWsConnected] = useState(false);

  useEffect(() => {
    if (!realtimeEnabled || !token) {
      return;
    }

    const resolvedWsUrl = resolveOperatorMovimentWsUrl(token);
    if (!resolvedWsUrl) {
      return;
    }
    const wsUrl: string = resolvedWsUrl;

    let cancelled = false;

    function scheduleReconnect() {
      if (cancelled || reconnectTimerRef.current) {
        return;
      }
      reconnectTimerRef.current = setTimeout(() => {
        reconnectTimerRef.current = null;
        connect();
      }, WS_RECONNECT_MS);
    }

    function connect() {
      if (cancelled) {
        return;
      }
      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        if (!cancelled) {
          setWsConnected(true);
        }
      };

      socket.onmessage = (messageEvent) => {
        const parsed = parseOperatorMovimentWsMessage(String(messageEvent.data));
        if (parsed) {
          handleWsEvent(parsed);
        }
      };

      socket.onclose = () => {
        setWsConnected(false);
        wsRef.current = null;
        if (!cancelled) {
          scheduleReconnect();
        }
      };

      socket.onerror = () => {
        socket.close();
      };
    }

    connect();

    return () => {
      cancelled = true;
      setWsConnected(false);
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [realtimeEnabled, token, handleWsEvent]);

  useEffect(() => {
    if (!realtimeEnabled || !isMovimentOperator || !myTasksQuery.isSuccess) {
      return;
    }
    if (incompleteTaskCount === 0) {
      return;
    }
    const onTasksQueue =
      location.pathname === OPERATOR_MOVIMENT_TASKS_QUEUE_PATH ||
      location.pathname === OPERATOR_MOVIMENT_TASKS_QUEUE_LEGACY_PATH;
    if (!onTasksQueue) {
      return;
    }
    const fromTaskCompletion = Boolean(
      (location.state as { fromTaskCompletion?: boolean } | null)?.fromTaskCompletion,
    );
    if (fromTaskCompletion) {
      return;
    }
    navigate(OPERATOR_MOVIMENT_MY_TASKS_PATH, { replace: true });
  }, [
    realtimeEnabled,
    isMovimentOperator,
    incompleteTaskCount,
    location.pathname,
    location.state,
    myTasksQuery.isSuccess,
    navigate,
  ]);

  const value = useMemo<OperatorMovimentWorkContextValue>(
    () => ({
      enabled: realtimeEnabled && isMovimentOperator,
      incompleteTaskCount,
      isLoadingTasks: myTasksQuery.isLoading,
      wsConnected,
      refetchMyTasks,
      invalidateOperatorQueues,
    }),
    [
      realtimeEnabled,
      isMovimentOperator,
      incompleteTaskCount,
      invalidateOperatorQueues,
      myTasksQuery.isLoading,
      refetchMyTasks,
      wsConnected,
    ],
  );

  return (
    <OperatorMovimentWorkContext.Provider value={value}>
      {children}
    </OperatorMovimentWorkContext.Provider>
  );
}

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
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
  wsEventMatchesMovimentOperator,
  wsEventMatchesSubscriber,
} from '@/lib/operator-moviment-ws';
import {
  OPERATOR_REPLENISHMENT_QUEUE_QUERY_KEY,
  OPERATOR_TRIP_SUGGESTIONS_QUERY_KEY,
  SUPPLY_PENDING_OPERATOR_REQUESTS_QUERY_KEY,
  SUPPLY_PENDING_PREPARATION_QUERY_KEY,
  SUPPLY_REPLENISHMENT_REQUESTS_QUERY_KEY,
  shouldInvalidateMyMovimentTasks,
  shouldInvalidateReplenishmentQueue,
  shouldInvalidateSupplyReplenishmentPage,
  shouldInvalidateTripSuggestions,
  WS_INVALIDATE_DEBOUNCE_MS,
} from '@/lib/operator-moviment-ws-invalidation';
import { toast } from '@/lib/toast';
import {
  fetchOperatorMyMovimentPallet,
  fetchOperatorMyTasks,
} from '@/services/operator-moviment-pallet-api';
import { fetchOperatorMyMachine } from '@/services/operator-machine-api';
import {
  applyMachineOperatorWsEvent,
  OPERATOR_MACHINE_MY_MACHINE_QUERY_KEY,
  refetchOperatorMachineTasks,
  resolveBoundMachineIdFromCache,
} from '@/lib/operator-machine-realtime-cache';
import { useAuthStore } from '@/store/auth.store';
import {
  MACHINE_DOMAIN_ROLES,
  MOVIMENT_OPERATOR_ROLES,
  OPERATOR_MACHINE_ROLES,
  SUPERVISION_ROLES,
  type AppRole,
} from '@/types/role.types';
import type { OperatorMovimentWsEvent } from '@/types/operator-moviment-ws.types';
import { countOpenMovimentTasksForOperator } from '@/utils/operator-moviment-work';
import { replenishmentMovimentTypesForOperatingMode } from '@/utils/operator-moviment-role';

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

function isSupplyReplenishmentRole(role: string | undefined): boolean {
  return (
    role !== undefined &&
    (MACHINE_DOMAIN_ROLES as readonly AppRole[]).includes(role as AppRole)
  );
}

function isMachineCadastroRole(role: string | undefined): boolean {
  if (!role) {
    return false;
  }
  const r = role as AppRole;
  return (
    (MACHINE_DOMAIN_ROLES as readonly AppRole[]).includes(r) ||
    (SUPERVISION_ROLES as readonly AppRole[]).includes(r)
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

export function OperatorMovimentWorkProvider({
  children,
}: {
  children: ReactNode;
}) {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const location = useLocation();
  const navigate = useNavigate();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tripSuggestionsInvalidateTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const replenishmentQueueInvalidateTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const supplyReplenishmentInvalidateTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const isMovimentOperator = isMovimentOperatorRole(user?.role);
  const isMachineOperator = isMachineOperatorRole(user?.role);
  const isMachineCadastro = isMachineCadastroRole(user?.role);
  const isSupplyReplenishment = isSupplyReplenishmentRole(user?.role);
  const realtimeEnabled = Boolean(
    ENV.API_URL &&
      token &&
      (isMovimentOperator ||
        isMachineOperator ||
        isMachineCadastro ||
        isSupplyReplenishment),
  );
  const allowedMovimentTypes = useMemo(
    () => replenishmentMovimentTypesForOperatingMode(user?.isOperating),
    [user?.isOperating],
  );

  const myPalletQuery = useQuery({
    queryKey: ['operator-moviment', 'my-pallet'],
    queryFn: fetchOperatorMyMovimentPallet,
    enabled: realtimeEnabled && isMovimentOperator,
  });

  const myMachineQuery = useQuery({
    queryKey: [...OPERATOR_MACHINE_MY_MACHINE_QUERY_KEY],
    queryFn: fetchOperatorMyMachine,
    enabled: realtimeEnabled && isMachineOperator,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const myTasksQuery = useQuery({
    queryKey: ['operator-moviment', 'my-tasks'],
    queryFn: fetchOperatorMyTasks,
    enabled:
      realtimeEnabled &&
      isMovimentOperator &&
      Boolean(user?.isOperating ?? myPalletQuery.data),
    refetchInterval: realtimeEnabled && isMovimentOperator ? 45_000 : false,
    refetchOnWindowFocus: true,
  });

  const incompleteTaskCount = useMemo(
    () =>
      countOpenMovimentTasksForOperator(myTasksQuery.data ?? [], user?.id),
    [myTasksQuery.data, user?.id],
  );

  const refreshRealtimeData = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ['operator-moviment'],
      }),
      queryClient.invalidateQueries({
        queryKey: ['operator-machine'],
      }),
      queryClient.invalidateQueries({
        queryKey: ['machines'],
      }),
    ]);
    await queryClient.refetchQueries({ type: 'active' });
  }, [queryClient]);

  const invalidateOperatorQueues = refreshRealtimeData;

  const scheduleDebouncedInvalidate = useCallback(
    (
      timerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>,
      queryKey: readonly unknown[],
    ) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        void queryClient.invalidateQueries({ queryKey });
      }, WS_INVALIDATE_DEBOUNCE_MS);
    },
    [queryClient],
  );

  const invalidateSupplyReplenishmentPage = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: [...SUPPLY_REPLENISHMENT_REQUESTS_QUERY_KEY],
    });
    void queryClient.invalidateQueries({
      queryKey: [...SUPPLY_PENDING_PREPARATION_QUERY_KEY],
    });
    void queryClient.invalidateQueries({
      queryKey: [...SUPPLY_PENDING_OPERATOR_REQUESTS_QUERY_KEY],
    });
    void queryClient.invalidateQueries({
      queryKey: ['sector-transport-operators'],
    });
  }, [queryClient]);

  const scheduleSupplyReplenishmentInvalidate = useCallback(() => {
    if (supplyReplenishmentInvalidateTimerRef.current) {
      clearTimeout(supplyReplenishmentInvalidateTimerRef.current);
    }
    supplyReplenishmentInvalidateTimerRef.current = setTimeout(() => {
      supplyReplenishmentInvalidateTimerRef.current = null;
      invalidateSupplyReplenishmentPage();
    }, WS_INVALIDATE_DEBOUNCE_MS);
  }, [invalidateSupplyReplenishmentPage]);

  const refetchMyTasks = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: ['operator-moviment', 'my-tasks'],
    });
  }, [queryClient]);

  const resolveBoundMachineId = useCallback((): string | null => {
    return (
      myMachineQuery.data?.id ??
      resolveBoundMachineIdFromCache(queryClient)
    );
  }, [myMachineQuery.data?.id, queryClient]);

  const handleWsEvent = useCallback(
    (event: OperatorMovimentWsEvent) => {
      const boundMachineId = resolveBoundMachineId();
      if (
        !wsEventMatchesSubscriber(event, {
          sectorId: user?.sectorId,
          userId: user?.id,
          boundMachineId,
          operatorSectorId: user?.sectorId,
          allowedMovimentTypes,
          isMovimentOperator,
          isMachineOperator,
          isMachineCadastro,
          isSupplyReplenishment,
        })
      ) {
        return;
      }

      if (
        isSupplyReplenishment &&
        shouldInvalidateSupplyReplenishmentPage(event)
      ) {
        scheduleSupplyReplenishmentInvalidate();
        if (event.type === 'operator_supply_request_created') {
          toast.message('Nova solicitação de reposição', {
            description:
              'A dobra solicitou montagem de pallet.',
          });
        }
      }

      const movimentSectorMatch =
        isMovimentOperator &&
        wsEventMatchesMovimentOperator(
          event,
          user?.sectorId,
          allowedMovimentTypes,
        );

      if (movimentSectorMatch) {
        if (shouldInvalidateTripSuggestions(event)) {
          scheduleDebouncedInvalidate(
            tripSuggestionsInvalidateTimerRef,
            OPERATOR_TRIP_SUGGESTIONS_QUERY_KEY,
          );
        }
        if (shouldInvalidateReplenishmentQueue(event)) {
          scheduleDebouncedInvalidate(
            replenishmentQueueInvalidateTimerRef,
            OPERATOR_REPLENISHMENT_QUEUE_QUERY_KEY,
          );
        }
        if (shouldInvalidateMyMovimentTasks(event)) {
          void queryClient.invalidateQueries({
            queryKey: ['operator-moviment', 'my-tasks'],
          });
          void queryClient.invalidateQueries({
            queryKey: ['operator-moviment', 'my-pallet'],
          });
          void queryClient.refetchQueries({
            queryKey: ['operator-moviment', 'my-tasks'],
            type: 'active',
          });
        }
      } else if (isMachineOperator) {
        if (
          (event.type === 'pickup_task_updated' ||
            event.type === 'delivery_task_updated') &&
          'taskId' in event &&
          'status' in event
        ) {
          const patched = applyMachineOperatorWsEvent(queryClient, event);
          if (!patched) {
            refetchOperatorMachineTasks(queryClient);
          }
        } else if (event.type === 'machine_operator_updated') {
          void queryClient.invalidateQueries({ queryKey: ['operator-machine'] });
          refetchOperatorMachineTasks(queryClient);
        }
      } else if (isMachineCadastro) {
        void refreshRealtimeData();
      }

      if (
        event.type === 'machine_operator_updated' &&
        isMachineOperator &&
        'affectedUserId' in event &&
        event.affectedUserId === user?.id &&
        event.operatorUserId === null
      ) {
        toast.message('Vínculo com a máquina encerrado', {
          description:
            'Um gestor desvinculou você desta máquina. Selecione outra máquina para continuar.',
        });
      }
    },
    [
      allowedMovimentTypes,
      isMachineCadastro,
      isMachineOperator,
      isMovimentOperator,
      isSupplyReplenishment,
      queryClient,
      refreshRealtimeData,
      scheduleDebouncedInvalidate,
      scheduleSupplyReplenishmentInvalidate,
      resolveBoundMachineId,
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
        const parsed = parseOperatorMovimentWsMessage(
          String(messageEvent.data),
        );
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
      if (tripSuggestionsInvalidateTimerRef.current) {
        clearTimeout(tripSuggestionsInvalidateTimerRef.current);
        tripSuggestionsInvalidateTimerRef.current = null;
      }
      if (replenishmentQueueInvalidateTimerRef.current) {
        clearTimeout(replenishmentQueueInvalidateTimerRef.current);
        replenishmentQueueInvalidateTimerRef.current = null;
      }
      if (supplyReplenishmentInvalidateTimerRef.current) {
        clearTimeout(supplyReplenishmentInvalidateTimerRef.current);
        supplyReplenishmentInvalidateTimerRef.current = null;
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
      (location.state as { fromTaskCompletion?: boolean } | null)
        ?.fromTaskCompletion,
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
      enabled:
        realtimeEnabled && (isMovimentOperator || isMachineOperator),
      incompleteTaskCount,
      isLoadingTasks: myTasksQuery.isLoading,
      wsConnected,
      refetchMyTasks,
      invalidateOperatorQueues,
    }),
    [
      realtimeEnabled,
      isMovimentOperator,
      isMachineOperator,
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

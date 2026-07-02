import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AccordionLoader from '@/components/accordionLoader/accordion-loader';
import { SimpleModal } from '@/components/crud/SimpleModal';
import { OperatorAssistedTrajectoryView } from '@/components/operator-moviment/operator-assisted-trajectory-view';
import { Button } from '@/components/ui/brand-button';
import {
  parseOperatorMovimentWsMessage,
  resolveOperatorMovimentWsUrl,
} from '@/lib/operator-moviment-ws';
import { getOperatorCurrentTrajectory } from '@/services/operational-dashboard-api';
import { useAuthStore } from '@/store/auth.store';
import type { OperatorMovimentTaskItem } from '@/types/operator-moviment-pallet.types';
import { captalizeString } from '@/utils/captalizeString';

const WS_RECONNECT_MS = 5_000;

/** Eventos que indicam mudança de status de uma tarefa (ex.: conclusão da atividade). */
const TASK_UPDATE_EVENT_TYPES = new Set([
  'delivery_task_updated',
  'pickup_task_updated',
]);

function trajectoryQueryKey(operatorId: string) {
  return ['operator-current-trajectory', operatorId] as const;
}

/**
 * Enquanto o diálogo está aberto, escuta o WebSocket e refaz a query do trajeto
 * quando uma tarefa em exibição muda de status. Ao encerrar a atividade, a tarefa
 * some da lista e o cronômetro para automaticamente.
 */
function useOperatorTrajectoryRealtime(open: boolean, operatorId: string | null) {
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (!open || !operatorId || !token) {
      return;
    }
    const wsUrl = resolveOperatorMovimentWsUrl(token);
    if (!wsUrl) {
      return;
    }

    const queryKey = trajectoryQueryKey(operatorId);
    let cancelled = false;
    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const handleMessage = (raw: string) => {
      const event = parseOperatorMovimentWsMessage(raw);
      if (!event || !TASK_UPDATE_EVENT_TYPES.has(event.type)) {
        return;
      }
      const taskId = 'taskId' in event ? event.taskId : undefined;
      if (taskId) {
        const current =
          queryClient.getQueryData<OperatorMovimentTaskItem[]>(queryKey);
        // Só refaz se o evento afeta uma tarefa atualmente no trajeto deste operador.
        const affectsCurrent = current?.some((t) => t.id === taskId);
        if (current && !affectsCurrent) {
          return;
        }
      }
      void queryClient.invalidateQueries({ queryKey });
    };

    function connect() {
      if (cancelled) {
        return;
      }
      const ws = new WebSocket(wsUrl as string);
      socket = ws;
      ws.onmessage = (messageEvent) => handleMessage(String(messageEvent.data));
      ws.onclose = () => {
        socket = null;
        if (!cancelled && !reconnectTimer) {
          reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            connect();
          }, WS_RECONNECT_MS);
        }
      };
      ws.onerror = () => ws.close();
    }

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      socket?.close();
      socket = null;
    };
  }, [open, operatorId, token, queryClient]);
}

export interface OperatorCurrentTrajectoryDialogProps {
  open: boolean;
  operatorId: string | null;
  operatorName: string;
  onClose: () => void;
}

export function OperatorCurrentTrajectoryDialog({
  open,
  operatorId,
  operatorName,
  onClose,
}: OperatorCurrentTrajectoryDialogProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: trajectoryQueryKey(operatorId ?? ''),
    queryFn: () => getOperatorCurrentTrajectory(operatorId!),
    enabled: open && Boolean(operatorId),
    staleTime: 0,
  });

  useOperatorTrajectoryRealtime(open, operatorId);

  return (
    <SimpleModal
      open={open}
      title="Trajeto atual"
      description={`Modo assistido — atividades em aberto de ${captalizeString(operatorName)}.`}
      onClose={onClose}
      showHeaderClose
      panelClassName="max-w-2xl"
      footer={
        <div className="flex justify-end">
          <Button type="button" variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      }
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <AccordionLoader />
        </div>
      ) : null}

      {isError ? (
        <p className="m-0 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          Não foi possível carregar o trajeto deste operador. Tente novamente.
        </p>
      ) : null}

      {!isLoading && !isError && operatorId && data ? (
        <OperatorAssistedTrajectoryView
          tasks={data}
          operatorUserId={operatorId}
        />
      ) : null}
    </SimpleModal>
  );
}

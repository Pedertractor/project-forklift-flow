import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { OPERATOR_TRIP_SUGGESTIONS_QUERY_KEY } from '@/lib/operator-moviment-ws-invalidation';
import {
  startOperatorMovimentTaskAlertSound,
  stopOperatorMovimentTaskAlertSound,
  unlockOperatorMovimentTaskAlertSound,
} from '@/lib/operator-moviment-task-alert-sound';
import { emitOperatorMovimentNewTaskArrival } from '@/lib/operator-moviment-new-task-arrival';
import { fetchOperatorTripSuggestions } from '@/services/operator-moviment-pallet-api';
import type { TripSuggestionsResponse } from '@/types/operator-moviment-pallet.types';

/** Identificadores estáveis das sugestões/tarefas abertas na fila principal. */
export function collectTripSuggestionAlertKeys(
  data: TripSuggestionsResponse | undefined,
): Set<string> {
  const keys = new Set<string>();
  if (!data) {
    return keys;
  }
  for (const row of data.suggestions) {
    keys.add(`trip:${row.tripSuggestion.id}`);
  }
  for (const row of data.standalonePickupTasks) {
    keys.add(`pickup:${row.pickupTask.id}`);
  }
  for (const row of data.standaloneDeliverTasks) {
    const id = row.deliverTask?.id ?? row.requestId;
    keys.add(`deliver:${id}`);
  }
  return keys;
}

/**
 * Alerta sonoro (1 toque) quando entra tarefa nova na fila do
 * empilhadeirista / follow-up. Para ao aceitar ou quando a fila esvazia.
 */
export function useOperatorMovimentNewTaskAlert(options: {
  enabled: boolean;
  /** Operador já tem equipamento e pode aceitar. */
  canAcceptTasks: boolean;
  /** Já aceitou trabalho — para o som na hora. */
  hasAcceptedWork: boolean;
}) {
  const { enabled, canAcceptTasks, hasAcceptedWork } = options;
  const knownKeysRef = useRef<Set<string> | null>(null);

  const tripSuggestionsQuery = useQuery({
    queryKey: [...OPERATOR_TRIP_SUGGESTIONS_QUERY_KEY],
    queryFn: fetchOperatorTripSuggestions,
    enabled: enabled && canAcceptTasks,
    staleTime: 0,
  });

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const unlock = () => unlockOperatorMovimentTaskAlertSound();
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !canAcceptTasks) {
      knownKeysRef.current = null;
      stopOperatorMovimentTaskAlertSound();
      return;
    }

    if (hasAcceptedWork) {
      // Ao voltar livre, refaz baseline sem alertar o que já estava na fila.
      knownKeysRef.current = null;
      stopOperatorMovimentTaskAlertSound();
      return;
    }

    if (!tripSuggestionsQuery.isSuccess) {
      return;
    }

    const nextKeys = collectTripSuggestionAlertKeys(tripSuggestionsQuery.data);

    if (knownKeysRef.current === null) {
      // Baseline: não alerta para o que já estava na fila ao abrir a sessão.
      knownKeysRef.current = nextKeys;
      return;
    }

    let hasNew = false;
    for (const key of nextKeys) {
      if (!knownKeysRef.current.has(key)) {
        hasNew = true;
        break;
      }
    }
    knownKeysRef.current = nextKeys;

    if (nextKeys.size === 0) {
      stopOperatorMovimentTaskAlertSound();
      return;
    }

    if (hasNew) {
      startOperatorMovimentTaskAlertSound();
      emitOperatorMovimentNewTaskArrival();
    }
  }, [
    enabled,
    canAcceptTasks,
    hasAcceptedWork,
    tripSuggestionsQuery.isSuccess,
    tripSuggestionsQuery.data,
  ]);

  useEffect(() => {
    return () => {
      stopOperatorMovimentTaskAlertSound();
    };
  }, []);
}

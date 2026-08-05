type NewTaskArrivalListener = () => void;

const listeners = new Set<NewTaskArrivalListener>();

/** Disparado quando entra atividade nova na fila (junto com o som). */
export function emitOperatorMovimentNewTaskArrival(): void {
  for (const listener of listeners) {
    listener();
  }
}

/** UI do card de sugestão escuta para animar a chegada. */
export function subscribeOperatorMovimentNewTaskArrival(
  listener: NewTaskArrivalListener,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Prioridade da fila do empilhadeirista:
 * 1. Máquina vinculada ao operador
 * 2. Criticidade
 * 3. Afinidade com a última tarefa concluída (alternância carga)
 * 4. Mais antiga
 *
 * Após retirada → prefere entrega+retirada ou entrega.
 * Após entrega (abastecimento) → prefere entrega+retirada ou retirada.
 * Se não houver o tipo preferido, mostra o que existir.
 */

export type TripQueueDisplayKind = "combined" | "deliver" | "pickup";

/** Última tarefa concluída pelo operador de movimentação. */
export type LastCompletedTripTaskKind = "DELIVER" | "PICKUP";

export type TripQueuePriorityKeys = {
  preferredMachine: boolean;
  effectiveCritical: boolean;
  kindRank: number;
  sortAt: number;
};

/** Menor rank = mais recomendado para o próximo aceite. */
export function tripQueueKindAffinityRank(
  kind: TripQueueDisplayKind,
  lastCompleted: LastCompletedTripTaskKind | null,
): number {
  if (lastCompleted === "PICKUP") {
    if (kind === "combined") return 0;
    if (kind === "deliver") return 1;
    return 2;
  }
  if (lastCompleted === "DELIVER") {
    if (kind === "combined") return 0;
    if (kind === "pickup") return 1;
    return 2;
  }
  if (kind === "combined") return 0;
  return 1;
}

export function compareTripQueuePriority(
  a: TripQueuePriorityKeys,
  b: TripQueuePriorityKeys,
): number {
  if (a.preferredMachine !== b.preferredMachine) {
    return a.preferredMachine ? -1 : 1;
  }
  if (a.effectiveCritical !== b.effectiveCritical) {
    return a.effectiveCritical ? -1 : 1;
  }
  if (a.kindRank !== b.kindRank) {
    return a.kindRank - b.kindRank;
  }
  return a.sortAt - b.sortAt;
}

export function resolveLastCompletedTripTaskKind(
  latestDeliverCompletedAt: Date | null | undefined,
  latestPickupCompletedAt: Date | null | undefined,
): LastCompletedTripTaskKind | null {
  const deliverAt = latestDeliverCompletedAt?.getTime() ?? null;
  const pickupAt = latestPickupCompletedAt?.getTime() ?? null;
  if (deliverAt == null && pickupAt == null) return null;
  if (deliverAt == null) return "PICKUP";
  if (pickupAt == null) return "DELIVER";
  return pickupAt >= deliverAt ? "PICKUP" : "DELIVER";
}

const OPERATOR_MACHINE_CHANGE_TTL_MS = 15_000;

const recentOperatorMachineChanges = new Map<string, number>();

/** Alteração de vínculo iniciada pelo operador (bind/unbind). Suprime toast do WebSocket. */
export function markOperatorMachineInitiatedChange(userId: string) {
  recentOperatorMachineChanges.set(userId, Date.now());
}

export function hasRecentOperatorMachineInitiatedChange(
  userId: string,
): boolean {
  const markedAt = recentOperatorMachineChanges.get(userId);
  if (markedAt == null) {
    return false;
  }
  if (Date.now() - markedAt > OPERATOR_MACHINE_CHANGE_TTL_MS) {
    recentOperatorMachineChanges.delete(userId);
    return false;
  }
  return true;
}

/** Alinhado ao back-end `OPERATOR_AWAITING_SUPPLY_CUBE_MARKER`. */
export const OPERATOR_MACHINE_PENDING_CUBE_CODE = 'PENDENTE_ABASTECIMENTO' as const;

export function formatReplenishmentMovementCubeDisplay(cube: string): string {
  return cube.trim() === OPERATOR_MACHINE_PENDING_CUBE_CODE
    ? 'A definir (abastecimento)'
    : cube;
}

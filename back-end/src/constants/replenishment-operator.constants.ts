/** Cubo placeholder até o abastecimento informar o código real (operador de dobra não informa cubo). */
export const OPERATOR_AWAITING_SUPPLY_CUBE_MARKER = "PENDENTE_ABASTECIMENTO";

export function isPendingSupplyCubeMarker(movementCube: string): boolean {
  return movementCube.trim() === OPERATOR_AWAITING_SUPPLY_CUBE_MARKER;
}

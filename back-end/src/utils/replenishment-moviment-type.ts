import { TypeMovimentPallet } from "../generated/prisma/enums.js";

/** Equipamento físico (nunca ANY). */
export type EquipmentMovimentType =
  | typeof TypeMovimentPallet.FORKLIFT
  | typeof TypeMovimentPallet.PALLET_TRUCK;

export function assertEquipmentMovimentType(
  type: TypeMovimentPallet,
): EquipmentMovimentType {
  if (type === TypeMovimentPallet.ANY) {
    throw new Error("Equipamento com tipo de movimentacao invalido (ANY).");
  }
  return type;
}

export function requestTypeMatchesEquipment(
  requestType: TypeMovimentPallet,
  equipmentType: EquipmentMovimentType,
): boolean {
  return (
    requestType === TypeMovimentPallet.ANY || requestType === equipmentType
  );
}

export function openPoolTypesForEquipment(
  equipmentType: EquipmentMovimentType,
): TypeMovimentPallet[] {
  return [equipmentType, TypeMovimentPallet.ANY];
}

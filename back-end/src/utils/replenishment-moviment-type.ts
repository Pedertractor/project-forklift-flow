import {
  MovimentPalletEquipmentType,
  TypeMovimentPallet,
} from "../generated/prisma/enums.js";

export type EquipmentMovimentType = MovimentPalletEquipmentType;

export function assertEquipmentMovimentType(
  type: MovimentPalletEquipmentType,
): EquipmentMovimentType {
  return type;
}

export function requestTypeMatchesEquipment(
  requestType: TypeMovimentPallet,
  equipmentType: EquipmentMovimentType,
): boolean {
  if (requestType === TypeMovimentPallet.ANY) {
    return true;
  }
  return (
    requestType === TypeMovimentPallet.FORKLIFT &&
    equipmentType === MovimentPalletEquipmentType.FORKLIFT
  );
}

/** Tipos de solicitação que o equipamento pode aceitar na fila aberta. */
export function openPoolTypesForEquipment(
  equipmentType: EquipmentMovimentType,
): TypeMovimentPallet[] {
  if (equipmentType === MovimentPalletEquipmentType.FORKLIFT) {
    return [TypeMovimentPallet.FORKLIFT, TypeMovimentPallet.ANY];
  }
  return [TypeMovimentPallet.ANY];
}

/** Ao vincular equipamento ao pedido, restringe o tipo da solicitação (só empilhadeira estreita). */
export function requestTypeAfterEquipmentClaim(
  equipmentType: EquipmentMovimentType,
): { typeMovimentPallet?: TypeMovimentPallet } {
  if (equipmentType === MovimentPalletEquipmentType.FORKLIFT) {
    return { typeMovimentPallet: TypeMovimentPallet.FORKLIFT };
  }
  return {};
}

import { IsOperating, TypeMovimentPallet } from '../generated/prisma/enums.js'

export type OperatingMode = IsOperating

export function assertOperatingMode(mode: IsOperating): OperatingMode {
  return mode
}

export function requestTypeMatchesOperatingMode(
  requestType: TypeMovimentPallet,
  mode: IsOperating,
): boolean {
  if (requestType === TypeMovimentPallet.ANY) {
    return true
  }
  return (
    requestType === TypeMovimentPallet.FORKLIFT &&
    mode === IsOperating.FORKLIFT
  )
}

export function openPoolTypesForOperatingMode(
  mode: IsOperating,
): TypeMovimentPallet[] {
  if (mode === IsOperating.FORKLIFT) {
    return [TypeMovimentPallet.FORKLIFT, TypeMovimentPallet.ANY]
  }
  return [TypeMovimentPallet.ANY]
}

export function requestTypeAfterOperatingModeClaim(
  mode: IsOperating,
): { typeMovimentPallet?: TypeMovimentPallet } {
  if (mode === IsOperating.FORKLIFT) {
    return { typeMovimentPallet: TypeMovimentPallet.FORKLIFT }
  }
  return {}
}

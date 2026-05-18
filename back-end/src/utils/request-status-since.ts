import type { Prisma } from '../generated/prisma/client.js'
import type { RequestStatus } from '../generated/prisma/enums.js'

/** Atualiza status e reinicia o relogio de tempo no estado atual. */
export function requestStatusPatch(
  status: RequestStatus,
  at: Date = new Date(),
): Pick<
  Prisma.MachineReplenishmentRequestUpdateInput,
  'status' | 'statusSince'
> {
  return { status, statusSince: at }
}

/** Campos de create quando o pedido nasce ja em um status. */
export function requestStatusOnCreate(
  status: RequestStatus,
  at: Date = new Date(),
): Pick<
  Prisma.MachineReplenishmentRequestCreateInput,
  'status' | 'statusSince'
> {
  return { status, statusSince: at }
}

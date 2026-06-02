import type { Prisma } from '../generated/prisma/client.js'
import type { MachineTaskStatus } from '../generated/prisma/enums.js'

/** Atualiza status da tarefa e reinicia o relógio de tempo no estado atual. */
export function machineTaskStatusPatch(
  status: MachineTaskStatus,
  at: Date = new Date(),
): Pick<Prisma.DeliveryTaskUpdateInput, 'status' | 'statusSince'> {
  return { status, statusSince: at }
}

/** Campos de create quando a tarefa nasce já em um status explícito. */
export function machineTaskStatusOnCreate(
  status: MachineTaskStatus,
  at: Date = new Date(),
): Pick<Prisma.DeliveryTaskCreateInput, 'status' | 'statusSince'> {
  return { status, statusSince: at }
}

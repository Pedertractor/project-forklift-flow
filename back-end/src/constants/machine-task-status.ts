import { MachineTaskStatus } from '../generated/prisma/enums.js'

/** Tarefas ainda nao finalizadas no equipamento (bloqueiam novo aceite na fila). */
export const incompleteAssignedMachineTaskStatuses: MachineTaskStatus[] = [
  MachineTaskStatus.CREATED,
  MachineTaskStatus.ASSIGNED,
  MachineTaskStatus.IN_PROGRESS,
]

export const openMachineTaskStatuses: MachineTaskStatus[] = [
  MachineTaskStatus.CREATED,
  MachineTaskStatus.ASSIGNED,
  MachineTaskStatus.IN_PROGRESS,
]

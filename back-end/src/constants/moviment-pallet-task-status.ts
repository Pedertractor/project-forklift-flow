import { ForkliftTaskStatus } from '../generated/prisma/enums.js'

/** Tarefas ainda nao finalizadas no equipamento (bloqueiam novo aceite na fila). */
export const incompleteAssignedMovimentTaskStatuses: ForkliftTaskStatus[] = [
  ForkliftTaskStatus.CREATED,
  ForkliftTaskStatus.ASSIGNED,
  ForkliftTaskStatus.IN_PROGRESS,
]

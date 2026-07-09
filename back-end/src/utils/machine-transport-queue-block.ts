import { MachineProductionStatus } from '../generated/prisma/enums.js'
import { deliveryTaskRepository } from '../repositories/delivery-task.repository.js'
import { machineRepository } from '../repositories/machine.repository.js'

/**
 * Máquina em TRABALHANDO com pallet pronto no recebimento não entra na fila
 * do empilhadeirista / follow-up até o abastecedor marcar ABASTECER.
 */
export async function isMachineDeliveryBlockedFromTransportQueue(
  machine: { id: string; productionStatus: MachineProductionStatus },
): Promise<boolean> {
  if (machine.productionStatus !== MachineProductionStatus.TRABALHANDO) {
    return false
  }
  const prepared = await deliveryTaskRepository.findOpenPreparedForMachine(machine.id)
  return prepared != null
}

/** IDs de máquinas do setor cuja entrega preparada está bloqueada para transporte. */
export async function findBlockedMachineIdsForTransportInSector(
  sectorId: string,
): Promise<Set<string>> {
  const machineIds =
    await machineRepository.findManyTrabalhandoIdsInSector(sectorId)
  if (machineIds.length === 0) {
    return new Set()
  }
  const blockedIds =
    await deliveryTaskRepository.findMachineIdsWithOpenPreparedDelivery(
      machineIds,
    )
  return new Set(blockedIds)
}

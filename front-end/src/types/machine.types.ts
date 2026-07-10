/** Resposta de GET /type-machines e GET /type-machines/:id */
export interface TypeMachine {
  id: string
  name: string
  urlImage: string
  createdAt: string
  updatedAt: string
}

import type { PlantMapUnit } from '@/constants/plant-map'

export type MachineProductionStatus = 'TRABALHANDO' | 'ABASTECER'

/** Rua opcional vinculada à máquina (mapa do chão de fábrica). */
export interface MachineStreetBrief {
  id: string
  name: string
  machineStreetColor: string
  sectorId?: string
}

/** Item de GET /machine-streets */
export interface MachineStreetListItem extends MachineStreetBrief {
  sectorId: string
  createdAt: string
  updatedAt: string
  sector?: { id: string; typeSector: string }
  /** Quantidade de máquinas vinculadas (impede exclusão se > 0). */
  references?: number
}

/** Item de GET /machines */
export interface MachineListItem {
  id: string
  name: string
  plantUnit: PlantMapUnit
  typeMachineId: string
  sectorId: string
  userId: string | null
  machineStreetId: string | null
  productionStatus: MachineProductionStatus
  assetNumber: string | null
  pillar: string | null
  createdAt: string
  updatedAt: string
  typeMachine: { id: string; name: string; urlImage: string }
  sector: { id: string; typeSector: string }
  user: { id: string; name: string; card: string } | null
  machineStreet: MachineStreetBrief | null
  /** Quantidade de registros vinculados (tarefas/sugestões) que impedem a exclusão. */
  references?: number
}

/** Corpo JSON de POST /machines (operador e rua opcionais). */
export interface CreateMachinePostBody {
  name: string
  plantUnit: PlantMapUnit
  typeMachineId: string
  sectorId: string
  assetNumber: string
  pillar: string
  userId?: string
  machineStreetId?: string | null
}

/** GET /machines/:id (detalhe) */
export interface MachineDetail extends MachineListItem {
  sector: { id: string; typeSector: string; sectorIdAPI?: number }
  user: {
    id: string
    name: string
    card: string
    unit: string
  } | null
}

export interface SectorListItem {
  id: string
  /** Pode existir conforme migração / API legada. */
  sectorIdAPI?: number
  typeSector: string
  createdAt?: string
  updatedAt?: string
  /** Quantidade de registros vinculados (máquinas/usuários/centros de custo) que impedem a exclusão. */
  references?: number
}

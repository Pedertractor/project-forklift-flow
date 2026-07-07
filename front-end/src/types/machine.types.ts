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

/** Item de GET /machines */
export interface MachineListItem {
  id: string
  name: string
  plantUnit: PlantMapUnit
  typeMachineId: string
  sectorId: string
  userId: string | null
  productionStatus: MachineProductionStatus
  createdAt: string
  updatedAt: string
  typeMachine: { id: string; name: string; urlImage: string }
  sector: { id: string; typeSector: string }
  user: { id: string; name: string; card: string } | null
  /** Quantidade de registros vinculados (tarefas/sugestões) que impedem a exclusão. */
  references?: number
}

/** Corpo JSON de POST /machines (operador opcional). */
export interface CreateMachinePostBody {
  name: string
  plantUnit: PlantMapUnit
  typeMachineId: string
  sectorId: string
  userId?: string
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

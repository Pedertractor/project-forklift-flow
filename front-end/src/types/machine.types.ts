/** Resposta de GET /type-machines e GET /type-machines/:id */
export interface TypeMachine {
  id: string
  name: string
  urlImage: string
  createdAt: string
  updatedAt: string
}

/** Item de GET /machines */
export interface MachineListItem {
  id: string
  name: string
  position: string
  typeMachineId: string
  sectorId: string
  userId: string | null
  createdAt: string
  updatedAt: string
  typeMachine: { id: string; name: string; urlImage: string }
  sector: { id: string; typeSector: string }
}

/** GET /machines/:id (detalhe) */
export interface MachineDetail extends MachineListItem {
  sector: { id: string; typeSector: string; sectorIdAPI: number }
  user: {
    id: string
    name: string
    card: string
    unit: string
  } | null
}

export interface SectorListItem {
  id: string
  sectorIdAPI: number
  typeSector: string
}

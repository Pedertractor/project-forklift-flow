export type MovimentPalletEquipmentType = 'FORKLIFT' | 'PALLET_TRUCK';

export interface MovimentPalletListItem {
  id: string;
  code: string;
  type: MovimentPalletEquipmentType;
  operatorId: string | null;
  sectorId: string | null;
  createdAt: string;
  updatedAt: string;
  operator: {
    id: string;
    name: string;
    card: string;
    unit: string;
    role: string;
  } | null;
  sector: { id: string; typeSector: string } | null;
  _count: { movimentPalletTasks: number };
  /** Tarefas CREATED/ASSIGNED/IN_PROGRESS no equipamento (quando solicitado na API). */
  incompleteAssignedTaskCount?: number;
}

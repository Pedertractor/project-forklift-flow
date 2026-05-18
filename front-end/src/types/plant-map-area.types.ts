export type PlantMapUnitValue = 'PEDERTRACTOR' | 'TRACTOR';

export type PlantMapAreaKindValue = 'EXPEDITION' | 'RECEIVING';

export interface PlantMapAreaRect {
  nx: number;
  ny: number;
  nw: number;
  nh: number;
}

export interface PlantMapArea {
  id: string;
  plantUnit: PlantMapUnitValue;
  kind: PlantMapAreaKindValue;
  nx: number;
  ny: number;
  nw: number;
  nh: number;
  label: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertPlantMapAreaBody {
  plantUnit: PlantMapUnitValue;
  kind: PlantMapAreaKindValue;
  nx: number;
  ny: number;
  nw: number;
  nh: number;
  label?: string | null;
}

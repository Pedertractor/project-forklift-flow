/** Unidade operacional (valores alinhados ao fluxo tipo Rivet / backend). */
export type AppUnit = 'pedertractor' | 'tractor';

export interface UserSectorSummary {
  id: string;
  typeSector: string;
}

export interface User {
  id: string;
  name: string;
  cardNumber: string;
  unit: AppUnit;
  /** Preenchido quando o login vem da API (`RoleUser` no backend). */
  role?: string;
  sectorId?: string | null;
  sector?: UserSectorSummary | null;
}

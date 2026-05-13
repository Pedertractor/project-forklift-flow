/** Unidade operacional (valores alinhados ao fluxo tipo Rivet / backend). */
export type AppUnit = 'pedertractor' | 'tractor';

export interface User {
  id: string;
  name: string;
  cardNumber: string;
  unit: AppUnit;
  /** Preenchido quando o login vem da API (`RoleUser` no backend). */
  role?: string;
}

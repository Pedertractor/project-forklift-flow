/** Item de `GET /api/users` (lista administrativa). */
export interface UserListRow {
  id: string;
  name: string;
  role: string;
  card: string;
  unit: string;
  employeeId: number;
  isLogged: boolean;
  sectorId: string | null;
  sector: {
    id: string;
    typeSector: string;
    createdAt: string;
    updatedAt: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

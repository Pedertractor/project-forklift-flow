/** Resposta de `GET /api/users/employee-info` (API externa de colaborador). */
export interface EmployeeInfoResponse {
  id: number;
  name: string;
  cardNumber: string;
  unit: string;
}

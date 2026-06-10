import { OPERATOR_MOVIMENT_EQUIPMENT_PATH } from '@/constants/operator-moviment-routes';
import { ADMIN_OR_LEADER_ROLES, type AppRole } from '@/types/role.types';

const OPERATIONAL_DASHBOARD_PATH = '/dashboard';

/**
 * Rota inicial após login / troca de senha, quando não há deep-link.
 */
export function defaultHomePathForRole(role: string | undefined): string {
  if (role && ADMIN_OR_LEADER_ROLES.includes(role as AppRole)) {
    return OPERATIONAL_DASHBOARD_PATH;
  }
  if (role === 'SUPPLY_OPERATOR') {
    return '/abastecimento/preparo-pendente';
  }
  if (role === 'OPERATOR_MACHINE') {
    return '/dobra/operacao';
  }
  if (role === 'PALLET_TRANSPORTER') {
    return OPERATOR_MOVIMENT_EQUIPMENT_PATH;
  }
  return '/nao-autorizado';
}

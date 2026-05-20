import { OPERATOR_MOVIMENT_TASKS_QUEUE_PATH } from '@/constants/operator-moviment-routes';
import { ADMIN_OR_LEADER_ROLES, type AppRole } from '@/types/role.types';

/**
 * Rota inicial após login / troca de senha, quando não há deep-link.
 * Início (`/`) e Painel (`/dashboard`) são só para ADMIN e LEADER.
 */
export function defaultHomePathForRole(role: string | undefined): string {
  if (role && ADMIN_OR_LEADER_ROLES.includes(role as AppRole)) {
    return '/';
  }
  if (role === 'SUPPLY_OPERATOR') {
    return '/abastecimento/preparo-pendente';
  }
  if (role === 'OPERATOR_MACHINE') {
    return '/dobra/operacao';
  }
  if (role === 'FORKLIFT_OPERATOR' || role === 'FOLLOW_UP_OPERATOR') {
    return OPERATOR_MOVIMENT_TASKS_QUEUE_PATH;
  }
  return '/nao-autorizado';
}

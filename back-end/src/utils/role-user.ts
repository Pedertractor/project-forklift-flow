import { RoleUser } from '../generated/prisma/enums.js'
import { CreateUserError } from '../errors/domain-errors.js'

export function isSuperAdmin(role: RoleUser): boolean {
  return role === RoleUser.SUPERADMIN
}

export function isAdminOrSuperAdmin(role: RoleUser): boolean {
  return role === RoleUser.ADMIN || role === RoleUser.SUPERADMIN
}

export function assertActorCanAssignRole(
  actorRole: RoleUser,
  targetRole: RoleUser,
): void {
  if (isSuperAdmin(actorRole)) {
    return
  }
  if (targetRole === RoleUser.SUPERADMIN) {
    throw new CreateUserError('Sem permissao para atribuir perfil SUPERADMIN.')
  }
}

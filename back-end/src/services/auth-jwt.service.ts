import type { AppJwtPayload } from '../types/auth.types.js'
import { userRepository } from '../repositories/user.repository.js'

/** Alinha o payload JWT com o perfil atual no banco (role pode ter mudado após o login). */
export async function resolveAuthenticatedUser(
  jwtUser: AppJwtPayload,
): Promise<AppJwtPayload | null> {
  if (typeof jwtUser.sub !== 'string' || jwtUser.sub.length === 0) {
    return null
  }

  const dbUser = await userRepository.findUniqueById(jwtUser.sub)
  if (!dbUser) {
    return null
  }

  return {
    sub: dbUser.id,
    role: dbUser.role,
    firstAccess: !dbUser.isLogged,
  }
}

import { RoleUser } from '../generated/prisma/enums.js'
import { userRepository } from '../repositories/user.repository.js'
import type { AppJwtPayload } from '../types/auth.types.js'
import { isAdminOrSuperAdmin } from '../utils/role-user.js'

export async function resolveOperationalDashboardSectorId(
  actor: AppJwtPayload,
  requestedSectorId?: string,
): Promise<string | null> {
  if (actor.role === RoleUser.LEADER) {
    const leader = await userRepository.findUniqueByIdWithSector(actor.sub)
    return leader?.sectorId ?? null
  }

  if (isAdminOrSuperAdmin(actor.role)) {
    if (typeof requestedSectorId === 'string' && requestedSectorId.trim() !== '') {
      return requestedSectorId.trim()
    }
    return null
  }

  return null
}

function buildMachineScopeFilter(options: {
  machineId?: string | null
  sectorId?: string | null
}) {
  const machineId =
    typeof options.machineId === 'string' && options.machineId.trim() !== ''
      ? options.machineId.trim()
      : null
  const sectorId =
    typeof options.sectorId === 'string' && options.sectorId.trim() !== ''
      ? options.sectorId.trim()
      : null

  if (machineId && sectorId) {
    return { machineId, machine: { sectorId } }
  }
  if (machineId) {
    return { machineId }
  }
  if (sectorId) {
    return { machine: { sectorId } }
  }
  return {}
}

export { buildMachineScopeFilter }

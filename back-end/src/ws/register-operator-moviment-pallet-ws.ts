import type { FastifyInstance, FastifyRequest } from 'fastify'
import { IsOperating, RoleUser } from '../generated/prisma/enums.js'
import { machineRepository } from '../repositories/machine.repository.js'
import { userRepository } from '../repositories/user.repository.js'
import type { AppJwtPayload } from '../types/auth.types.js'
import { isAdminOrSuperAdmin } from '../utils/role-user.js'
import { openPoolTypesForOperatingMode } from '../utils/replenishment-moviment-type.js'
import { operatorMovimentPalletWsRegisterClient } from './operator-moviment-pallet-ws.hub.js'

const MOVIMENT_WS_ROLES: readonly RoleUser[] = [
  RoleUser.PALLET_TRANSPORTER,
  RoleUser.OPERATOR_MACHINE,
  RoleUser.ADMIN,
  RoleUser.SUPERADMIN,
  RoleUser.LEADER,
  RoleUser.SUPPLY_OPERATOR,
]

const WS_PATH = '/ws/operator-moviment-pallet'

function allowedTypesForClient(user: {
  role: RoleUser
  isOperating: IsOperating | null
}) {
  // Só PALLET_TRANSPORTER opera filas de movimentação (ADMIN/LEADER não).
  if (
    user.role === RoleUser.PALLET_TRANSPORTER &&
    (user.isOperating === IsOperating.FORKLIFT ||
      user.isOperating === IsOperating.PALLET_TRUCK)
  ) {
    return openPoolTypesForOperatingMode(user.isOperating)
  }
  return []
}

/**
 * WebSocket para operadores de movimentação (mesmo path que o front em `operator-moviment-ws.ts`).
 * Autenticação: query `token` (JWT). Operadores de movimentação/dobra, cadastro de máquinas e supervisão.
 */
export function registerOperatorMovimentPalletWebSocket(app: FastifyInstance): void {
  app.get(
    WS_PATH,
    { websocket: true },
    async (socket /* WebSocket */, req: FastifyRequest) => {
      const q = req.query as { token?: string }
      const token = typeof q.token === 'string' ? q.token.trim() : ''
      if (!token) {
        socket.close()
        return
      }

      let payload: AppJwtPayload
      try {
        payload = app.jwt.verify<AppJwtPayload>(token) as AppJwtPayload
      } catch {
        socket.close()
        return
      }

      try {
        const user = await userRepository.findProfileById(payload.sub)
        if (!user || !MOVIMENT_WS_ROLES.includes(user.role)) {
          socket.close()
          return
        }

        const boundMachine =
          user.role === RoleUser.OPERATOR_MACHINE || isAdminOrSuperAdmin(user.role)
            ? await machineRepository.findFirstByOperatorUserId(user.id)
            : null

        operatorMovimentPalletWsRegisterClient(socket, {
          userId: user.id,
          role: user.role,
          sectorId: user.sectorId ?? null,
          boundMachineId: boundMachine?.id ?? null,
          allowedTypes: allowedTypesForClient(user),
        })
      } catch {
        socket.close()
      }
    },
  )
}

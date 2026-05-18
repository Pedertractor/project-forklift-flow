import type { FastifyInstance, FastifyRequest } from 'fastify'
import { RoleUser } from '../generated/prisma/enums.js'
import type { AppJwtPayload } from '../types/auth.types.js'
import { operatorMovimentPalletWsRegisterClient } from './operator-moviment-pallet-ws.hub.js'

const MOVIMENT_WS_ROLES: readonly RoleUser[] = [
  RoleUser.FORKLIFT_OPERATOR,
  RoleUser.FOLLOW_UP_OPERATOR,
  RoleUser.ADMIN,
]

const WS_PATH = '/ws/operator-moviment-pallet'

/**
 * WebSocket para operadores de movimentação (mesmo path que o front em `operator-moviment-ws.ts`).
 * Autenticação: query `token` (JWT). Roles: FORKLIFT_OPERATOR, FOLLOW_UP_OPERATOR, ADMIN.
 */
export function registerOperatorMovimentPalletWebSocket(app: FastifyInstance): void {
  app.get(
    WS_PATH,
    { websocket: true },
    (socket /* WebSocket */, req: FastifyRequest) => {
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

      if (!MOVIMENT_WS_ROLES.includes(payload.role)) {
        socket.close()
        return
      }

      operatorMovimentPalletWsRegisterClient(socket)
    },
  )
}

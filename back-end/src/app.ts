import './types/auth.types.js'
import multipart from '@fastify/multipart'
import cors from '@fastify/cors'
import fastifyStatic from '@fastify/static'
import websocket from '@fastify/websocket'
import Fastify from 'fastify'
import { UPLOAD_ROOT_ABSOLUTE } from './constants/upload-paths.js'
import { defaultErrorHandler } from './https/errors/index.js'
import { registerJwtAuth } from './plugins/jwt-auth.js'
import { registerRoutes } from './routes/main.js'
import { registerOperatorMovimentPalletWebSocket } from './ws/register-operator-moviment-pallet-ws.js'

export const app = Fastify({
  logger: true,
})

app.setErrorHandler(defaultErrorHandler)

app.addHook('onSend', async (_request, reply) => {
  const contentType = reply.getHeader('content-type')
  if (
    typeof contentType === 'string' &&
    contentType.includes('application/json') &&
    !contentType.toLowerCase().includes('charset')
  ) {
    reply.header('content-type', 'application/json; charset=utf-8')
  }
})

await app.register(cors, {
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
})

await app.register(multipart, {
  limits: { fileSize: 5 * 1024 * 1024 },
  throwFileSizeLimit: true,
})

await app.register(fastifyStatic, {
  root: UPLOAD_ROOT_ABSOLUTE,
  prefix: '/uploads/',
  decorateReply: false,
})

await registerJwtAuth(app)
await app.register(websocket)
registerOperatorMovimentPalletWebSocket(app)
await app.register(registerRoutes, { prefix: '/api' })

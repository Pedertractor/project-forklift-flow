import './types/auth.types.js'
import cors from '@fastify/cors'
import Fastify from 'fastify'
import { defaultErrorHandler } from './https/errors/index.js'
import { registerJwtAuth } from './plugins/jwt-auth.js'
import { registerRoutes } from './routes/main.js'

export const app = Fastify({
  logger: true,
})

app.setErrorHandler(defaultErrorHandler)

await app.register(cors, {
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
})

await registerJwtAuth(app)
await app.register(registerRoutes, { prefix: '/api' })

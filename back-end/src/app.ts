import './types/auth.types.js'
import multipart from '@fastify/multipart'
import cors from '@fastify/cors'
import fastifyStatic from '@fastify/static'
import Fastify from 'fastify'
import { UPLOAD_ROOT_ABSOLUTE } from './constants/upload-paths.js'
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
await app.register(registerRoutes, { prefix: '/api' })

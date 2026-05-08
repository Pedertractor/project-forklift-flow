import type { FastifyInstance } from 'fastify';

export async function mainRoute(app: FastifyInstance) {
  app.get('/health', async () => {
    return { ok: true, service: 'forklift-back-end' };
  });
}

import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { config } from './config';
import { wsHandler } from './websocket/handler';

export async function buildApp() {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: config.corsOrigin });
  await app.register(websocket);

  // Health check
  app.get('/api/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  // WebSocket endpoint — registered directly, not inside a plugin
  app.get('/ws/session/:sessionId', { websocket: true }, wsHandler);

  return app;
}

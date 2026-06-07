import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { config } from './config';
import { wsHandler } from './websocket/handler';
import { registerUser, loginUser, getUserById } from './services/auth';
import { authMiddleware } from './middleware/auth';
import {
  createSession,
  getSession,
  listSessions,
  endSession,
  getUserProgress,
  getSessionOwner,
} from './services/sessionStore';
import { getScenarioById } from '@tutor/shared/scenarios';

export async function buildApp() {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: config.corsOrigin });
  await app.register(websocket);

  // Health check
  app.get('/api/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  // Auth routes
  app.post('/api/auth/register', async (req, reply) => {
    const { email, password, name } = req.body as { email?: string; password?: string; name?: string };
    if (!email || !password) {
      return reply.status(400).send({ error: 'Missing email or password' });
    }
    if (password.length < 6) {
      return reply.status(400).send({ error: 'Password must be at least 6 characters' });
    }
    try {
      const result = await registerUser(email, password, name);
      return reply.status(201).send(result);
    } catch (err) {
      if (err instanceof Error && err.message === 'EMAIL_EXISTS') {
        return reply.status(409).send({ error: 'Email already registered' });
      }
      throw err;
    }
  });

  app.post('/api/auth/login', async (req, reply) => {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) {
      return reply.status(400).send({ error: 'Missing email or password' });
    }
    try {
      const result = await loginUser(email, password);
      return reply.send(result);
    } catch (err) {
      if (err instanceof Error && err.message === 'INVALID_CREDENTIALS') {
        return reply.status(401).send({ error: 'Invalid email or password' });
      }
      throw err;
    }
  });

  app.get('/api/auth/me', { preHandler: [authMiddleware] }, async (req, reply) => {
    const user = await getUserById(req.userId!);
    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }
    return reply.send({ user });
  });

  // Session routes (protected)
  app.post('/api/sessions', { preHandler: [authMiddleware] }, async (req, reply) => {
    const { scenarioId } = req.body as { scenarioId?: string };
    if (!scenarioId) {
      return reply.status(400).send({ error: 'Missing scenarioId' });
    }
    const scenario = getScenarioById(scenarioId);
    if (!scenario) {
      return reply.status(404).send({ error: 'Scenario not found' });
    }
    const session = await createSession(req.userId!, scenarioId, scenario.title);
    return reply.status(201).send({ id: session.id, scenario });
  });

  app.get('/api/sessions', { preHandler: [authMiddleware] }, async (req) => {
    const { limit, offset } = req.query as { limit?: string; offset?: string };
    return listSessions(
      req.userId!,
      limit ? parseInt(limit, 10) : 20,
      offset ? parseInt(offset, 10) : 0,
    );
  });

  app.get('/api/sessions/:id', { preHandler: [authMiddleware] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const ownerId = await getSessionOwner(id);
    if (!ownerId) {
      return reply.status(404).send({ error: 'Session not found' });
    }
    if (ownerId !== req.userId) {
      return reply.status(403).send({ error: 'Forbidden' });
    }
    const data = await getSession(id);
    return reply.send(data);
  });

  app.patch('/api/sessions/:id', { preHandler: [authMiddleware] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const ownerId = await getSessionOwner(id);
    if (!ownerId) {
      return reply.status(404).send({ error: 'Session not found' });
    }
    if (ownerId !== req.userId) {
      return reply.status(403).send({ error: 'Forbidden' });
    }
    const { status } = req.body as { status?: string };
    if (status === 'completed' || status === 'abandoned') {
      await endSession(id);
    }
    return reply.send({ ok: true });
  });

  // Progress routes (protected)
  app.get('/api/user/progress', { preHandler: [authMiddleware] }, async (req) => {
    return getUserProgress(req.userId!);
  });

  // WebSocket endpoint — registered directly, not inside a plugin
  app.get('/ws/session/:sessionId', { websocket: true }, wsHandler);

  return app;
}

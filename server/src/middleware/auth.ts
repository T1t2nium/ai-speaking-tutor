import type { FastifyRequest, FastifyReply } from 'fastify';
import { verifyToken } from '../services/auth';

declare module 'fastify' {
  interface FastifyRequest {
    userId?: string;
  }
}

export async function authMiddleware(req: FastifyRequest, reply: FastifyReply) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'unauthorized', message: 'Missing or invalid token' });
  }

  const token = header.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    return reply.status(401).send({ error: 'unauthorized', message: 'Invalid or expired token' });
  }

  req.userId = payload.sub;
}

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import { db } from '../db/connection';
import { users } from '../db/schema';
import { config } from '../config';
import { logger } from '../utils/logger';

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, config.jwtSecret, { expiresIn: '7d' });
}

export function verifyToken(token: string): { sub: string } | null {
  try {
    const payload = jwt.verify(token, config.jwtSecret) as { sub: string };
    return payload;
  } catch {
    return null;
  }
}

export async function registerUser(
  email: string,
  password: string,
  name?: string,
): Promise<{ user: { id: string; email: string; name: string | null }; token: string }> {
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing.length > 0) {
    throw new Error('EMAIL_EXISTS');
  }

  const passwordHash = await hashPassword(password);
  const [row] = await db.insert(users).values({
    email,
    passwordHash,
    name: name || null,
  }).returning({ id: users.id, email: users.email, name: users.name });

  return { user: { id: row.id, email: row.email, name: row.name }, token: signToken(row.id) };
}

export async function loginUser(
  email: string,
  password: string,
): Promise<{ user: { id: string; email: string; name: string | null }; token: string }> {
  const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (rows.length === 0) {
    throw new Error('INVALID_CREDENTIALS');
  }

  const user = rows[0];
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    throw new Error('INVALID_CREDENTIALS');
  }

  return { user: { id: user.id, email: user.email, name: user.name }, token: signToken(user.id) };
}

export async function getUserById(id: string) {
  const rows = await db
    .select({ id: users.id, email: users.email, name: users.name })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  return rows[0] || null;
}

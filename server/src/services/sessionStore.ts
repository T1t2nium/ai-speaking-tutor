import { eq, desc, sql, and } from 'drizzle-orm';
import { db } from '../db/connection';
import { sessions, messages, evaluations } from '../db/schema';
import { logger } from '../utils/logger';
import type { PronunciationError, Correction, VocabularyItem } from '@tutor/shared';

export async function createSession(userId: string, scenarioId: string, scenarioTitle: string) {
  const [row] = await db.insert(sessions).values({
    userId,
    scenarioId,
    scenarioTitle,
    status: 'active',
    startedAt: new Date(),
  }).returning();
  return row;
}

export async function endSession(
  sessionId: string,
  opts: { durationSeconds?: number; turnCount?: number; userWordCount?: number } = {},
) {
  await db.update(sessions).set({
    status: 'completed',
    endedAt: new Date(),
    durationSeconds: opts.durationSeconds,
    turnCount: opts.turnCount,
    userWordCount: opts.userWordCount,
  }).where(eq(sessions.id, sessionId));
}

export async function addMessage(
  sessionId: string,
  role: 'user' | 'ai',
  content: string,
  turnNumber: number,
  sttConfidence?: number,
) {
  try {
    await db.insert(messages).values({
      sessionId,
      role,
      content,
      turnNumber,
      sttConfidence,
    });
  } catch (err) {
    logger.error('Failed to persist message:', err);
  }
}

export async function saveEvaluation(
  sessionId: string,
  data: {
    overallScore: number;
    fluencyScore: number;
    pronunciationScore: number;
    grammarAccuracy: number;
    vocabularyRichness: number;
    pronunciationErrors: PronunciationError[];
    grammarCorrections: Correction[];
    vocabularyUsed: VocabularyItem[];
    summary: string;
    recommendations: string[];
  },
) {
  try {
    await db.insert(evaluations).values({
      sessionId,
      overallScore: data.overallScore,
      fluencyScore: data.fluencyScore,
      pronunciationScore: data.pronunciationScore,
      grammarAccuracy: data.grammarAccuracy,
      vocabularyRichness: data.vocabularyRichness,
      pronunciationErrors: data.pronunciationErrors as unknown as any[],
      grammarCorrections: data.grammarCorrections as unknown as any[],
      vocabularyUsed: data.vocabularyUsed as unknown as any[],
      summary: data.summary,
      recommendations: data.recommendations as unknown as any[],
    });
  } catch (err) {
    logger.error('Failed to persist evaluation:', err);
  }
}

export async function getSession(sessionId: string) {
  const [session] = await db.select().from(sessions).where(eq(sessions.id, sessionId));
  if (!session) return null;

  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.sessionId, sessionId))
    .orderBy(messages.turnNumber, messages.createdAt);

  const [evaluation] = await db
    .select()
    .from(evaluations)
    .where(eq(evaluations.sessionId, sessionId));

  return { session, messages: msgs, evaluation: evaluation || null };
}

export async function listSessions(userId: string, limit = 20, offset = 0) {
  const data = await db
    .select({
      id: sessions.id,
      scenarioTitle: sessions.scenarioTitle,
      status: sessions.status,
      startedAt: sessions.startedAt,
      endedAt: sessions.endedAt,
      turnCount: sessions.turnCount,
      durationSeconds: sessions.durationSeconds,
      overallScore: evaluations.overallScore,
    })
    .from(sessions)
    .leftJoin(evaluations, eq(sessions.id, evaluations.sessionId))
    .where(eq(sessions.userId, userId))
    .orderBy(desc(sessions.startedAt))
    .limit(limit)
    .offset(offset);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(sessions)
    .where(eq(sessions.userId, userId));

  return { sessions: data, total: count };
}

export async function getUserProgress(userId: string) {
  const [{ count: sessionsCompleted }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(sessions)
    .where(and(eq(sessions.userId, userId), eq(sessions.status, 'completed')));

  const [{ totalMinutes }] = await db
    .select({
      totalMinutes: sql<number>`coalesce(sum(${sessions.durationSeconds}) / 60, 0)::int`,
    })
    .from(sessions)
    .where(eq(sessions.userId, userId));

  const scenariosData = await db
    .select({
      scenarioId: sessions.scenarioId,
      scenarioTitle: sessions.scenarioTitle,
      count: sql<number>`count(*)::int`,
      avgScore: sql<number>`coalesce(avg(${evaluations.overallScore}), 0)::float`,
    })
    .from(sessions)
    .leftJoin(evaluations, eq(sessions.id, evaluations.sessionId))
    .where(eq(sessions.userId, userId))
    .groupBy(sessions.scenarioId, sessions.scenarioTitle);

  return {
    sessionsCompleted,
    totalPracticeMinutes: totalMinutes || 0,
    scenariosPracticed: scenariosData.map((s) => ({
      slug: s.scenarioId,
      title: s.scenarioTitle,
      count: s.count,
      avgScore: s.avgScore,
    })),
    scoreTrend: [] as { date: string; overall: number }[],
    skillsBreakdown: {
      fluency: { current: 0, trend: '' },
      pronunciation: { current: 0, trend: '' },
      grammar: { current: 0, trend: '' },
      vocabulary: { current: 0, trend: '' },
    },
    weakAreas: [] as string[],
  };
}

export async function getSessionScenario(sessionId: string): Promise<{ scenarioId: string; scenarioTitle: string } | null> {
  const [row] = await db
    .select({ scenarioId: sessions.scenarioId, scenarioTitle: sessions.scenarioTitle })
    .from(sessions)
    .where(eq(sessions.id, sessionId));
  return row || null;
}

export async function getSessionOwner(sessionId: string): Promise<string | null> {
  const [row] = await db
    .select({ userId: sessions.userId })
    .from(sessions)
    .where(eq(sessions.id, sessionId));
  return row?.userId || null;
}

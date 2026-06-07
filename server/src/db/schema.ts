import {
  pgTable,
  uuid,
  text,
  integer,
  jsonb,
  timestamp,
  real,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const sessions = pgTable('sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  scenarioId: text('scenario_id').notNull(),
  scenarioTitle: text('scenario_title').notNull(),
  status: text('status').default('active').notNull(), // 'active' | 'completed' | 'abandoned'
  startedAt: timestamp('started_at').defaultNow().notNull(),
  endedAt: timestamp('ended_at'),
  durationSeconds: integer('duration_seconds'),
  turnCount: integer('turn_count').default(0).notNull(),
  userWordCount: integer('user_word_count').default(0).notNull(),
});

export const messages = pgTable('messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionId: uuid('session_id').references(() => sessions.id).notNull(),
  role: text('role').notNull(), // 'user' | 'ai'
  content: text('content').notNull(),
  turnNumber: integer('turn_number').notNull(),
  sttConfidence: real('stt_confidence'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const evaluations = pgTable('evaluations', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionId: uuid('session_id').references(() => sessions.id).notNull().unique(),
  overallScore: integer('overall_score').default(0).notNull(),
  fluencyScore: integer('fluency_score').default(0).notNull(),
  pronunciationScore: integer('pronunciation_score').default(0).notNull(),
  grammarAccuracy: integer('grammar_accuracy').default(0).notNull(),
  vocabularyRichness: integer('vocabulary_richness').default(0).notNull(),
  pronunciationErrors: jsonb('pronunciation_errors').default('[]').notNull(),
  grammarCorrections: jsonb('grammar_corrections').default('[]').notNull(),
  vocabularyUsed: jsonb('vocabulary_used').default('[]').notNull(),
  summary: text('summary').default('').notNull(),
  recommendations: jsonb('recommendations').default('[]').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

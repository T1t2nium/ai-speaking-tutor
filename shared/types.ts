// ============================================================
// Shared type definitions for the AI Speaking Tutor
// Used by both frontend and server
// ============================================================

// --- Enums & Literals ---

export type Difficulty = 'easy' | 'medium' | 'hard';
export type EnglishLevel = 'beginner' | 'intermediate' | 'advanced';
export type SessionStatus = 'active' | 'completed' | 'abandoned';
export type MessageRole = 'user' | 'ai' | 'system';
export type CorrectionType = 'grammar' | 'vocabulary' | 'expression' | 'pronunciation';
export type PronunciationErrorType = 'substitution' | 'deletion' | 'insertion' | 'distortion';

// --- Scenarios ---

export interface Scenario {
  id: string;
  slug: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  systemPrompt: string;
  voiceId?: string;
  scenarioHint: string;
  icon: string;
  durationMin: number;
  tags: string[];
}

// --- Sessions ---

export interface Session {
  id: string;
  userId: string;
  scenarioId: string;
  status: SessionStatus;
  startedAt: string;
  endedAt?: string;
  durationSeconds?: number;
  turnCount: number;
  userWordCount: number;
  uniqueWordsUsed: number;
}

export interface SessionListItem {
  id: string;
  scenarioTitle: string;
  status: SessionStatus;
  startedAt: string;
  endedAt?: string;
  overallScore?: number;
  turnCount: number;
  durationSeconds: number;
}

// --- Messages ---

export interface Message {
  id: string;
  sessionId: string;
  role: MessageRole;
  content: string;
  turnNumber: number;
  audioUrl?: string;
  sttConfidence?: number;
  durationMs?: number;
  createdAt: string;
}

// --- Evaluation ---

export interface Evaluation {
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
}

export interface PronunciationError {
  word: string;
  expectedPhonemes: string;
  errorType: PronunciationErrorType;
  severity: number;
  wordScore: number;
  suggestion: string;
}

export interface Correction {
  id: string;
  original: string;
  corrected: string;
  correctionType: CorrectionType;
  category: string;
  explanation: string;
}

// --- Vocabulary ---

export interface VocabularyItem {
  word: string;
  definition: string;
  context: string;
  timesUsed: number;
  isMastered: boolean;
}

// --- Progress ---

export interface UserProgress {
  sessionsCompleted: number;
  totalPracticeMinutes: number;
  scoreTrend: { date: string; overall: number }[];
  scenariosPracticed: { slug: string; title: string; count: number; avgScore: number }[];
  skillsBreakdown: {
    fluency: { current: number; trend: string };
    pronunciation: { current: number; trend: string };
    grammar: { current: number; trend: string };
    vocabulary: { current: number; trend: string };
  };
  weakAreas: string[];
}

// --- WebSocket Protocol ---

export type WsClientMessage =
  | { type: 'audio_chunk'; seq: number }
  | { type: 'audio_end' }
  | { type: 'interrupt' }
  | { type: 'config'; vadThreshold: number; silenceDurationMs: number }
  | { type: 'end_session' }
  | { type: 'ping' };

export type WsServerMessage =
  | { type: 'connected'; sessionId: string; scenario: Scenario }
  | { type: 'interim_transcript'; text: string; confidence: number }
  | { type: 'final_transcript'; text: string; confidence: number }
  | { type: 'ai_response_start'; text: string }
  | { type: 'ai_audio_chunk'; seq: number }
  | { type: 'ai_response_end' }
  | { type: 'correction'; id: string; original: string; corrected: string; correctionType: CorrectionType; category: string; explanation: string }
  | { type: 'evaluation_partial'; fluency: number; pronunciation: number; grammar: number; vocabulary: number }
  | { type: 'error'; code: string; message: string }
  | { type: 'fatal_error'; code: string; message: string }
  | { type: 'pong' }
  | { type: 'reconnect'; delayMs: number };

// --- Conversation State ---

export type ConversationPhase = 'idle' | 'listening' | 'processing' | 'speaking' | 'evaluating';

export interface ConversationTurn {
  role: MessageRole;
  content: string;
  corrections?: Correction[];
  pronunciationErrors?: PronunciationError[];
}

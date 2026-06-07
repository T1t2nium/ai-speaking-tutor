import crypto from 'crypto';
import { config } from '../config';
import { logger } from '../utils/logger';
import type { Correction, ConversationTurn, VocabularyItem } from '@tutor/shared';

const DEEPSEEK_API = 'https://api.deepseek.com/v1/chat/completions';

const GRAMMAR_SYSTEM_PROMPT = `You are an English grammar tutor. Find grammar, vocabulary, and expression errors in the sentence.

Return ONLY a JSON array. Each element must have these exact keys:
"original" (exact wrong text), "corrected" (correct version), "correctionType" ("grammar"/"vocabulary"/"expression"), "category" ("tense"/"subject-verb agreement"/"article usage"/"word choice"/"preposition"/"word order"/"pluralization"/"pronoun"/"collocation"/"register"), "explanation" (short help text).

If no errors, return [].
Use standard JSON double quotes for all keys and string values.`;

const EVALUATION_SYSTEM_PROMPT = `You are an English proficiency evaluator. Analyze the conversation and provide scores and feedback.

Return a JSON object with these fields:
- "overallScore": number 0-100
- "fluencyScore": number 0-100
- "pronunciationScore": number 0-100
- "grammarAccuracy": number 0-100
- "vocabularyRichness": number 0-100
- "vocabularyUsed": array of {"word": string, "definition": string, "context": string, "timesUsed": number}
- "summary": string (2-3 sentences summarizing the learner's performance)
- "recommendations": array of strings (2-4 actionable improvement suggestions)`;

/**
 * Non-streaming chat for structured JSON responses.
 * Avoids SSE parsing issues that can cause 0-char responses.
 */
async function chatJson(
  messages: Array<{ role: string; content: string }>,
  maxTokens: number,
  signal?: AbortSignal,
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  if (signal) {
    if (signal.aborted) { clearTimeout(timeout); throw new Error('Aborted'); }
    signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  try {
    const response = await fetch(DEEPSEEK_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.deepseek.apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages,
        stream: false,
        temperature: 0.3,
        max_tokens: maxTokens,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errText = await response.text();
      logger.error(`Grammar DeepSeek HTTP ${response.status}: ${errText.slice(0, 200)}`);
      throw new Error(`DeepSeek API error: ${response.status} ${errText}`);
    }

    const data = await response.json() as Record<string, unknown>;
    const rawChoices = data as { choices?: Array<{ message?: { content?: string }; finish_reason?: string }> };
    const content = rawChoices.choices?.[0]?.message?.content;
    if (!content) {
      logger.warn(`DeepSeek empty — finish=${rawChoices.choices?.[0]?.finish_reason}`);
      return '';
    }
    return content;
  } finally {
    clearTimeout(timeout);
  }
}

export async function analyzeGrammar(
  transcript: string,
  scenarioTitle: string,
  signal?: AbortSignal,
): Promise<Correction[]> {
  if (!transcript || transcript.trim().length < 3) return [];

  logger.info(`Grammar analysis started: "${transcript.slice(0, 60)}"`);

  const messages = [
    { role: 'system', content: GRAMMAR_SYSTEM_PROMPT },
    { role: 'user', content: `Sentence: "${transcript}"\nContext: ${scenarioTitle || 'General conversation'}` },
  ];

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const raw = await chatJson(messages, 512, signal);
      const trimmed = raw.trim();
      if (!trimmed) {
        if (attempt < 2) {
          logger.warn(`Grammar analysis empty, retrying (attempt ${attempt + 1}/2)`);
          await new Promise((r) => setTimeout(r, 2000));
          continue;
        }
        logger.warn('Grammar analysis failed after 3 attempts');
        return [];
      }

      logger.info(`Grammar DeepSeek response: ${trimmed.length} chars`);
      const json = extractJsonArray(trimmed);
      const parsed = JSON.parse(json);

      if (!Array.isArray(parsed)) {
        logger.warn(`Grammar analysis: result is not an array (type: ${typeof parsed})`);
        return [];
      }

      const corrections = parsed
        .map((c: Record<string, unknown>) => ({
          id: crypto.randomUUID(),
          original: String(c.original ?? ''),
          corrected: String(c.corrected ?? ''),
          correctionType: validateCorrectionType(c.correctionType),
          category: String(c.category ?? 'general'),
          explanation: String(c.explanation ?? ''),
        }))
        .filter((c) => c.original && c.corrected && c.original !== c.corrected);

      logger.info(`Grammar analysis: ${corrections.length} corrections found`);
      return corrections;
    } catch (err) {
      if (attempt === 0 && !signal?.aborted) {
        logger.warn('Grammar analysis failed, retrying:', err);
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }
      logger.warn('Grammar analysis failed (non-blocking):', err);
      return [];
    }
  }

  return [];
}

function extractJsonArray(text: string): string {
  let cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');

  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');
  if (start === -1 || end === -1 || end <= start) {
    return cleaned;
  }

  let json = cleaned.slice(start, end + 1);

  try {
    JSON.parse(json);
    return json;
  } catch {
    const fixes: Array<(j: string) => string> = [
      // 1. Convert single-quoted JSON — only quoted keys and values, skip apostrophes in words
      (j) => {
        // Quoted keys: 'key': → "key":
        let r = j.replace(/'([a-zA-Z_]\w*)'(\s*:)/g, '"$1"$2');
        // Quoted values: : 'value text' → : "value text" (only at start of value, before comma/brace)
        r = r.replace(/(:\s*)'([^']*)'(\s*[,}\]])/g, '$1"$2"$3');
        return r;
      },
      // 2. Remove trailing commas before } or ]
      (j) => j.replace(/,(\s*[}\]])/g, '$1'),
      // 3. Add quotes to unquoted property names
      (j) => j.replace(/([{,]\s*)([a-zA-Z_]\w*)(\s*:)/g, '$1"$2"$3'),
      // 4. Fix missing commas between adjacent strings
      (j) => j.replace(/"(\s+)"/g, '",$1"'),
      // 5. Escape unescaped quotes inside string values
      (j) => j.replace(/: *"([^"]*?)"([^,}\]])/g,
        (_m, val, next) => `: "${val.replace(/"/g, '\\"')}"${next}`),
      // 6. Close unterminated string at end of JSON
      (j) => {
        const quotes = j.match(/"/g);
        if (quotes && quotes.length % 2 !== 0) return j + '"';
        if (j.endsWith('\\')) return j.slice(0, -1) + '"';
        return j;
      },
    ];

    for (const fix of fixes) {
      json = fix(json);
      try {
        JSON.parse(json);
        return json;
      } catch {
        // continue to next fix (cumulative)
      }
    }

    logger.warn(`extractJsonArray failed after ${fixes.length} fixes`);
    logger.warn(`  raw start: ${json.slice(0, 300)}`);
    logger.warn(`  raw end:   ...${json.slice(-150)}`);
    return json;
  }
}

function extractJsonObject(text: string): string {
  let cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');

  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    return cleaned;
  }

  let json = cleaned.slice(start, end + 1);

  try {
    JSON.parse(json);
    return json;
  } catch {
    const fixes: Array<(j: string) => string> = [
      (j) => j.replace(/,(\s*[}\]])/g, '$1'),
      (j) => j.replace(/([{,]\s*)([a-zA-Z_]\w*)(\s*:)/g, '$1"$2"$3'),
      (j) => j.replace(/"(\s+)"/g, '",$1"'),
      (j) => j.replace(/: *"([^"]*?)"([^,}\]])/g,
        (_m, val, next) => `: "${val.replace(/"/g, '\\"')}"${next}`),
      (j) => {
        const quotes = j.match(/"/g);
        if (quotes && quotes.length % 2 !== 0) return j + '"';
        return j;
      },
    ];

    for (const fix of fixes) {
      json = fix(json);
      try {
        JSON.parse(json);
        return json;
      } catch {
        // continue
      }
    }

    logger.warn(`extractJsonObject failed after ${fixes.length} fixes`);
    logger.warn(`  raw start: ${json.slice(0, 300)}`);
    logger.warn(`  raw end:   ...${json.slice(-200)}`);
    return json;
  }
}

function validateCorrectionType(
  val: unknown,
): 'grammar' | 'vocabulary' | 'expression' | 'pronunciation' {
  if (
    val === 'grammar' ||
    val === 'vocabulary' ||
    val === 'expression' ||
    val === 'pronunciation'
  ) {
    return val;
  }
  return 'grammar';
}

export async function generateEvaluation(
  turns: ConversationTurn[],
  sessionGrammarCorrections: Correction[],
  signal?: AbortSignal,
): Promise<{
  overallScore: number;
  fluencyScore: number;
  pronunciationScore: number;
  grammarAccuracy: number;
  vocabularyRichness: number;
  vocabularyUsed: VocabularyItem[];
  summary: string;
  recommendations: string[];
}> {
  const userTurns = turns.filter((t) => t.role === 'user');
  if (userTurns.length === 0) {
    return {
      overallScore: 0,
      fluencyScore: 0,
      pronunciationScore: 0,
      grammarAccuracy: 0,
      vocabularyRichness: 0,
      vocabularyUsed: [],
      summary: '',
      recommendations: [],
    };
  }

  const conversationText = turns
    .map((t) => `${t.role === 'user' ? 'User' : 'AI'}: ${t.content}`)
    .join('\n');

  const grammarContext =
    sessionGrammarCorrections.length > 0
      ? `\nGrammar corrections already identified: ${JSON.stringify(sessionGrammarCorrections.map((c) => ({ original: c.original, corrected: c.corrected, category: c.category })))}`
      : '';

  const messages = [
    { role: 'system' as const, content: EVALUATION_SYSTEM_PROMPT },
    {
      role: 'user' as const,
      content: `Conversation:\n${conversationText}${grammarContext}\n\nEvaluate this conversation. Return ONLY the JSON object.`,
    },
  ];

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const raw = await chatJson(messages, 2048, signal);
      const trimmed = raw.trim();
      if (!trimmed) {
        if (attempt < 2) {
          logger.warn(`Evaluation empty, retry ${attempt + 1}/2`);
          await new Promise((r) => setTimeout(r, 1500));
          continue;
        }
        logger.error('Evaluation generation returned empty after retries');
        throw new Error('Empty response');
      }
      const json = extractJsonObject(trimmed);
      const parsed = JSON.parse(json);

      return {
        overallScore: clampScore(parsed.overallScore),
        fluencyScore: clampScore(parsed.fluencyScore),
        pronunciationScore: clampScore(parsed.pronunciationScore),
        grammarAccuracy: clampScore(parsed.grammarAccuracy),
        vocabularyRichness: clampScore(parsed.vocabularyRichness),
        vocabularyUsed: Array.isArray(parsed.vocabularyUsed) ? parsed.vocabularyUsed : [],
        summary: typeof parsed.summary === 'string' ? parsed.summary : '',
        recommendations: Array.isArray(parsed.recommendations)
          ? parsed.recommendations.filter((r: unknown) => typeof r === 'string')
          : [],
      };
    } catch (err) {
      if (attempt < 2 && !signal?.aborted) {
        logger.warn(`Evaluation failed, retry ${attempt + 1}/2:`, err);
        await new Promise((r) => setTimeout(r, 1500));
        continue;
      }
      logger.error('Evaluation generation failed:', err);
    }
  }

  // All retries exhausted
  return {
    overallScore: 0,
    fluencyScore: 0,
    pronunciationScore: 0,
    grammarAccuracy: 0,
    vocabularyRichness: 0,
    vocabularyUsed: [],
    summary: 'Evaluation could not be generated. Please try again.',
    recommendations: ['Practice with another session to get a full evaluation.'],
  };
}

function clampScore(val: unknown): number {
  const n = Number(val);
  if (isNaN(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

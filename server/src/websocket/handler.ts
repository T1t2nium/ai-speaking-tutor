import type { FastifyRequest } from 'fastify';
import type { WebSocket as WsType } from 'ws';
import type { WsClientMessage, Correction, PronunciationError, ConversationTurn } from '@tutor/shared';
import { getScenarioById } from '@tutor/shared/scenarios';
import WebSocket from 'ws';
import { config } from '../config';
import { logger } from '../utils/logger';
import { createSTTStream, STTStream } from '../services/stt';
import { streamChat } from '../services/llm';
import { streamTTS } from '../services/tts';
import { evaluatePronunciation } from '../services/pronunciation';
import { analyzeGrammar, generateEvaluation } from '../services/evaluation';
import { verifyToken } from '../services/auth';
import { addMessage, saveEvaluation, endSession as endDBSession, getSessionScenario } from '../services/sessionStore';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface TurnData {
  transcript: string;
  audioBuffer: Buffer;
  corrections?: Correction[];
  pronunciationErrors?: PronunciationError[];
}

export async function wsHandler(socket: WsType, req: FastifyRequest) {
  const { sessionId } = req.params as { sessionId: string };

  // Extract and verify JWT from query string
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const token = url.searchParams.get('token');
  if (!token) {
    logger.warn(`WS auth missing: ${sessionId}`);
    socket.send(JSON.stringify({ type: 'fatal_error', code: 'unauthorized', message: 'Missing authentication token' }));
    socket.close();
    return;
  }

  const tokenPayload = verifyToken(token);
  if (!tokenPayload) {
    logger.warn(`WS auth invalid: ${sessionId}`);
    socket.send(JSON.stringify({ type: 'fatal_error', code: 'unauthorized', message: 'Invalid or expired token' }));
    socket.close();
    return;
  }

  const authenticatedUserId = tokenPayload.sub;
  logger.info(`WebSocket connected: session=${sessionId} user=${authenticatedUserId}`);

  // Load session scenario from DB (sessionId is now a UUID, not a scenario ID)
  const sessionData = await getSessionScenario(sessionId);
  const scenario = sessionData ? getScenarioById(sessionData.scenarioId) : null;
  const history: ChatMessage[] = [];
  if (scenario) {
    history.push({ role: 'system', content: scenario.systemPrompt });
  }

  let stt: STTStream | null = null;
  let generating = false;
  let llmController: AbortController | null = null;
  let ttsController: AbortController | null = null;
  const pendingTranscripts: string[] = [];

  // Phase 5 state
  const audioBuffers: Buffer[] = [];
  const turns: TurnData[] = [];
  let userMessageCount = 0;
  let evaluating = false;

  function abortGeneration() {
    if (llmController) {
      llmController.abort();
      llmController = null;
    }
    if (ttsController) {
      ttsController.abort();
      ttsController = null;
    }
  }

  function getOrCreateSTT(): STTStream {
    if (!stt) {
      stt = createSTTStream(
        (text, _confidence, isFinal) => {
          if (socket.readyState !== WebSocket.OPEN) return;
          if (isFinal) {
            pendingTranscripts.push(text);
            socket.send(JSON.stringify({ type: 'final_transcript', text, confidence: _confidence }));
          } else {
            socket.send(JSON.stringify({ type: 'interim_transcript', text, confidence: _confidence }));
          }
        },
        () => {
          logger.info('STT disconnected');
          stt = null;
        },
      );
    }
    return stt;
  }

  async function generateResponse(userTranscript?: string, turnIdx?: number) {
    if (generating) return;
    generating = true;

    const userMessages = history.filter((m) => m.role === 'user');
    logger.info(`generateResponse: ${userMessages.length} user messages`);

    if (userMessages.length === 0 || socket.readyState !== WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'ai_response_end' }));
      generating = false;
      return;
    }

    let aiText = '';
    try {
      llmController = new AbortController();
      aiText = await streamChat(history, (_chunk) => {}, llmController.signal);
      llmController = null;
    } catch (err) {
      llmController = null;
      if (err instanceof Error && err.message === 'Aborted') {
        logger.info('LLM aborted by interrupt');
      } else {
        logger.error('LLM error:', err);
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: 'error', code: 'llm_error', message: 'Failed to generate response.' }));
        }
      }
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'ai_response_end' }));
      }
      generating = false;
      return;
    }

    if (!aiText || socket.readyState !== WebSocket.OPEN) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'ai_response_end' }));
      }
      generating = false;
      return;
    }

    history.push({ role: 'assistant', content: aiText });
    socket.send(JSON.stringify({ type: 'ai_response_start', text: aiText }));

    // Persist AI message (fire-and-forget)
    addMessage(sessionId, 'ai', aiText, userMessageCount);

    // Run grammar analysis sequentially AFTER LLM (avoids concurrent DeepSeek requests)
    if (userTranscript && turnIdx !== undefined && socket.readyState === WebSocket.OPEN) {
      analyzeGrammar(userTranscript, scenario?.title || '', undefined)
        .then((corrections) => {
          if (corrections.length > 0 && socket.readyState === WebSocket.OPEN) {
            const turn = turns[turnIdx];
            if (turn) turn.corrections = corrections;
            for (const c of corrections) {
              socket.send(JSON.stringify({
                type: 'correction',
                messageIndex: turnIdx,
                ...c,
              }));
            }
          }
        })
        .catch((err) => logger.error('Grammar analysis error:', err));
    }

    // Stream TTS audio
    try {
      ttsController = new AbortController();
      const voiceId = scenario?.voiceId || config.elevenlabs.voiceId;
      await streamTTS(aiText, voiceId, (chunk) => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(chunk);
        }
      }, ttsController.signal);
      ttsController = null;
    } catch (err) {
      ttsController = null;
      if (err instanceof Error && err.message === 'Aborted') {
        logger.info('TTS aborted by interrupt');
      } else {
        logger.error('TTS error:', err);
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: 'error', code: 'tts_error', message: 'Failed to generate audio.' }));
        }
      }
    }

    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'ai_response_end' }));
    }
    generating = false;
  }

  socket.send(JSON.stringify({
    type: 'connected',
    sessionId,
    scenario: scenario ? {
      id: scenario.id,
      slug: scenario.slug,
      title: scenario.title,
      icon: scenario.icon,
    } : null,
  }));

  socket.on('message', async (raw, isBinary) => {
    // Binary frames = audio data, text frames = JSON control messages
    if (isBinary) {
      const buf = Buffer.isBuffer(raw) ? raw : Buffer.from(raw as ArrayBuffer);
      getOrCreateSTT().sendAudio(buf);
      audioBuffers.push(buf);
      return;
    }

    try {
      const msg: WsClientMessage = JSON.parse(raw.toString());

      switch (msg.type) {
        case 'audio_end': {
          logger.info(`audio_end received, stt=${!!stt}, pendingTranscripts=${pendingTranscripts.length}, userMsgs=${history.filter((m) => m.role === 'user').length}`);
          if (stt) {
            await stt.finalize();
            stt = null;
          }

          // Save current audio buffer for pronunciation eval
          const turnAudio = Buffer.concat(audioBuffers);
          audioBuffers.length = 0;

          let newTranscript = false;
          let lastCombined = '';
          let lastTurnIdx = -1;

          // Merge all pending transcripts into one user message
          if (pendingTranscripts.length > 0) {
            const count = pendingTranscripts.length;
            // Merge fragments: add ". " between sentences that don't end with punctuation
            let combined = pendingTranscripts[0];
            for (let i = 1; i < pendingTranscripts.length; i++) {
              const prev = combined.trimEnd();
              const next = pendingTranscripts[i];
              const sep = /[.!?]$/.test(prev) ? ' ' : '. ';
              combined = prev + sep + next;
            }
            history.push({ role: 'user', content: combined });
            pendingTranscripts.length = 0;
            newTranscript = true;
            lastCombined = combined;
            logger.info(`Merged ${count} transcripts: "${combined.slice(0, 80)}"`);

            // Save turn data
            lastTurnIdx = userMessageCount;
            userMessageCount++;
            turns.push({ transcript: combined, audioBuffer: turnAudio });

            // Persist user message (fire-and-forget)
            addMessage(sessionId, 'user', combined, lastTurnIdx + 1);
          } else {
            logger.info('No transcript from audio_end — skipping generateResponse');
          }

          if (newTranscript) {
            generateResponse(lastCombined, lastTurnIdx);
          } else {
            // No new speech captured — tell client to resume listening
            logger.info('audio_end with no new transcript, sending ai_response_end');
            socket.send(JSON.stringify({ type: 'ai_response_end' }));
          }
          break;
        }

        case 'interrupt':
          logger.info('interrupt received');
          abortGeneration();
          pendingTranscripts.length = 0;
          audioBuffers.length = 0;
          if (generating) {
            generating = false;
            socket.send(JSON.stringify({ type: 'ai_response_end' }));
          }
          stt?.close();
          stt = null;
          break;

        case 'ping':
          socket.send(JSON.stringify({ type: 'pong' }));
          break;

        case 'end_session':
          if (evaluating) break;
          evaluating = true;

          abortGeneration();
          pendingTranscripts.length = 0;
          stt?.close();
          stt = null;

          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'ai_response_end' }));
          }

          logger.info(`Starting evaluation: ${turns.length} turns`);

          try {
            // Step 1: Pronunciation evaluation for all turns in parallel
            const pronunciationResults = await Promise.all(
              turns.map((turn, i) =>
                evaluatePronunciation(turn.audioBuffer, turn.transcript, sessionId)
                  .then((errors) => {
                    turns[i].pronunciationErrors = errors;
                    return errors;
                  })
                  .catch(() => [] as PronunciationError[]),
              ),
            );
            const allPronunciationErrors = pronunciationResults.flat();

            // Step 2: Collect all grammar corrections
            const allGrammarCorrections = turns
              .filter((t) => t.corrections)
              .flatMap((t) => t.corrections!);

            // Step 3: Build ConversationTurn array for evaluation
            const conversationTurns: ConversationTurn[] = [];
            let turnIdx = 0;
            for (const msg of history) {
              if (msg.role === 'system') continue;
              if (msg.role === 'user') {
                const turn = turns[turnIdx];
                conversationTurns.push({
                  role: 'user',
                  content: msg.content,
                  corrections: turn?.corrections,
                  pronunciationErrors: turn?.pronunciationErrors,
                });
                turnIdx++;
              } else {
                conversationTurns.push({ role: 'ai', content: msg.content });
              }
            }

            // Step 4: Generate overall evaluation
            const scores = await generateEvaluation(conversationTurns, allGrammarCorrections);

            // Step 5: Assemble and send full evaluation
            if (socket.readyState === WebSocket.OPEN) {
              socket.send(JSON.stringify({
                type: 'evaluation_result',
                evaluation: {
                  overallScore: scores.overallScore,
                  fluencyScore: scores.fluencyScore,
                  pronunciationScore: scores.pronunciationScore,
                  grammarAccuracy: scores.grammarAccuracy,
                  vocabularyRichness: scores.vocabularyRichness,
                  pronunciationErrors: allPronunciationErrors,
                  grammarCorrections: allGrammarCorrections,
                  vocabularyUsed: scores.vocabularyUsed,
                  summary: scores.summary,
                  recommendations: scores.recommendations,
                },
              }));
            }

            // Step 6: Persist evaluation and end session
            const userWords = turns.reduce((sum, t) => sum + t.transcript.split(/\s+/).length, 0);
            endDBSession(sessionId, {
              turnCount: turns.length,
              userWordCount: userWords,
            });
            saveEvaluation(sessionId, {
              overallScore: scores.overallScore,
              fluencyScore: scores.fluencyScore,
              pronunciationScore: scores.pronunciationScore,
              grammarAccuracy: scores.grammarAccuracy,
              vocabularyRichness: scores.vocabularyRichness,
              pronunciationErrors: allPronunciationErrors,
              grammarCorrections: allGrammarCorrections,
              vocabularyUsed: scores.vocabularyUsed,
              summary: scores.summary,
              recommendations: scores.recommendations,
            });
          } catch (err) {
            logger.error('Evaluation pipeline error:', err);
          }

          break;
      }
    } catch {
      // Ignore malformed JSON
    }
  });

  socket.on('close', () => {
    stt?.close();
    logger.info(`WebSocket disconnected for session: ${sessionId}`);
  });

  socket.on('error', (err: Error) => {
    stt?.close();
    logger.error(`WebSocket error for session ${sessionId}:`, err);
  });
}

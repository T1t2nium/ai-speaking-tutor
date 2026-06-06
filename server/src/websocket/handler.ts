import type { FastifyRequest } from 'fastify';
import type { WebSocket as WsType } from 'ws';
import type { WsClientMessage } from '@tutor/shared';
import { getScenarioById } from '@tutor/shared/scenarios';
import WebSocket from 'ws';
import { config } from '../config';
import { logger } from '../utils/logger';
import { createSTTStream, STTStream } from '../services/stt';
import { streamChat } from '../services/llm';
import { streamTTS } from '../services/tts';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export function wsHandler(socket: WsType, req: FastifyRequest) {
  const { sessionId } = req.params as { sessionId: string };
  logger.info(`WebSocket connected for session: ${sessionId}`);

  const scenario = getScenarioById(sessionId);
  const history: ChatMessage[] = [];
  if (scenario) {
    history.push({ role: 'system', content: scenario.systemPrompt });
  }

  let stt: STTStream | null = null;
  let generating = false;

  function getOrCreateSTT(): STTStream {
    if (!stt) {
      stt = createSTTStream(
        (text, _confidence, isFinal) => {
          if (socket.readyState !== WebSocket.OPEN) return;
          if (isFinal) {
            history.push({ role: 'user', content: text });
            socket.send(JSON.stringify({ type: 'final_transcript', text, confidence: _confidence }));
          } else {
            socket.send(JSON.stringify({ type: 'interim_transcript', text, confidence: _confidence }));
          }
        },
        // onClosed — just cleanup, nothing else
        () => {
          logger.info('STT disconnected');
          stt = null;
        },
      );
    }
    return stt;
  }

  async function generateResponse() {
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
      aiText = await streamChat(history, (_chunk) => {});
    } catch (err) {
      logger.error('LLM error:', err);
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'error', code: 'llm_error', message: 'Failed to generate response.' }));
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

    // Stream TTS audio
    try {
      const voiceId = scenario?.voiceId || config.elevenlabs.voiceId;
      await streamTTS(aiText, voiceId, (chunk) => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(chunk);
        }
      });
    } catch (err) {
      logger.error('TTS error:', err);
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'error', code: 'tts_error', message: 'Failed to generate audio.' }));
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
      getOrCreateSTT().sendAudio(Buffer.isBuffer(raw) ? raw : Buffer.from(raw as ArrayBuffer));
      return;
    }

    try {
      const msg: WsClientMessage = JSON.parse(raw.toString());

      switch (msg.type) {
        case 'audio_end':
          logger.info(`audio_end received, stt=${!!stt}`);
          // Finalize STT and wait for final transcript before triggering LLM
          if (stt) {
            await stt.finalize();
          }
          generateResponse();
          break;
        case 'ping':
          socket.send(JSON.stringify({ type: 'pong' }));
          break;
        case 'end_session':
          stt?.close();
          socket.send(JSON.stringify({ type: 'ai_response_end' }));
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

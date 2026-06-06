import type { FastifyRequest } from 'fastify';
import type { WebSocket as WsType } from 'ws';
import type { WsClientMessage } from '@tutor/shared';
import { getScenarioById } from '@tutor/shared/scenarios';
import WebSocket from 'ws';
import { logger } from '../utils/logger';
import { createSTTStream, STTStream } from '../services/stt';
import { streamChat } from '../services/llm';

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

    try {
      const aiText = await streamChat(history, (_chunk) => {});
      if (aiText && socket.readyState === WebSocket.OPEN) {
        history.push({ role: 'assistant', content: aiText });
        socket.send(JSON.stringify({ type: 'ai_response_start', text: aiText }));
      }
    } catch (err) {
      logger.error('LLM error:', err);
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'error', code: 'llm_error', message: 'Failed to generate response.' }));
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

  socket.on('message', (raw, isBinary) => {
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
          // Close STT if open
          if (stt) {
            stt.finalize();
          }
          // Trigger LLM — history already has user messages from auto-finalization
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

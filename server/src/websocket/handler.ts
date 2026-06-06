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

  // STT lifecycle: created on-demand, destroyed after each turn
  let stt: STTStream | null = null;
  let isProcessing = false; // True while LLM is running (between audio_end and response)

  function getOrCreateSTT(): STTStream {
    if (!stt) {
      stt = createSTTStream(
        // onTranscript
        (text, confidence, isFinal) => {
          if (socket.readyState !== WebSocket.OPEN) return;
          if (isFinal) {
            history.push({ role: 'user', content: text });
            socket.send(JSON.stringify({ type: 'final_transcript', text, confidence }));
          } else {
            socket.send(JSON.stringify({ type: 'interim_transcript', text, confidence }));
          }
        },
        // onClosed — when Deepgram disconnects (finalize or timeout)
        () => {
          stt = null;
          if (isProcessing) {
            // User clicked stop → trigger LLM
            triggerLLM();
          }
          // If not processing, Deepgram timed out — just clean up, next audio creates new STT
        },
      );
    }
    return stt;
  }

  async function triggerLLM() {
    isProcessing = true;
    const lastUser = history.filter((m) => m.role === 'user').pop();
    if (!lastUser || socket.readyState !== WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'ai_response_end' }));
      isProcessing = false;
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
        socket.send(JSON.stringify({
          type: 'error',
          code: 'llm_error',
          message: 'Failed to generate response. Please try again.',
        }));
      }
    }

    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'ai_response_end' }));
    }
    isProcessing = false;
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

  socket.on('message', (raw: Buffer | ArrayBuffer | Buffer[]) => {
    if (Buffer.isBuffer(raw)) {
      getOrCreateSTT().sendAudio(raw);
      return;
    }

    try {
      const msg: WsClientMessage = JSON.parse(raw.toString());

      switch (msg.type) {
        case 'audio_end':
          if (stt) {
            stt.finalize();
          } else {
            // No STT active (perhaps it timed out) — just acknowledge
            socket.send(JSON.stringify({ type: 'ai_response_end' }));
          }
          break;
        case 'interrupt':
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

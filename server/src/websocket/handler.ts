import type { FastifyRequest } from 'fastify';
import type { WebSocket as WsType } from 'ws';
import type { WsClientMessage } from '@tutor/shared';
import WebSocket from 'ws';
import { logger } from '../utils/logger';
import { createSTTStream } from '../services/stt';

export async function wsHandler(socket: WsType, req: FastifyRequest) {
  const { sessionId } = req.params as { sessionId: string };
  logger.info(`WebSocket connected for session: ${sessionId}`);

  // Create STT stream for this session.
  // onClosed: Deepgram has finished → send ai_response_end so client leaves Processing state
  const stt = createSTTStream(
    (text, confidence, isFinal) => {
      if (socket.readyState !== WebSocket.OPEN) return;

      if (isFinal) {
        socket.send(JSON.stringify({
          type: 'final_transcript',
          text,
          confidence,
        }));
      } else {
        socket.send(JSON.stringify({
          type: 'interim_transcript',
          text,
          confidence,
        }));
      }
    },
    () => {
      // Deepgram connection closed → tell client pipeline is done
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'ai_response_end' }));
      }
    },
  );

  socket.send(JSON.stringify({
    type: 'connected',
    sessionId,
    scenario: null,
  }));

  socket.on('message', (raw: Buffer | ArrayBuffer | Buffer[]) => {
    // Binary frames: audio data → forward to Deepgram STT
    if (Buffer.isBuffer(raw)) {
      stt.sendAudio(raw);
      return;
    }

    // Text frames: JSON control messages
    try {
      const msg: WsClientMessage = JSON.parse(raw.toString());

      switch (msg.type) {
        case 'audio_end':
          stt.finalize();
          // Phase 2-3: after STT finalizes, onClosed will trigger LLM → TTS
          break;
        case 'interrupt':
          // TODO: Abort LLM + TTS (Phase 4)
          break;
        case 'ping':
          socket.send(JSON.stringify({ type: 'pong' }));
          break;
        case 'end_session':
          stt.close();
          socket.send(JSON.stringify({
            type: 'ai_response_end',
          }));
          break;
      }
    } catch {
      // Ignore malformed JSON
    }
  });

  socket.on('close', () => {
    stt.close();
    logger.info(`WebSocket disconnected for session: ${sessionId}`);
  });

  socket.on('error', (err: Error) => {
    stt.close();
    logger.error(`WebSocket error for session ${sessionId}:`, err);
  });
}

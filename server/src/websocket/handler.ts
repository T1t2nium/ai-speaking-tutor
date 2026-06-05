import { FastifyRequest } from 'fastify';
import { WebSocket } from 'ws';
import { WsClientMessage } from '@tutor/shared';
import { logger } from '../utils/logger';

export async function wsHandler(socket: WebSocket, req: FastifyRequest) {
  const { sessionId } = req.params as { sessionId: string };
  logger.info(`WebSocket connected for session: ${sessionId}`);

  socket.send(JSON.stringify({
    type: 'connected',
    sessionId,
    scenario: null, // Will be populated when session lookup is implemented
  }));

  socket.on('message', (raw) => {
    // Binary frames are audio data; text frames are JSON control messages
    if (raw instanceof Buffer) {
      // Audio chunk received — will be piped to Deepgram STT
      // TODO: Implement audio pipeline
      return;
    }

    try {
      const msg: WsClientMessage = JSON.parse(raw.toString());
      logger.debug(`WS message: ${msg.type}`);

      switch (msg.type) {
        case 'audio_end':
          // TODO: Finalize STT, trigger LLM, send TTS back
          break;
        case 'interrupt':
          // TODO: Abort current LLM + TTS
          break;
        case 'ping':
          socket.send(JSON.stringify({ type: 'pong' }));
          break;
        case 'end_session':
          // TODO: Close session, trigger evaluation
          break;
        case 'config':
          // TODO: Update VAD config for this session
          break;
      }
    } catch {
      // Ignore malformed messages
    }
  });

  socket.on('close', () => {
    logger.info(`WebSocket disconnected for session: ${sessionId}`);
  });

  socket.on('error', (err) => {
    logger.error(`WebSocket error for session ${sessionId}:`, err);
  });
}

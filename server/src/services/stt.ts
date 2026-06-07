import WebSocket from 'ws';
import { config } from '../config';
import { logger } from '../utils/logger';

type TranscriptCallback = (text: string, confidence: number, isFinal: boolean) => void;

export interface STTStream {
  sendAudio: (chunk: Buffer) => void;
  finalize: () => Promise<void>;
  close: () => void;
  isConnected: () => boolean;
}

export function createSTTStream(
  onTranscript: TranscriptCallback,
  onClosed?: () => void,
): STTStream {
  const url =
    `wss://api.deepgram.com/v1/listen` +
    `?model=nova-2` +
    `&language=en` +
    `&smart_format=true` +
    `&interim_results=true` +
    `&encoding=linear16` +
    `&channels=1` +
    `&sample_rate=16000`;

  const ws = new WebSocket(url, {
    headers: {
      Authorization: `Token ${config.deepgram.apiKey}`,
    },
  });

  let isOpen = false;
  let finalized = false;
  let resolveFinalize: (() => void) | null = null;
  const FINALIZE_TIMEOUT = 5000;
  const audioBuffer: Buffer[] = [];

  logger.info('Deepgram STT connecting...');

  ws.on('open', () => {
    isOpen = true;
    const buffered = audioBuffer.length;
    logger.info(`Deepgram WebSocket connected (${buffered} buffered chunks)`);
    if (buffered > 0) {
      for (const chunk of audioBuffer) {
        ws.send(chunk);
      }
      audioBuffer.length = 0;
    }
  });

  ws.on('message', (data: WebSocket.Data) => {
    try {
      const result = JSON.parse(data.toString());
      const channel = result.channel || result.channels?.[0];
      const alt = channel?.alternatives?.[0];
      if (!alt?.transcript) return;

      const isFinal = result.is_final ?? false;
      onTranscript(alt.transcript, alt.confidence ?? 0, isFinal);

      if (isFinal && resolveFinalize) {
        resolveFinalize();
        resolveFinalize = null;
      }
    } catch {
      // Skip unparseable frames
    }
  });

  ws.on('close', (code: number, reason: Buffer) => {
    isOpen = false;
    logger.info(`Deepgram WebSocket closed (code=${code} reason="${reason.toString().slice(0, 100)}")`);
    if (resolveFinalize) {
      resolveFinalize();
      resolveFinalize = null;
    }
    onClosed?.();
  });

  ws.on('error', (err: Error) => {
    logger.error(`Deepgram WebSocket error: ${err.message}`);
    isOpen = false;
    if (resolveFinalize) {
      resolveFinalize();
      resolveFinalize = null;
    }
    onClosed?.();
  });

  ws.on('unexpected-response', (_req, res) => {
    let body = '';
    res.on('data', (chunk: Buffer) => { body += chunk.toString(); });
    res.on('end', () => {
      logger.error(`Deepgram HTTP ${res.statusCode}: ${body.slice(0, 300)}`);
    });
  });

  return {
    sendAudio(chunk: Buffer) {
      if (isOpen) {
        ws.send(chunk);
      } else if (!finalized) {
        audioBuffer.push(chunk);
      }
    },
    isConnected() {
      return isOpen;
    },
    finalize(): Promise<void> {
      if (!isOpen || finalized) return Promise.resolve();
      finalized = true;
      ws.send(JSON.stringify({ type: 'CloseStream' }));
      logger.info('Deepgram CloseStream sent');

      return new Promise((resolve) => {
        resolveFinalize = resolve;
        // Safety timeout: resolve if no final transcript arrives
        setTimeout(() => {
          if (resolveFinalize) {
            logger.warn('STT finalize timed out waiting for final transcript');
            resolveFinalize();
            resolveFinalize = null;
          }
        }, FINALIZE_TIMEOUT);
      });
    },
    close() {
      if (isOpen) {
        isOpen = false;
        ws.close(1000, 'Client closed');
      }
    },
  };
}

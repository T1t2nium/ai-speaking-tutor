import WebSocket from 'ws';
import { config } from '../config';
import { logger } from '../utils/logger';

type TranscriptCallback = (text: string, confidence: number, isFinal: boolean) => void;

interface STTStream {
  sendAudio: (chunk: Buffer) => void;
  /** Gracefully end the stream — sends CloseStream, waits for final results */
  finalize: () => void;
  /** Abrupt cleanup on disconnect/error */
  close: () => void;
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

  ws.on('open', () => {
    isOpen = true;
    logger.info('Deepgram WebSocket connected');
  });

  ws.on('message', (data: WebSocket.Data) => {
    try {
      const result = JSON.parse(data.toString());
      const channel = result.channel || result.channels?.[0];
      const alt = channel?.alternatives?.[0];
      if (!alt?.transcript) return;

      onTranscript(alt.transcript, alt.confidence ?? 0, result.is_final ?? false);
    } catch {
      // Skip unparseable frames
    }
  });

  ws.on('close', () => {
    isOpen = false;
    logger.info('Deepgram WebSocket closed');
    onClosed?.();
  });

  ws.on('error', (err: Error) => {
    logger.error('Deepgram WebSocket error:', err.message);
    isOpen = false;
    onClosed?.();
  });

  return {
    sendAudio(chunk: Buffer) {
      if (isOpen) {
        ws.send(chunk);
      }
    },
    finalize() {
      if (isOpen && !finalized) {
        finalized = true;
        // Send CloseStream to let Deepgram send final transcript before closing
        ws.send(JSON.stringify({ type: 'CloseStream' }));
        logger.info('Deepgram CloseStream sent');
      }
    },
    close() {
      if (isOpen) {
        isOpen = false;
        ws.close(1000, 'Client closed');
      }
    },
  };
}

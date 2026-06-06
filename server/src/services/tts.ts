import { config } from '../config';
import { logger } from '../utils/logger';

const ELEVENLABS_TTS_URL = 'https://api.elevenlabs.io/v1/text-to-speech';

/**
 * Stream TTS audio from ElevenLabs.
 * Calls `onChunk` with each chunk of MP3 audio data as it arrives.
 */
export async function streamTTS(
  text: string,
  voiceId: string,
  onChunk: (chunk: Buffer) => void,
): Promise<void> {
  const url = `${ELEVENLABS_TTS_URL}/${voiceId}/stream`;
  logger.info(`TTS request: ${text.length} chars, voice=${voiceId}`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
        'xi-api-key': config.elevenlabs.apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_turbo_v2_5',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errText = await response.text();
      // 402 = free tier restriction (expected), log as warn
      if (response.status === 402) {
        logger.warn(`ElevenLabs 402 (free tier): falling back to browser TTS`);
      } else {
        logger.error(`ElevenLabs API error: ${response.status} ${errText}`);
      }
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    const reader = response.body!.getReader();
    let totalBytes = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      onChunk(Buffer.from(value));
    }

    logger.info(`TTS done: ${totalBytes} bytes`);
  } finally {
    clearTimeout(timeout);
  }
}

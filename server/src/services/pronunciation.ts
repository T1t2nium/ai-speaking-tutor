import { config } from '../config';
import { logger } from '../utils/logger';
import type { PronunciationError, PronunciationErrorType } from '@tutor/shared';

const SPEECHACE_URL = 'https://api.speechace.co/api/scoring/text/v9/json';

function pcmToWav(pcmData: Buffer): Buffer {
  const numChannels = 1;
  const sampleRate = 16000;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcmData.length;
  const headerSize = 44;

  const wav = Buffer.alloc(headerSize + dataSize);

  wav.write('RIFF', 0);
  wav.writeUInt32LE(36 + dataSize, 4);
  wav.write('WAVE', 8);

  wav.write('fmt ', 12);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(numChannels, 22);
  wav.writeUInt32LE(sampleRate, 24);
  wav.writeUInt32LE(byteRate, 28);
  wav.writeUInt16LE(blockAlign, 32);
  wav.writeUInt16LE(bitsPerSample, 34);

  wav.write('data', 36);
  wav.writeUInt32LE(dataSize, 40);
  pcmData.copy(wav, 44);

  return wav;
}

interface SpeechaceWordScore {
  word: string;
  score: number;
  quality_score: number;
  phone_score_list?: Array<{
    phone: string;
    score: number;
    error_type: string | null;
    expected_phone?: string;
  }>;
}

export async function evaluatePronunciation(
  audioBuffer: Buffer,
  transcript: string,
  userId: string,
  signal?: AbortSignal,
): Promise<PronunciationError[]> {
  if (audioBuffer.length < 1000) {
    return [];
  }

  const wavBuffer = pcmToWav(audioBuffer);
  const base64Audio = wavBuffer.toString('base64');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  if (signal) {
    if (signal.aborted) { clearTimeout(timeout); return []; }
    signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  try {
    // Key in .env may already be URL-encoded; decode then re-encode for safety
    const key = config.speechace.apiKey;
    const safeKey = encodeURIComponent(decodeURIComponent(key));
    const url = `${SPEECHACE_URL}?key=${safeKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: transcript,
        audio: base64Audio,
        user_id: userId,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errText = await response.text();
      logger.error(`Speechace API error: ${response.status} ${errText}`);
      return [];
    }

    const result = await response.json() as {
      status: string;
      word_score_list?: SpeechaceWordScore[];
    };
    return parseSpeechaceResponse(result);
  } catch (err) {
    if (err instanceof Error && err.message === 'Aborted') {
      logger.info('Speechace aborted');
    } else {
      logger.error('Speechace request failed:', err);
    }
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

function parseSpeechaceResponse(response: {
  status: string;
  word_score_list?: SpeechaceWordScore[];
}): PronunciationError[] {
  const errors: PronunciationError[] = [];

  if (response.status !== 'success' || !response.word_score_list) {
    return errors;
  }

  for (const word of response.word_score_list) {
    if (word.score < 0.7 && word.phone_score_list) {
      for (const phone of word.phone_score_list) {
        if (phone.score < 0.6 && phone.error_type) {
          errors.push({
            word: word.word,
            expectedPhonemes: phone.expected_phone || phone.phone,
            errorType: phone.error_type as PronunciationErrorType,
            severity: Math.round((1 - phone.score) * 100),
            wordScore: Math.round(word.score * 100),
            suggestion: `Practice the sound "${phone.expected_phone || phone.phone}" in "${word.word}"`,
          });
        }
      }
    }
  }

  return errors;
}

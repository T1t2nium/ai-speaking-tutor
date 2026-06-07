import { config } from '../config';
import { logger } from '../utils/logger';

const DEEPSEEK_API = 'https://api.deepseek.com/v1/chat/completions';
const MAX_RETRIES = 5;
const RETRY_DELAYS = [1000, 2000, 4000, 8000, 16000];

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

type StreamCallback = (text: string) => void;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function streamChat(
  messages: ChatMessage[],
  onToken: StreamCallback,
  signal?: AbortSignal,
): Promise<string> {
  logger.info(`DeepSeek request: ${messages.length} messages, last role=${messages[messages.length - 1]?.role}`);

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    if (signal) {
      if (signal.aborted) { clearTimeout(timeout); throw new Error('Aborted'); }
      signal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    try {
      const response = await fetch(DEEPSEEK_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.deepseek.apiKey}`,
          'Connection': 'close',
        },
        body: JSON.stringify({
          model: 'deepseek-v4-flash',
          messages,
          stream: true,
          temperature: 0.7,
          max_tokens: 1024,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const err = await response.text();
        logger.error(`DeepSeek API error: ${response.status} ${err}`);
        throw new Error(`DeepSeek API error: ${response.status}`);
      }

      logger.info('DeepSeek streaming started');

      let fullText = '';
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
              onToken(content);
            }
          } catch {
            // Skip unparseable chunks
          }
        }
      }

      logger.info(`DeepSeek done: ${fullText.length} chars`);
      return fullText;
    } catch (err) {
      clearTimeout(timeout);
      if (signal?.aborted || (err instanceof Error && err.message === 'Aborted')) {
        throw err;
      }
      if (err instanceof TypeError && attempt < MAX_RETRIES - 1) {
        logger.warn(`DeepSeek socket error, retry ${attempt + 1}/${MAX_RETRIES - 1} in ${RETRY_DELAYS[attempt]}ms`);
        await sleep(RETRY_DELAYS[attempt]);
        continue;
      }
      throw err;
    }
  }

  throw new Error('DeepSeek API: all retries exhausted');
}

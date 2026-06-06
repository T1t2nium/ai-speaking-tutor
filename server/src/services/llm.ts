import { config } from '../config';
import { logger } from '../utils/logger';

const DEEPSEEK_API = 'https://api.deepseek.com/v1/chat/completions';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

type StreamCallback = (text: string) => void;

/**
 * Stream a chat completion from DeepSeek.
 * Calls `onToken` with each text chunk as it arrives.
 * Returns the full accumulated response text.
 */
export async function streamChat(
  messages: ChatMessage[],
  onToken: StreamCallback,
): Promise<string> {
  logger.info(`DeepSeek request: ${messages.length} messages, last role=${messages[messages.length - 1]?.role}`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(DEEPSEEK_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.deepseek.apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages,
        stream: true,
        temperature: 0.7,
        max_tokens: 500,
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
  } finally {
    clearTimeout(timeout);
  }
}

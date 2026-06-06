'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { WsServerMessage } from '@tutor/shared';
import { WS_BASE_URL } from '@/lib/constants';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

interface UseWebSocketOptions {
  sessionId: string | null;
  onTextMessage?: (msg: WsServerMessage) => void;
}

interface UseWebSocketReturn {
  status: ConnectionStatus;
  sendAudio: (chunk: ArrayBuffer) => void;
  sendMessage: (msg: object) => void;
}

export function useWebSocket({
  sessionId,
  onTextMessage,
}: UseWebSocketOptions): UseWebSocketReturn {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const wsRef = useRef<WebSocket | null>(null);
  const onMessageRef = useRef(onTextMessage);
  const cancelledRef = useRef(false);
  const reconnectCountRef = useRef(0);

  onMessageRef.current = onTextMessage;

  useEffect(() => {
    if (!sessionId) return;

    cancelledRef.current = false;
    reconnectCountRef.current = 0;

    function connect() {
      if (cancelledRef.current) return;

      setStatus('connecting');
      const url = `${WS_BASE_URL}/ws/session/${sessionId}`;
      const ws = new WebSocket(url);
      wsRef.current = ws;
      ws.binaryType = 'arraybuffer';

      ws.onopen = () => {
        if (!cancelledRef.current) {
          setStatus('connected');
          reconnectCountRef.current = 0;
        }
      };

      ws.onmessage = (event) => {
        if (event.data instanceof ArrayBuffer) return;
        try {
          const msg: WsServerMessage = JSON.parse(event.data);
          onMessageRef.current?.(msg);
        } catch {
          // Ignore
        }
      };

      ws.onclose = () => {
        if (!cancelledRef.current) {
          setStatus('disconnected');
          // Auto-reconnect up to 3 times
          if (reconnectCountRef.current < 3) {
            reconnectCountRef.current++;
            setTimeout(connect, 1000 * reconnectCountRef.current);
          }
        }
      };

      ws.onerror = () => {
        // Browser handles cleanup on error — don't call close() here
      };
    }

    connect();

    return () => {
      cancelledRef.current = true;
      // Only close if already open (not during connecting, avoids Strict Mode noise)
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.close(1000);
      }
      wsRef.current = null;
    };
  }, [sessionId]);

  const sendAudio = useCallback((chunk: ArrayBuffer) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(chunk);
    }
  }, []);

  const sendMessage = useCallback((msg: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  return { status, sendAudio, sendMessage };
}

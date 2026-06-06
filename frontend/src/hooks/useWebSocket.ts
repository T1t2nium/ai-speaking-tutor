'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { WsServerMessage } from '@tutor/shared';
import { WS_BASE_URL } from '@/lib/constants';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

interface UseWebSocketOptions {
  sessionId: string | null;
  onTextMessage?: (msg: WsServerMessage) => void;
  onBinaryMessage?: (chunk: ArrayBuffer) => void;
}

interface UseWebSocketReturn {
  status: ConnectionStatus;
  sendAudio: (chunk: ArrayBuffer) => void;
  sendMessage: (msg: object) => void;
}

export function useWebSocket({
  sessionId,
  onTextMessage,
  onBinaryMessage,
}: UseWebSocketOptions): UseWebSocketReturn {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const wsRef = useRef<WebSocket | null>(null);
  const onMessageRef = useRef(onTextMessage);
  const onBinaryRef = useRef(onBinaryMessage);
  const cancelledRef = useRef(false);
  const reconnectCountRef = useRef(0);

  onMessageRef.current = onTextMessage;
  onBinaryRef.current = onBinaryMessage;

  useEffect(() => {
    if (!sessionId) return;

    cancelledRef.current = false;
    reconnectCountRef.current = 0;

    // Close any existing connection before creating a new one
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

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
        if (cancelledRef.current) return;
        if (event.data instanceof ArrayBuffer) {
          onBinaryRef.current?.(event.data);
          return;
        }
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
          if (reconnectCountRef.current < 3) {
            reconnectCountRef.current++;
            setTimeout(connect, 1000 * reconnectCountRef.current);
          }
        }
      };

      ws.onerror = () => {
        // Browser handles cleanup on error
      };
    }

    connect();

    return () => {
      cancelledRef.current = true;
      // Always close, even if CONNECTING — prevents ghost connections
      wsRef.current?.close();
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

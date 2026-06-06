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
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();

  const connect = useCallback(() => {
    if (!sessionId) return;

    setStatus('connecting');
    const ws = new WebSocket(`${WS_BASE_URL}/ws/session/${sessionId}`);
    wsRef.current = ws;

    ws.binaryType = 'arraybuffer';

    ws.onopen = () => setStatus('connected');

    ws.onmessage = (event) => {
      // Binary frames (audio) are handled separately by the caller
      if (event.data instanceof ArrayBuffer) return;

      try {
        const msg: WsServerMessage = JSON.parse(event.data);
        onTextMessage?.(msg);
      } catch {
        // Ignore unparseable messages
      }
    };

    ws.onclose = () => {
      setStatus('disconnected');
      wsRef.current = null;
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [sessionId, onTextMessage]);

  // Auto-connect when sessionId is available
  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

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

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
  const mountedRef = useRef(true);

  // Keep callback ref in sync
  onMessageRef.current = onTextMessage;

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!sessionId) return;

    setStatus('connecting');
    const ws = new WebSocket(`${WS_BASE_URL}/ws/session/${sessionId}`);
    wsRef.current = ws;
    ws.binaryType = 'arraybuffer';

    ws.onopen = () => {
      if (mountedRef.current) setStatus('connected');
    };

    ws.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer) return;
      try {
        const msg: WsServerMessage = JSON.parse(event.data);
        onMessageRef.current?.(msg);
      } catch {
        // Ignore unparseable messages
      }
    };

    ws.onclose = () => {
      if (mountedRef.current) setStatus('disconnected');
      wsRef.current = null;
    };

    ws.onerror = () => {
      // Only close if the WS is still connecting — if already open, let onclose handle it
      if (ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    };

    return () => {
      // Avoid closing if already CLOSED/CLOSING (React Strict Mode double-mount)
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
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

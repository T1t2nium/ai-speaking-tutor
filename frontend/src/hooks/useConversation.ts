'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useAudioRecorder } from './useAudioRecorder';
import { useAudioPlayback } from './useAudioPlayback';
import { useWebSocket } from './useWebSocket';
import { useConversationStore } from '@/store/conversationStore';
import type { WsServerMessage } from '@tutor/shared';

/**
 * Simple tap-to-toggle recording:
 *   Tap → start mic, record continuously.
 *   Tap again → stop mic, send audio_end, AI responds + corrections.
 */
export function useConversation(sessionId: string | null) {
  const phase = useConversationStore((s) => s.phase);
  const messages = useConversationStore((s) => s.messages);
  const interimTranscript = useConversationStore((s) => s.interimTranscript);
  const wsStoreStatus = useConversationStore((s) => s.wsStatus);
  const storeError = useConversationStore((s) => s.error);

  const audioPlayback = useAudioPlayback();
  const audioChunksRef = useRef<ArrayBuffer[]>([]);
  const lastAiTextRef = useRef('');

  const speakWithBrowserTTS = useCallback((text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    utterance.onend = () => {
      useConversationStore.getState().setPhase('idle');
    };
    window.speechSynthesis.speak(utterance);
  }, []);

  const onBinaryMessage = useCallback((chunk: ArrayBuffer) => {
    audioChunksRef.current.push(chunk);
  }, []);

  const handleServerMessage = useCallback((msg: WsServerMessage) => {
    if (msg.type === 'ai_response_start' && msg.text) {
      lastAiTextRef.current = msg.text;
    }

    if (msg.type === 'ai_response_end') {
      const chunks = audioChunksRef.current;
      if (chunks.length > 0) {
        const totalLen = chunks.reduce((sum, c) => sum + c.byteLength, 0);
        const combined = new Uint8Array(totalLen);
        let offset = 0;
        for (const c of chunks) {
          combined.set(new Uint8Array(c), offset);
          offset += c.byteLength;
        }
        audioChunksRef.current = [];
        audioPlayback.enqueue(combined.buffer);
        audioPlayback.startPlayback();
        lastAiTextRef.current = '';
        setTimeout(() => {
          useConversationStore.getState().setPhase('idle');
        }, 500);
      } else if (lastAiTextRef.current) {
        speakWithBrowserTTS(lastAiTextRef.current);
        lastAiTextRef.current = '';
      } else {
        setTimeout(() => {
          useConversationStore.getState().setPhase('idle');
        }, 500);
      }
    }

    if (msg.type === 'error' && msg.code === 'tts_error' && lastAiTextRef.current) {
      speakWithBrowserTTS(lastAiTextRef.current);
      lastAiTextRef.current = '';
    }

    useConversationStore.getState().handleServerMessage(msg);
  }, [audioPlayback, speakWithBrowserTTS]);

  const { status: wsStatus, sendAudio, sendMessage } = useWebSocket({
    sessionId,
    onTextMessage: handleServerMessage,
    onBinaryMessage,
  });

  useEffect(() => {
    if (wsStoreStatus !== wsStatus) {
      useConversationStore.getState().setWsStatus(wsStatus);
    }
  }, [wsStatus, wsStoreStatus]);

  // --- Audio pipeline ---
  const sendAudioRef = useRef(sendAudio);
  sendAudioRef.current = sendAudio;
  const sendMessageRef = useRef(sendMessage);
  sendMessageRef.current = sendMessage;

  const micActiveRef = useRef(false);

  const handleAudioChunk = useCallback((chunk: Int16Array) => {
    const buffer = (chunk.buffer as ArrayBuffer).slice(
      chunk.byteOffset,
      chunk.byteOffset + chunk.byteLength,
    );
    // Always send audio to server while mic is active (server gates by STT state)
    if (micActiveRef.current) {
      sendAudioRef.current(buffer);
    }
  }, []);

  const audioRecorder = useAudioRecorder({ onChunk: handleAudioChunk });

  // --- Tap-to-toggle ---
  const startRecording = useCallback(async () => {
    micActiveRef.current = true;
    useConversationStore.getState().setPhase('listening');
    await audioRecorder.start();
  }, [audioRecorder]);

  const stopRecording = useCallback(() => {
    if (useConversationStore.getState().phase !== 'listening') return;
    micActiveRef.current = false;
    audioRecorder.stop();
    useConversationStore.getState().setPhase('processing');
    sendMessageRef.current({ type: 'audio_end' });
  }, [audioRecorder]);

  // Full session end
  const endSession = useCallback(() => {
    micActiveRef.current = false;
    audioRecorder.closeStream();
    audioPlayback.stop();
    lastAiTextRef.current = '';
    audioChunksRef.current = [];
    useConversationStore.getState().reset();
    useConversationStore.getState().setPhase('evaluating');
    sendMessageRef.current({ type: 'end_session' });
  }, [audioRecorder, audioPlayback]);

  return {
    phase,
    messages,
    interimTranscript,
    wsStatus,
    error: audioRecorder.error || storeError,
    isRecording: phase === 'listening',
    isAudioSupported: audioRecorder.isSupported,
    micError: audioRecorder.error || storeError,
    startRecording,
    stopRecording,
    endSession,
  };
}

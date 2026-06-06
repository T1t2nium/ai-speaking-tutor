'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useAudioRecorder } from './useAudioRecorder';
import { useAudioPlayback } from './useAudioPlayback';
import { useWebSocket } from './useWebSocket';
import { useConversationStore } from '@/store/conversationStore';
import type { WsServerMessage } from '@tutor/shared';

/**
 * Master hook that orchestrates the audio conversation pipeline:
 * mic → WebSocket → server STT → transcript → (future: LLM → TTS)
 */
export function useConversation(sessionId: string | null) {
  const phase = useConversationStore((s) => s.phase);
  const messages = useConversationStore((s) => s.messages);
  const interimTranscript = useConversationStore((s) => s.interimTranscript);
  const wsStoreStatus = useConversationStore((s) => s.wsStatus);
  const storeError = useConversationStore((s) => s.error);

  // Use getState() in callbacks to avoid depending on reactive store reference
  const handleServerMessage = useCallback((msg: WsServerMessage) => {
    if (msg.type === 'ai_audio_chunk') {
      // TODO: enqueue audio for playback (Phase 3)
      return;
    }
    useConversationStore.getState().handleServerMessage(msg);
  }, []);

  const { status: wsStatus, sendAudio, sendMessage } = useWebSocket({
    sessionId,
    onTextMessage: handleServerMessage,
  });

  // Sync WS status to store (in effect, not during render)
  useEffect(() => {
    if (wsStoreStatus !== wsStatus) {
      useConversationStore.getState().setWsStatus(wsStatus);
    }
  }, [wsStatus, wsStoreStatus]);

  const audioPlayback = useAudioPlayback();

  // Use refs for functions that useAudioRecorder depends on, to keep start() stable
  const sendAudioRef = useRef(sendAudio);
  sendAudioRef.current = sendAudio;

  const handleAudioChunk = useCallback((chunk: ArrayBuffer) => {
    sendAudioRef.current(chunk);
  }, []);

  const audioRecorder = useAudioRecorder({
    onChunk: handleAudioChunk,
  });

  const startSpeaking = useCallback(async () => {
    const currentPhase = useConversationStore.getState().phase;
    if (currentPhase === 'idle') {
      await audioRecorder.start();
    }
  }, [audioRecorder]);

  const stopSpeaking = useCallback(() => {
    const currentPhase = useConversationStore.getState().phase;
    if (currentPhase === 'listening') {
      audioRecorder.stop();
      sendMessage({ type: 'audio_end' });
    }
  }, [audioRecorder, sendMessage]);

  const toggleRecording = useCallback(() => {
    const currentPhase = useConversationStore.getState().phase;
    if (currentPhase === 'idle') {
      startSpeaking();
    } else if (currentPhase === 'listening') {
      stopSpeaking();
    }
  }, [startSpeaking, stopSpeaking]);

  const endSession = useCallback(() => {
    audioRecorder.stop();
    audioPlayback.stop();
    sendMessage({ type: 'end_session' });
    useConversationStore.getState().reset();
  }, [audioRecorder, audioPlayback, sendMessage]);

  return {
    phase,
    messages,
    interimTranscript,
    wsStatus,
    error: audioRecorder.error || storeError,
    isRecording: audioRecorder.isRecording,
    isAudioSupported: audioRecorder.isSupported,
    micError: audioRecorder.error || storeError,
    toggleRecording,
    endSession,
  };
}

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

  const handleServerMessage = useCallback((msg: WsServerMessage) => {
    if (msg.type === 'ai_audio_chunk') {
      return;
    }
    useConversationStore.getState().handleServerMessage(msg);
  }, []);

  const { status: wsStatus, sendAudio, sendMessage } = useWebSocket({
    sessionId,
    onTextMessage: handleServerMessage,
  });

  useEffect(() => {
    if (wsStoreStatus !== wsStatus) {
      useConversationStore.getState().setWsStatus(wsStatus);
    }
  }, [wsStatus, wsStoreStatus]);

  const audioPlayback = useAudioPlayback();

  // Convert Int16Array PCM to ArrayBuffer for WebSocket binary send
  const sendAudioRef = useRef(sendAudio);
  sendAudioRef.current = sendAudio;

  const handleAudioChunk = useCallback((chunk: Int16Array) => {
    const buffer = (chunk.buffer as ArrayBuffer).slice(chunk.byteOffset, chunk.byteOffset + chunk.byteLength);
    sendAudioRef.current(buffer);
  }, []);

  const audioRecorder = useAudioRecorder({
    onChunk: handleAudioChunk,
  });

  const startSpeaking = useCallback(async () => {
    const currentPhase = useConversationStore.getState().phase;
    if (currentPhase === 'idle') {
      useConversationStore.getState().setPhase('listening');
      await audioRecorder.start();
    }
  }, [audioRecorder]);

  const stopSpeaking = useCallback(() => {
    const currentPhase = useConversationStore.getState().phase;
    if (currentPhase === 'listening') {
      audioRecorder.stop();
      useConversationStore.getState().setPhase('processing');
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

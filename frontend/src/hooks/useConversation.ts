'use client';

import { useCallback } from 'react';
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
  const store = useConversationStore();

  const handleServerMessage = useCallback((msg: WsServerMessage) => {
    // Handle binary audio (future: TTS audio playback)
    if (msg.type === 'ai_audio_chunk') {
      // TODO: enqueue audio for playback (Phase 3)
      return;
    }

    store.handleServerMessage(msg);
  }, [store]);

  const { status: wsStatus, sendAudio, sendMessage } = useWebSocket({
    sessionId,
    onTextMessage: handleServerMessage,
  });

  // Update store WS status
  if (store.wsStatus !== wsStatus) {
    store.setWsStatus(wsStatus);
  }

  const audioPlayback = useAudioPlayback();

  const handleAudioChunk = useCallback((chunk: ArrayBuffer) => {
    sendAudio(chunk);
  }, [sendAudio]);

  const audioRecorder = useAudioRecorder({
    onChunk: handleAudioChunk,
  });

  const startSpeaking = useCallback(async () => {
    if (store.phase === 'idle') {
      await audioRecorder.start();
    }
  }, [store.phase, audioRecorder]);

  const stopSpeaking = useCallback(() => {
    if (store.phase === 'listening') {
      audioRecorder.stop();
      sendMessage({ type: 'audio_end' });
    }
  }, [store.phase, audioRecorder, sendMessage]);

  const toggleRecording = useCallback(() => {
    if (store.phase === 'idle') {
      startSpeaking();
    } else if (store.phase === 'listening') {
      stopSpeaking();
    }
  }, [store.phase, startSpeaking, stopSpeaking]);

  const endSession = useCallback(() => {
    audioRecorder.stop();
    audioPlayback.stop();
    sendMessage({ type: 'end_session' });
    store.reset();
  }, [audioRecorder, audioPlayback, sendMessage, store]);

  return {
    ...store,
    isRecording: audioRecorder.isRecording,
    isAudioSupported: audioRecorder.isSupported,
    micError: audioRecorder.error || store.error,
    wsStatus,
    toggleRecording,
    endSession,
  };
}

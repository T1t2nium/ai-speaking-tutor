'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useAudioRecorder } from './useAudioRecorder';
import { useAudioPlayback } from './useAudioPlayback';
import { useWebSocket } from './useWebSocket';
import { useConversationStore } from '@/store/conversationStore';
import type { WsServerMessage } from '@tutor/shared';

/**
 * Master hook that orchestrates the audio conversation pipeline:
 * mic → WebSocket → server STT → LLM → TTS → playback
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
        // Server TTS audio received — decode and play
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
      } else if (lastAiTextRef.current) {
        // No server TTS audio — fall back to browser speechSynthesis
        speakWithBrowserTTS(lastAiTextRef.current);
        lastAiTextRef.current = '';
      }
    }

    if (msg.type === 'error' && msg.code === 'tts_error' && lastAiTextRef.current) {
      // TTS failed — fall back to browser speechSynthesis
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

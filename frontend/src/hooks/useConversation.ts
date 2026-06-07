'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useAudioRecorder } from './useAudioRecorder';
import { useAudioPlayback } from './useAudioPlayback';
import { useWebSocket } from './useWebSocket';
import { useVAD } from './useVAD';
import { useConversationStore } from '@/store/conversationStore';
import type { WsServerMessage } from '@tutor/shared';

/**
 * Master hook — orchestrates mic → VAD → WebSocket → STT → LLM → TTS → playback.
 * Two input modes:
 *   Long press: push-to-talk, release triggers AI, mic stops.
 *   Single tap: VAD auto mode, auto-detects speech end, tap stops mic (no AI).
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
  const practiceActiveRef = useRef(false);
  const vadEnabledRef = useRef(false);

  const speakWithBrowserTTS = useCallback((text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    utterance.onend = () => {
      if (practiceActiveRef.current) {
        useConversationStore.getState().setPhase('listening');
        vadResetRef.current();
      }
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
        if (practiceActiveRef.current) {
          setTimeout(() => {
            useConversationStore.getState().setPhase('listening');
            vadResetRef.current();
          }, 500);
        }
      } else if (lastAiTextRef.current) {
        speakWithBrowserTTS(lastAiTextRef.current);
        lastAiTextRef.current = '';
      } else if (practiceActiveRef.current) {
        setTimeout(() => {
          useConversationStore.getState().setPhase('listening');
          vadResetRef.current();
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

  // --- VAD integration (only fires in auto mode) ---
  const sendMessageRef = useRef(sendMessage);
  sendMessageRef.current = sendMessage;

  const vad = useVAD({
    onSpeechStart: () => {
      if (!vadEnabledRef.current) return;
    },
    onSpeechEnd: () => {
      if (!vadEnabledRef.current) return;
      if (useConversationStore.getState().phase === 'listening') {
        useConversationStore.getState().setPhase('processing');
        sendMessageRef.current({ type: 'audio_end' });
      }
    },
  });

  const vadRef = useRef(vad);
  vadRef.current = vad;
  const vadResetRef = useRef(vad.reset);
  vadResetRef.current = vad.reset;

  // --- Audio pipeline ---
  const sendAudioRef = useRef(sendAudio);
  sendAudioRef.current = sendAudio;

  const handleAudioChunk = useCallback((chunk: Int16Array) => {
    const buffer = (chunk.buffer as ArrayBuffer).slice(chunk.byteOffset, chunk.byteOffset + chunk.byteLength);
    if (useConversationStore.getState().phase === 'listening') {
      sendAudioRef.current(buffer);
    }
    vadRef.current.processChunk(chunk);
  }, []);

  const audioRecorder = useAudioRecorder({
    onChunk: handleAudioChunk,
  });

  // --- VAD auto mode (single tap) ---
  const startVAD = useCallback(async () => {
    practiceActiveRef.current = true;
    vadEnabledRef.current = true;
    useConversationStore.getState().setPhase('listening');
    await audioRecorder.start();
  }, [audioRecorder]);

  const stopVAD = useCallback(() => {
    practiceActiveRef.current = false;
    vadEnabledRef.current = false;
    vadRef.current.reset();
    audioRecorder.stop();
    useConversationStore.getState().setPhase('idle');
  }, [audioRecorder]);

  // --- Push-to-talk mode (long press) ---
  const pttPromiseRef = useRef<Promise<void> | null>(null);

  const startPTT = useCallback(() => {
    practiceActiveRef.current = true;
    vadEnabledRef.current = false;
    vadRef.current.reset();
    useConversationStore.getState().setPhase('listening');
    pttPromiseRef.current = audioRecorder.start();
  }, [audioRecorder]);

  // Release push-to-talk → wait for mic ready → send transcript → stop mic → trigger AI
  const endPTT = useCallback(async () => {
    if (useConversationStore.getState().phase !== 'listening') return;
    // Wait for mic to finish starting (if still in progress)
    if (pttPromiseRef.current) {
      await pttPromiseRef.current;
      pttPromiseRef.current = null;
    }
    if (useConversationStore.getState().phase !== 'listening') return; // re-check
    practiceActiveRef.current = false;
    vadEnabledRef.current = false;
    audioRecorder.stop();
    useConversationStore.getState().setPhase('processing');
    sendMessage({ type: 'audio_end' });
  }, [audioRecorder, sendMessage]);

  // Full session end (clears messages, sends end_session)
  const endSession = useCallback(() => {
    practiceActiveRef.current = false;
    vadEnabledRef.current = false;
    vadRef.current.reset();
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
    isRecording: practiceActiveRef.current,
    isAudioSupported: audioRecorder.isSupported,
    micError: audioRecorder.error || storeError,
    // VAD auto mode
    startVAD,
    stopVAD,
    // Push-to-talk
    startPTT,
    endPTT,
    // Full session end
    endSession,
    isSpeaking: vad.isSpeaking,
    silenceProgress: vad.silenceProgress,
  };
}

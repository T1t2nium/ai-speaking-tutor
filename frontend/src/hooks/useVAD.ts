'use client';

import { useCallback, useRef, useState } from 'react';

interface VADOptions {
  /** Called when the VAD transitions from silent to speaking */
  onSpeechStart: () => void;
  /** Called when the VAD transitions from speaking to silent (after silence duration) */
  onSpeechEnd: () => void;
}

interface VADState {
  isSpeaking: boolean;
  /** 0–1 progress toward silence timeout (0 = speaking, 1 = about to trigger end) */
  silenceProgress: number;
}

const DEFAULT_HIGH_THRESHOLD = 0.02;   // RMS threshold to START speech
const DEFAULT_LOW_THRESHOLD = 0.01;    // RMS threshold to END speech
const SILENCE_DURATION_MS = 1200;       // silence needed to trigger speech end (forgiving for learners)
const MIN_SPEECH_CHUNKS = 3;           // minimum chunks (300ms) to confirm speech start

/**
 * Simple RMS energy-based Voice Activity Detection.
 * Uses hysteresis: higher threshold to start speech, lower to end it.
 * Zero external dependencies.
 */
export function useVAD({ onSpeechStart, onSpeechEnd }: VADOptions): VADState & {
  processChunk: (chunk: Int16Array) => void;
  reset: () => void;
} {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [silenceProgress, setSilenceProgress] = useState(0);
  const speakingRef = useRef(false);
  const silentCountRef = useRef(0);
  const speechCountRef = useRef(0);
  const onSpeechStartRef = useRef(onSpeechStart);
  const onSpeechEndRef = useRef(onSpeechEnd);

  onSpeechStartRef.current = onSpeechStart;
  onSpeechEndRef.current = onSpeechEnd;

  const chunksPerSilence = Math.ceil(SILENCE_DURATION_MS / 100); // each chunk is ~100ms

  const reset = useCallback(() => {
    speakingRef.current = false;
    silentCountRef.current = 0;
    speechCountRef.current = 0;
    setIsSpeaking(false);
    setSilenceProgress(0);
  }, []);

  const processChunk = useCallback((chunk: Int16Array) => {
    // Calculate RMS: root mean square of normalized samples
    let sumSq = 0;
    for (let i = 0; i < chunk.length; i++) {
      const normalized = chunk[i] / 32768;
      sumSq += normalized * normalized;
    }
    const rms = Math.sqrt(sumSq / chunk.length);

    if (speakingRef.current) {
      if (rms < DEFAULT_LOW_THRESHOLD) {
        silentCountRef.current++;
        setSilenceProgress(silentCountRef.current / chunksPerSilence);
        if (silentCountRef.current >= chunksPerSilence) {
          // Confirmed silence → speech ended
          speakingRef.current = false;
          silentCountRef.current = 0;
          speechCountRef.current = 0;
          setIsSpeaking(false);
          setSilenceProgress(0);
          onSpeechEndRef.current();
        }
      } else {
        // Still speaking, reset silence counter
        silentCountRef.current = 0;
        setSilenceProgress(0);
      }
    } else {
      if (rms > DEFAULT_HIGH_THRESHOLD) {
        speechCountRef.current++;
        if (speechCountRef.current >= MIN_SPEECH_CHUNKS) {
          // Confirmed speech → speech started
          speakingRef.current = true;
          silentCountRef.current = 0;
          speechCountRef.current = 0;
          setIsSpeaking(true);
          setSilenceProgress(0);
          onSpeechStartRef.current();
        }
      } else {
        // Noise below threshold, reset speech counter
        speechCountRef.current = 0;
      }
    }
  }, []);

  return { isSpeaking, silenceProgress, processChunk, reset };
}

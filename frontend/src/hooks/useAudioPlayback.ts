'use client';

import { useCallback, useRef } from 'react';

interface UseAudioPlaybackReturn {
  enqueue: (chunk: ArrayBuffer) => void;
  startPlayback: () => void;
  stop: () => void;
}

/**
 * Handles streaming audio playback via AudioContext.
 * Enqueues audio chunks and plays them in sequence without gaps.
 */
export function useAudioPlayback(): UseAudioPlaybackReturn {
  const ctxRef = useRef<AudioContext | null>(null);
  const queueRef = useRef<ArrayBuffer[]>([]);
  const playingRef = useRef(false);
  const nextTimeRef = useRef(0);

  const getContext = () => {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext({ sampleRate: 48000 });
    }
    return ctxRef.current;
  };

  const playNext = useCallback(async () => {
    const ctx = getContext();
    const buffer = queueRef.current.shift();
    if (!buffer) {
      playingRef.current = false;
      return;
    }

    playingRef.current = true;
    try {
      const audioBuffer = await ctx.decodeAudioData(buffer.slice(0));
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);

      const now = ctx.currentTime;
      const startTime = Math.max(now, nextTimeRef.current);
      source.start(startTime);
      nextTimeRef.current = startTime + audioBuffer.duration;

      source.onended = () => playNext();
    } catch {
      // Skip un-decodable chunks, try next
      playNext();
    }
  }, []);

  const startPlayback = useCallback(() => {
    if (!playingRef.current && queueRef.current.length > 0) {
      playNext();
    }
  }, [playNext]);

  const enqueue = useCallback((chunk: ArrayBuffer) => {
    queueRef.current.push(chunk);
  }, []);

  const stop = useCallback(() => {
    queueRef.current.length = 0;
    playingRef.current = false;
    nextTimeRef.current = 0;
    ctxRef.current?.close();
    ctxRef.current = null;
  }, []);

  return { enqueue, startPlayback, stop };
}

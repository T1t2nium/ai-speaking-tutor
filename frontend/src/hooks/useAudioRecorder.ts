'use client';

import { useCallback, useRef, useState } from 'react';
import { createMicrophoneStream } from '@/lib/audio';

interface UseAudioRecorderOptions {
  onChunk: (chunk: Int16Array) => void;
  onStreamReady?: (stream: MediaStream) => void;
}

interface UseAudioRecorderReturn {
  isRecording: boolean;
  isSupported: boolean;
  error: string | null;
  start: () => Promise<void>;
  stop: () => void;
}

export function useAudioRecorder({
  onChunk,
  onStreamReady,
}: UseAudioRecorderOptions): UseAudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported] = useState(
    () => typeof window !== 'undefined' && !!(navigator.mediaDevices?.getUserMedia),
  );
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<Awaited<ReturnType<typeof createMicrophoneStream>> | null>(null);

  const start = useCallback(async () => {
    setError(null);
    try {
      const recorder = await createMicrophoneStream();
      recorderRef.current = recorder;

      recorder.onChunk((chunk) => {
        onChunk(chunk);
      });

      if (onStreamReady) {
        onStreamReady(recorder.mediaStream);
      }

      recorder.start();
      setIsRecording(true);
    } catch (err) {
      const message =
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'Microphone access denied. Please allow microphone permissions.'
          : err instanceof DOMException && err.name === 'NotFoundError'
          ? 'No microphone found. Please connect a microphone.'
          : 'Failed to access microphone.';
      setError(message);
    }
  }, [onChunk, onStreamReady]);

  const stop = useCallback(() => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setIsRecording(false);
  }, []);

  return { isRecording, isSupported, error, start, stop };
}

// Audio encoding utilities for the AI Speaking Tutor

/**
 * Initialize microphone capture with Opus encoding.
 * Uses MediaRecorder API with audio/webm;codecs=opus for broad browser support.
 */
export async function createMicrophoneStream(): Promise<{
  mediaStream: MediaStream;
  onChunk: (callback: (chunk: Blob) => void) => void;
  start: () => void;
  stop: () => void;
}> {
  const mediaStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 1,
      sampleRate: 48000,
      echoCancellation: true,
      noiseSuppression: true,
    },
  });

  // Prefer codec that produces compatible Opus for Deepgram
  const mimeType = getSupportedMimeType();
  const recorder = new MediaRecorder(mediaStream, {
    mimeType,
    audioBitsPerSecond: 64000,
  });

  let chunkCallback: (chunk: Blob) => void;

  recorder.ondataavailable = (event) => {
    if (event.data.size > 0 && chunkCallback) {
      chunkCallback(event.data);
    }
  };

  return {
    mediaStream,
    onChunk(callback: (chunk: Blob) => void) {
      chunkCallback = callback;
    },
    start() {
      // timeslice: 100ms produces regular chunks for low-latency streaming
      recorder.start(100);
    },
    stop() {
      recorder.stop();
      mediaStream.getTracks().forEach((track) => track.stop());
    },
  };
}

function getSupportedMimeType(): string {
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/ogg',
  ];
  for (const t of types) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return 'audio/webm';
}

/**
 * Convert a Blob to ArrayBuffer for sending over WebSocket.
 */
export function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(blob);
  });
}

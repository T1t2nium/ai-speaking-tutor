// Audio capture and encoding utilities

const SAMPLE_RATE = 16000;

/**
 * Initialize microphone capture returning raw Int16 PCM chunks.
 * Uses ScriptProcessorNode for broad compatibility with AudioContext.
 */
export async function createMicrophoneStream(): Promise<{
  mediaStream: MediaStream;
  audioContext: AudioContext;
  onChunk: (callback: (chunk: Int16Array) => void) => void;
  start: () => void;
  stop: () => void;
}> {
  const mediaStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 1,
      sampleRate: { ideal: SAMPLE_RATE },
      echoCancellation: true,
      noiseSuppression: true,
    },
  });

  const audioContext = new AudioContext({ sampleRate: SAMPLE_RATE });
  const source = audioContext.createMediaStreamSource(mediaStream);

  // Downsample if needed: the stream might be 48kHz, we want 16kHz
  // ScriptProcessor node runs at the AudioContext's sample rate
  const processor = audioContext.createScriptProcessor(4096, 1, 1);

  let chunkCallback: ((chunk: Int16Array) => void) | null = null;
  let bufferAccumulator = new Float32Array(0);

  // Collect PCM for ~100ms at 16kHz = 1600 samples
  const CHUNK_SIZE = SAMPLE_RATE / 10; // 1600 samples = 100ms

  processor.onaudioprocess = (event) => {
    if (!chunkCallback) return;

    const input = event.inputBuffer.getChannelData(0); // Float32Array [-1, 1]

    // Append to accumulator
    const combined = new Float32Array(bufferAccumulator.length + input.length);
    combined.set(bufferAccumulator, 0);
    combined.set(input, bufferAccumulator.length);
    bufferAccumulator = combined;

    // Emit chunks when we have enough samples
    while (bufferAccumulator.length >= CHUNK_SIZE) {
      const chunk = bufferAccumulator.slice(0, CHUNK_SIZE);
      bufferAccumulator = bufferAccumulator.slice(CHUNK_SIZE);

      // Convert Float32 [-1,1] to Int16 [-32768, 32767]
      const int16 = float32ToInt16(chunk);
      chunkCallback(int16);
    }
  };

  source.connect(processor);
  // ScriptProcessor MUST be connected to destination to fire onaudioprocess
  processor.connect(audioContext.destination);

  return {
    mediaStream,
    audioContext,
    onChunk(callback: (chunk: Int16Array) => void) {
      chunkCallback = callback;
    },
    start() {
      // AudioContext resumes on user gesture; ScriptProcessor starts immediately
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
    },
    stop() {
      // Flush remaining buffer
      if (chunkCallback && bufferAccumulator.length > 0) {
        const int16 = float32ToInt16(bufferAccumulator);
        chunkCallback(int16);
        bufferAccumulator = new Float32Array(0);
      }
      source.disconnect();
      processor.disconnect();
      mediaStream.getTracks().forEach((track) => track.stop());
      audioContext.close();
    },
  };
}

function float32ToInt16(float32: Float32Array): Int16Array {
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return int16;
}

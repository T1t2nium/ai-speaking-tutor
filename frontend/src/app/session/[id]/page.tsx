'use client';

import { useParams } from 'next/navigation';
import { getScenarioById } from '@tutor/shared/scenarios';
import { useCallback, useEffect, useRef, useState } from 'react';

type Phase = 'idle' | 'listening' | 'processing' | 'speaking';

export default function SessionPage() {
  const params = useParams();
  const scenario = getScenarioById(params.id as string);
  const [phase, setPhase] = useState<Phase>('idle');
  const [transcript, setTranscript] = useState('');
  const wsRef = useRef<WebSocket | null>(null);

  // Connect WebSocket on mount
  useEffect(() => {
    if (!scenario) return;

    const ws = new WebSocket(`ws://localhost:3001/ws/session/${scenario.id}`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'interim_transcript') {
          setTranscript(msg.text);
        } else if (msg.type === 'final_transcript') {
          setTranscript(msg.text);
          setPhase('processing');
        } else if (msg.type === 'ai_response_end') {
          setPhase('idle');
        }
      } catch {
        // Binary frame (audio), handled separately
      }
    };

    ws.onclose = () => setPhase('idle');

    return () => { ws.close(); };
  }, [scenario]);

  const toggleRecording = useCallback(() => {
    if (phase === 'idle') {
      setPhase('listening');
      // TODO: Start audio recording via useAudioRecorder
    } else if (phase === 'listening') {
      setPhase('processing');
      wsRef.current?.send(JSON.stringify({ type: 'audio_end' }));
    }
  }, [phase]);

  if (!scenario) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-12 text-center">
        <p className="text-slate-500">Scenario not found.</p>
        <a href="/" className="text-primary-600 hover:underline mt-4 inline-block">Back to scenarios</a>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 flex flex-col min-h-[calc(100vh-73px)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <a href="/" className="text-sm text-slate-500 hover:text-slate-700">← Back</a>
          <h1 className="text-xl font-semibold text-slate-800">{scenario.icon} {scenario.title}</h1>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full font-medium
          ${phase === 'listening' ? 'bg-red-100 text-red-700 animate-pulse' :
            phase === 'processing' ? 'bg-amber-100 text-amber-700' :
            phase === 'speaking' ? 'bg-blue-100 text-blue-700' :
            'bg-slate-100 text-slate-500'}`}>
          {phase === 'idle' ? 'Ready' :
           phase === 'listening' ? 'Listening...' :
           phase === 'processing' ? 'Processing...' :
           'AI Speaking...'}
        </span>
      </div>

      {/* Scenario hint */}
      <div className="bg-primary-50 border border-primary-100 rounded-lg p-4 mb-6 text-sm text-primary-800">
        {scenario.scenarioHint}
      </div>

      {/* Conversation area (placeholder) */}
      <div className="flex-1 bg-slate-50 rounded-lg border border-slate-200 p-6 mb-6 flex items-center justify-center">
        {transcript ? (
          <p className="text-slate-700 text-center">{transcript}</p>
        ) : (
          <p className="text-slate-400 text-center">
            Tap the microphone to start speaking
          </p>
        )}
      </div>

      {/* Audio controls */}
      <div className="flex justify-center pb-4">
        <button
          onClick={toggleRecording}
          className={`w-16 h-16 rounded-full flex items-center justify-center transition-all
            ${phase === 'listening' ? 'bg-red-500 scale-110 shadow-lg shadow-red-200' :
              'bg-primary-600 hover:bg-primary-700 shadow-md'}`}
        >
          <span className="text-white text-2xl">
            {phase === 'listening' ? '⏹' : '🎤'}
          </span>
        </button>
      </div>
    </div>
  );
}

'use client';

import { useParams } from 'next/navigation';
import { useCallback, useRef } from 'react';
import { getScenarioById } from '@tutor/shared/scenarios';
import { useConversation } from '@/hooks/useConversation';

const HOLD_MS = 300;

export default function SessionPage() {
  const params = useParams();
  const scenario = getScenarioById(params.id as string);

  const {
    phase,
    messages,
    interimTranscript,
    isRecording,
    isAudioSupported,
    micError,
    wsStatus,
    startVAD,
    stopVAD,
    startPTT,
    endPTT,
    endSession,
    isSpeaking,
    silenceProgress,
  } = useConversation(params.id as string);

  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pttActiveRef = useRef(false);

  const onPointerDown = useCallback(() => {
    const p = phase;
    if (p === 'processing' || p === 'speaking') return;
    // Start hold timer — if held > HOLD_MS, enter push-to-talk
    holdTimerRef.current = setTimeout(() => {
      pttActiveRef.current = true;
      startPTT();
    }, HOLD_MS);
  }, [phase, startPTT]);

  const onPointerUp = useCallback(async () => {
    // Clear the hold timer (either it fired or it didn't)
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }

    if (pttActiveRef.current) {
      // Was a long press — end push-to-talk turn
      pttActiveRef.current = false;
      await endPTT();
      return;
    }

    // Short tap
    const p = phase;
    if (p === 'idle') {
      startVAD();
    } else if (p === 'listening') {
      stopVAD();
    }
    // processing / speaking → ignore
  }, [phase, startVAD, stopVAD, endPTT]);

  if (!scenario) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-12 text-center">
        <p className="text-slate-500">Scenario not found.</p>
        <a href="/" className="text-primary-600 hover:underline mt-4 inline-block">
          Back to scenarios
        </a>
      </div>
    );
  }

  const vadLabel = phase === 'listening'
    ? (isSpeaking ? 'Speaking...' : 'Listening...')
    : null;
  const showSilenceWarning = phase === 'listening' && !isSpeaking && silenceProgress > 0.5;

  const phaseLabel = {
    idle: 'Start Practice',
    listening: vadLabel || 'Listening...',
    processing: 'Processing...',
    speaking: 'AI Speaking...',
    evaluating: 'Evaluating...',
  }[phase];

  const phaseColor = {
    idle: 'bg-slate-100 text-slate-500',
    listening: isSpeaking
      ? 'bg-green-100 text-green-700 animate-pulse'
      : showSilenceWarning
        ? 'bg-amber-100 text-amber-700'
        : 'bg-green-100 text-green-600',
    processing: 'bg-amber-100 text-amber-700',
    speaking: 'bg-blue-100 text-blue-700',
    evaluating: 'bg-purple-100 text-purple-700',
  }[phase];

  const practiceActive = phase !== 'idle';

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 flex flex-col min-h-[calc(100vh-73px)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <a href="/" className="text-sm text-slate-500 hover:text-slate-700">← Back</a>
          <h1 className="text-xl font-semibold text-slate-800">
            {scenario.icon} {scenario.title}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {wsStatus !== 'connected' && (
            <span className="text-xs text-amber-600">
              {wsStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
            </span>
          )}
          <div className="flex flex-col items-center gap-0.5">
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${phaseColor}`}>
              {phaseLabel}
            </span>
            {phase === 'listening' && !isSpeaking && (
              <span className="block w-12 h-0.5 bg-slate-200 rounded-full overflow-hidden">
                <span
                  className="block h-full bg-amber-400 rounded-full transition-all duration-100"
                  style={{ width: `${Math.min(silenceProgress * 100, 100)}%` }}
                />
              </span>
            )}
          </div>
          {practiceActive && (
            <button
              onClick={endSession}
              className="text-xs text-slate-400 hover:text-red-500 transition-colors"
            >
              End Session
            </button>
          )}
        </div>
      </div>

      {/* Scenario hint */}
      <div className="bg-primary-50 border border-primary-100 rounded-lg p-4 mb-6 text-sm text-primary-800">
        {scenario.scenarioHint}
      </div>

      {/* Error display */}
      {micError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-sm text-red-700">
          {micError}
          {micError.includes('denied') && (
            <p className="mt-1 text-xs text-red-500">
              Check your browser settings to allow microphone access.
            </p>
          )}
        </div>
      )}

      {/* Conversation area */}
      <div className="flex-1 bg-slate-50 rounded-lg border border-slate-200 p-6 mb-6 overflow-y-auto space-y-4 min-h-[300px]">
        {messages.length === 0 && !interimTranscript && (
          <div className="flex items-center justify-center h-full text-slate-400">
            <p className="text-center">
              {!isAudioSupported
                ? 'Your browser does not support microphone access. Please use Chrome, Edge, or Firefox.'
                : 'Hold to speak · Tap for auto mode'}
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-xl px-4 py-3 text-sm ${
                msg.role === 'user'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-700'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {interimTranscript && (
          <div className="flex justify-end">
            <div className="max-w-[80%] rounded-xl px-4 py-3 text-sm bg-primary-300 text-white italic">
              {interimTranscript}
            </div>
          </div>
        )}

        {phase === 'processing' && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-200 rounded-xl px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Audio controls */}
      <div className="flex flex-col items-center gap-2 pb-4">
        <p className="text-xs text-slate-400">
          {practiceActive
            ? 'Tap to stop recording'
            : 'Hold to talk · Tap for auto'}
        </p>
        <button
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-md select-none touch-none
            ${practiceActive
              ? 'bg-red-500 hover:bg-red-600 scale-110 shadow-lg shadow-red-200'
              : 'bg-primary-600 hover:bg-primary-700'
            }`}
          title={practiceActive ? 'Stop Recording' : 'Hold to talk · Tap for auto'}
        >
          <span className="text-white text-2xl">
            {practiceActive ? '⏹' : '🎤'}
          </span>
        </button>
      </div>
    </div>
  );
}

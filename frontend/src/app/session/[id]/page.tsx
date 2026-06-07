'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import { getScenarioById } from '@tutor/shared/scenarios';
import type { Correction } from '@tutor/shared';
import { useConversation } from '@/hooks/useConversation';
import { useConversationStore } from '@/store/conversationStore';
import { EvaluationPanel } from './EvaluationPanel';

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
    startRecording,
    stopRecording,
    endSession,
  } = useConversation(params.id as string);

  const evaluation = useConversationStore((s) => s.evaluation);
  const correctionMap = useConversationStore((s) => s.correctionMap);

  const handleMicClick = () => {
    if (phase === 'processing' || phase === 'speaking' || phase === 'evaluating') return;
    if (phase === 'idle') {
      startRecording();
    } else if (phase === 'listening') {
      stopRecording();
    }
  };

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

  const phaseLabel: Record<string, string> = {
    idle: 'Tap to Speak',
    listening: 'Recording...',
    processing: 'Processing...',
    speaking: 'AI Speaking...',
    evaluating: 'Evaluating...',
  };

  const phaseColor: Record<string, string> = {
    idle: 'bg-slate-100 text-slate-500',
    listening: 'bg-red-100 text-red-600 animate-pulse',
    processing: 'bg-amber-100 text-amber-700',
    speaking: 'bg-blue-100 text-blue-700',
    evaluating: 'bg-purple-100 text-purple-700',
  };

  const isActive = phase !== 'idle' && phase !== 'evaluating';

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
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${phaseColor[phase] || phaseColor.idle}`}>
            {phaseLabel[phase] || phase}
          </span>
          {(isActive || messages.length > 0) && (
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
                : 'Tap the microphone to start speaking'}
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
              {msg.role === 'user' && correctionMap[i]?.length > 0 && (
                <div className="mt-2 pt-2 border-t border-primary-400 space-y-1">
                  {correctionMap[i].map((c) => (
                    <InlineCorrection key={c.id} correction={c} />
                  ))}
                </div>
              )}
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

      {/* Evaluation panel */}
      {phase === 'evaluating' && !evaluation && (
        <div className="bg-white border border-purple-200 rounded-xl p-8 mb-6 text-center">
          <div className="flex gap-1 justify-center mb-3">
            <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <p className="text-sm text-slate-500">Generating evaluation...</p>
        </div>
      )}
      {phase === 'evaluating' && evaluation && (
        <EvaluationPanel
          evaluation={evaluation}
          onStartNew={() => {
            endSession();
            window.location.href = '/';
          }}
        />
      )}

      {/* Audio controls — hidden when evaluating */}
      {phase !== 'evaluating' && (
        <div className="flex flex-col items-center gap-2 pb-4">
          <p className="text-xs text-slate-400">
            {isRecording
              ? 'Tap to stop and get feedback'
              : 'Tap to start recording'}
          </p>
          <button
            onClick={handleMicClick}
            className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-md select-none
              ${isRecording
                ? 'bg-red-500 hover:bg-red-600 scale-110 shadow-lg shadow-red-200'
                : phase === 'processing' || phase === 'speaking'
                  ? 'bg-slate-300 cursor-not-allowed'
                  : 'bg-primary-600 hover:bg-primary-700'
              }`}
            disabled={phase === 'processing' || phase === 'speaking'}
            title={isRecording ? 'Stop Recording' : 'Start Recording'}
          >
            <span className="text-white text-2xl">
              {isRecording ? '⏹' : '🎤'}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

function InlineCorrection({ correction }: { correction: Correction }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="text-xs leading-relaxed">
      <span className="line-through opacity-60">{correction.original}</span>
      <span className="mx-1 text-primary-200">→</span>
      <span className="font-medium text-green-200">{correction.corrected}</span>
      <button
        onClick={() => setExpanded(!expanded)}
        className="ml-1.5 text-primary-200 hover:text-white transition-colors focus:outline-none"
        aria-label={expanded ? 'Hide explanation' : 'Show explanation'}
      >
        {expanded ? '▲' : '▼'}
      </button>
      {expanded && (
        <div className="mt-1.5 text-primary-100 space-y-0.5">
          <span className="text-[10px] uppercase tracking-wider opacity-60">
            {correction.category}
          </span>
          <p>{correction.explanation}</p>
        </div>
      )}
    </div>
  );
}

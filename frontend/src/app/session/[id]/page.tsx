'use client';

import { useParams } from 'next/navigation';
import { getScenarioById } from '@tutor/shared/scenarios';
import { useConversation } from '@/hooks/useConversation';

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
    toggleRecording,
    endSession,
  } = useConversation(params.id as string);

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

  const phaseLabel = {
    idle: 'Ready',
    listening: 'Listening...',
    processing: 'Processing...',
    speaking: 'AI Speaking...',
    evaluating: 'Evaluating...',
  }[phase];

  const phaseColor = {
    idle: 'bg-slate-100 text-slate-500',
    listening: 'bg-red-100 text-red-700 animate-pulse',
    processing: 'bg-amber-100 text-amber-700',
    speaking: 'bg-blue-100 text-blue-700',
    evaluating: 'bg-purple-100 text-purple-700',
  }[phase];

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
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${phaseColor}`}>
            {phaseLabel}
          </span>
          {phase !== 'idle' && (
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
            </div>
          </div>
        ))}

        {/* Interim transcript (what STT is hearing live) */}
        {interimTranscript && (
          <div className="flex justify-end">
            <div className="max-w-[80%] rounded-xl px-4 py-3 text-sm bg-primary-300 text-white italic">
              {interimTranscript}
            </div>
          </div>
        )}

        {/* Processing indicator */}
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
      <div className="flex justify-center pb-4">
        <button
          onClick={toggleRecording}
          disabled={phase === 'processing' || phase === 'speaking'}
          className={`w-16 h-16 rounded-full flex items-center justify-center transition-all
            ${isRecording
              ? 'bg-red-500 scale-110 shadow-lg shadow-red-200'
              : 'bg-primary-600 hover:bg-primary-700 shadow-md disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
          title={isRecording ? 'Stop speaking' : 'Start speaking'}
        >
          <span className="text-white text-2xl">
            {isRecording ? '⏹' : '🎤'}
          </span>
        </button>
      </div>
    </div>
  );
}

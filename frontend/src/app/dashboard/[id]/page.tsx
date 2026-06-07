'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { API_BASE_URL } from '@/lib/constants';
import type { Evaluation, Correction, PronunciationError } from '@tutor/shared';

interface SessionDetail {
  session: {
    id: string;
    scenarioTitle: string;
    scenarioId: string;
    status: string;
    startedAt: string;
    endedAt: string | null;
    turnCount: number;
    durationSeconds: number | null;
  };
  messages: Array<{
    id: string;
    role: string;
    content: string;
    turnNumber: number;
    createdAt: string;
  }>;
  evaluation: {
    overallScore: number;
    fluencyScore: number;
    pronunciationScore: number;
    grammarAccuracy: number;
    vocabularyRichness: number;
    pronunciationErrors: PronunciationError[];
    grammarCorrections: Correction[];
    vocabularyUsed: Array<{ word: string; definition: string; context: string; timesUsed: number }>;
    summary: string;
    recommendations: string[];
  } | null;
}

export default function SessionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const token = useAuthStore((s) => s.token);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);

  const [data, setData] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      router.push('/login');
      return;
    }
    if (!token) return;

    fetch(`${API_BASE_URL}/sessions/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.ok ? r.json() : null)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id, token, isAuthenticated, isLoading, router]);

  if (isLoading || loading) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-12 text-center">
        <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  if (!data) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-12 text-center">
        <p className="text-slate-500">Session not found.</p>
        <a href="/dashboard" className="text-primary-600 hover:underline mt-4 inline-block">
          Back to dashboard
        </a>
      </div>
    );
  }

  const { session, messages, evaluation } = data;

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <a href="/dashboard" className="text-sm text-slate-500 hover:text-slate-700">← Dashboard</a>
      <h1 className="text-2xl font-bold text-slate-800 mt-2 mb-1">{session.scenarioTitle}</h1>
      <p className="text-sm text-slate-500 mb-8">
        {new Date(session.startedAt).toLocaleString()}
        {session.durationSeconds && ` · ${Math.floor(session.durationSeconds / 60)} min`}
        {` · ${session.turnCount} turns`}
        {session.status === 'completed' && (
          <span className="ml-2 text-green-600 font-medium">Completed</span>
        )}
      </p>

      {/* Evaluation scores */}
      {evaluation && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Evaluation</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            {[
              ['Overall', evaluation.overallScore],
              ['Fluency', evaluation.fluencyScore],
              ['Pronunciation', evaluation.pronunciationScore],
              ['Grammar', evaluation.grammarAccuracy],
              ['Vocabulary', evaluation.vocabularyRichness],
            ].map(([label, score]) => (
              <div key={label} className="text-center bg-slate-50 rounded-lg p-3">
                <div className="text-2xl font-bold text-primary-700">{score}%</div>
                <div className="text-xs text-slate-500">{label}</div>
              </div>
            ))}
          </div>

          {evaluation.summary && (
            <p className="text-sm text-slate-600 mb-4">{evaluation.summary}</p>
          )}

          {evaluation.recommendations.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-slate-700 mb-2">Recommendations</h3>
              <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
                {evaluation.recommendations.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}

          {evaluation.grammarCorrections.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-slate-700 mb-2">
                Grammar Corrections ({evaluation.grammarCorrections.length})
              </h3>
              <div className="space-y-2">
                {evaluation.grammarCorrections.map((c) => (
                  <div key={c.id} className="text-sm bg-amber-50 border border-amber-100 rounded-lg p-3">
                    <span className="line-through text-red-500">{c.original}</span>
                    <span className="mx-2 text-slate-400">→</span>
                    <span className="text-green-600 font-medium">{c.corrected}</span>
                    <span className="ml-2 text-xs text-slate-400">[{c.category}]</span>
                    <p className="text-xs text-slate-500 mt-1">{c.explanation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {evaluation.pronunciationErrors.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-slate-700 mb-2">
                Pronunciation ({evaluation.pronunciationErrors.length} errors)
              </h3>
              <div className="space-y-2">
                {evaluation.pronunciationErrors.map((e, i) => (
                  <div key={i} className="text-sm bg-red-50 border border-red-100 rounded-lg p-3">
                    <span className="font-medium text-red-600">{e.word}</span>
                    <span className="mx-2 text-slate-400">score: {e.wordScore}%</span>
                    <span className="text-xs text-slate-400">[{e.errorType}]</span>
                    <p className="text-xs text-slate-500 mt-1">{e.suggestion}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {evaluation.vocabularyUsed.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-slate-700 mb-2">Vocabulary Used</h3>
              <div className="flex flex-wrap gap-2">
                {evaluation.vocabularyUsed.map((v) => (
                  <span
                    key={v.word}
                    className="text-xs bg-primary-50 text-primary-700 px-2 py-1 rounded-full"
                    title={v.definition}
                  >
                    {v.word}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Conversation transcript */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Conversation</h2>
        <div className="space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-xl px-4 py-3 text-sm ${
                  msg.role === 'user'
                    ? 'bg-primary-600 text-white'
                    : 'bg-slate-50 border border-slate-200 text-slate-700'
                }`}
              >
                <div className="text-[10px] uppercase tracking-wider opacity-50 mb-1">
                  {msg.role === 'user' ? 'You' : 'AI Tutor'}
                </div>
                {msg.content}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

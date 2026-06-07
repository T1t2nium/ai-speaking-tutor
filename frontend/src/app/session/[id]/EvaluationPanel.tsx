'use client';

import React from 'react';
import type { Evaluation } from '@tutor/shared';

interface EvaluationPanelProps {
  evaluation: Evaluation;
  onStartNew: () => void;
}

export function EvaluationPanel({ evaluation, onStartNew }: EvaluationPanelProps) {
  const isEmpty =
    evaluation.overallScore === 0 &&
    evaluation.pronunciationErrors.length === 0 &&
    evaluation.grammarCorrections.length === 0;

  if (isEmpty) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6 text-center">
        <p className="text-slate-500 mb-4">No conversation data to evaluate. Try a longer session.</p>
        <button
          onClick={onStartNew}
          className="bg-primary-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium
                     hover:bg-primary-700 transition-colors shadow-sm"
        >
          Start New Practice
        </button>
      </div>
    );
  }

  const hasErrors =
    evaluation.pronunciationErrors.length > 0 || evaluation.grammarCorrections.length > 0;

  return (
    <div className="bg-white border border-purple-200 rounded-xl p-6 mb-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-xl font-semibold text-slate-800">Session Summary</h2>
        {evaluation.summary && (
          <p className="text-sm text-slate-500 mt-1">{evaluation.summary}</p>
        )}
      </div>

      {/* Score gauges */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <ScoreGauge label="Overall" value={evaluation.overallScore} color="stroke-purple-500" />
        <ScoreGauge label="Fluency" value={evaluation.fluencyScore} color="stroke-blue-500" />
        <ScoreGauge label="Pronunciation" value={evaluation.pronunciationScore} color="stroke-green-500" />
        <ScoreGauge label="Grammar" value={evaluation.grammarAccuracy} color="stroke-amber-500" />
        <ScoreGauge label="Vocabulary" value={evaluation.vocabularyRichness} color="stroke-rose-500" />
      </div>

      {/* Error lists */}
      {hasErrors && (
        <div className="space-y-4">
          {evaluation.pronunciationErrors.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-2">
                Pronunciation Errors ({evaluation.pronunciationErrors.length})
              </h3>
              <div className="space-y-1.5">
                {evaluation.pronunciationErrors.map((err, i) => (
                  <div key={i} className="text-xs text-slate-600 bg-slate-50 rounded px-3 py-2">
                    <span className="font-medium text-slate-800">{err.word}</span>
                    <span className="text-slate-400 mx-1">-</span>
                    <span className="text-green-600">{err.suggestion}</span>
                    <span className="ml-2 text-slate-400">({err.wordScore})</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {evaluation.grammarCorrections.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-2">
                Grammar Corrections ({evaluation.grammarCorrections.length})
              </h3>
              <div className="space-y-1.5">
                {evaluation.grammarCorrections.map((c) => (
                  <div key={c.id} className="text-xs text-slate-600 bg-slate-50 rounded px-3 py-2">
                    <span className="line-through text-red-500">{c.original}</span>
                    <span className="text-slate-400 mx-1">→</span>
                    <span className="text-green-600 font-medium">{c.corrected}</span>
                    <span className="ml-2 text-[10px] uppercase tracking-wider text-slate-400">
                      {c.category}
                    </span>
                    <p className="text-slate-500 mt-0.5">{c.explanation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Vocabulary */}
      {evaluation.vocabularyUsed.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-2">
            Vocabulary Used ({evaluation.vocabularyUsed.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {evaluation.vocabularyUsed.map((v, i) => (
              <span
                key={i}
                className="text-xs bg-primary-50 text-primary-700 px-2 py-1 rounded-full"
                title={v.definition}
              >
                {v.word}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {evaluation.recommendations.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-2">Recommendations</h3>
          <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
            {evaluation.recommendations.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Action button */}
      <div className="text-center pt-2">
        <button
          onClick={onStartNew}
          className="bg-primary-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium
                     hover:bg-primary-700 transition-colors shadow-sm"
        >
          Start New Practice
        </button>
      </div>
    </div>
  );
}

function ScoreGauge({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  const radius = 14;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="text-center">
      <div className="relative w-16 h-16 mx-auto sm:w-20 sm:h-20">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
          <circle
            cx="18" cy="18" r={radius}
            fill="none"
            className="stroke-slate-200"
            strokeWidth="3"
          />
          <circle
            cx="18" cy="18" r={radius}
            fill="none"
            className={color}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.8s ease-in-out' }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-sm sm:text-base font-bold text-slate-700">
          {value}
        </span>
      </div>
      <p className="text-[10px] sm:text-xs text-slate-500 mt-1">{label}</p>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { API_BASE_URL } from '@/lib/constants';

interface SessionItem {
  id: string;
  scenarioTitle: string;
  status: string;
  startedAt: string;
  endedAt: string | null;
  turnCount: number;
  durationSeconds: number | null;
  overallScore: number | null;
}

interface ProgressData {
  sessionsCompleted: number;
  totalPracticeMinutes: number;
  scenariosPracticed: Array<{ slug: string; title: string; count: number; avgScore: number }>;
}

export default function DashboardPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const token = useAuthStore((s) => s.token);
  const router = useRouter();

  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      router.push('/login');
      return;
    }
    if (!token) return;

    Promise.all([
      fetch(`${API_BASE_URL}/sessions?limit=20`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.ok ? r.json() : null),
      fetch(`${API_BASE_URL}/user/progress`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.ok ? r.json() : null),
    ]).then(([sessionsData, progressData]) => {
      if (sessionsData) setSessions(sessionsData.sessions);
      if (progressData) setProgress(progressData);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [isAuthenticated, isLoading, token, router]);

  if (isLoading || loading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12 text-center">
        <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="text-2xl font-bold text-slate-800 mb-8">Dashboard</h1>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <StatCard label="Sessions Completed" value={progress?.sessionsCompleted ?? 0} />
        <StatCard label="Total Practice" value={`${progress?.totalPracticeMinutes ?? 0} min`} />
        <StatCard
          label="Avg Score"
          value={
            sessions.length > 0
              ? `${Math.round(sessions.reduce((s, r) => s + (r.overallScore || 0), 0) / sessions.filter((s) => s.overallScore).length || 0)}%`
              : '--'
          }
        />
      </div>

      {/* Recent sessions */}
      <h2 className="text-lg font-semibold text-slate-800 mb-4">Recent Sessions</h2>
      {sessions.length === 0 ? (
        <div className="bg-slate-50 rounded-lg border border-slate-200 p-8 text-center text-slate-500">
          <p>No sessions yet.</p>
          <a href="/" className="text-primary-600 hover:underline mt-2 inline-block">
            Start your first practice
          </a>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Scenario</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Turns</th>
                <th className="px-4 py-3 font-medium">Duration</th>
                <th className="px-4 py-3 font-medium">Score</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{s.scenarioTitle}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(s.startedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{s.turnCount}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {s.durationSeconds ? `${Math.floor(s.durationSeconds / 60)}m` : '--'}
                  </td>
                  <td className="px-4 py-3">
                    {s.overallScore != null ? (
                      <span className="inline-flex items-center gap-1">
                        <span className="text-sm font-medium text-slate-700">{s.overallScore}%</span>
                      </span>
                    ) : (
                      <span className="text-slate-400">--</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={`/dashboard/${s.id}`}
                      className="text-primary-600 hover:underline text-xs"
                    >
                      View
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Scenarios practiced */}
      {progress && progress.scenariosPracticed.length > 0 && (
        <>
          <h2 className="text-lg font-semibold text-slate-800 mb-4 mt-10">By Scenario</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {progress.scenariosPracticed.map((s) => (
              <div key={s.slug} className="bg-white rounded-lg border border-slate-200 p-4">
                <h3 className="font-medium text-slate-800">{s.title}</h3>
                <div className="text-sm text-slate-500 mt-1">
                  {s.count} session{s.count !== 1 ? 's' : ''} · Avg score: {Math.round(s.avgScore)}%
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6 text-center">
      <div className="text-3xl font-bold text-slate-800 mb-1">{value}</div>
      <div className="text-sm text-slate-500">{label}</div>
    </div>
  );
}

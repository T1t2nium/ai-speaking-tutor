import type { Metadata } from 'next';
import '../styles/globals.css';

export const metadata: Metadata = {
  title: 'AI Speaking Tutor',
  description: 'Practice English speaking with an AI tutor — real-time voice conversations, pronunciation feedback, and progress tracking.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <header className="border-b border-slate-200 px-6 py-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <a href="/" className="text-xl font-bold text-primary-700">
              AI Speaking Tutor
            </a>
            <nav className="flex items-center gap-4 text-sm text-slate-600">
              <a href="/dashboard" className="hover:text-slate-900">Dashboard</a>
              <a href="/history" className="hover:text-slate-900">History</a>
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}

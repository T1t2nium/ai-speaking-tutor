'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';

export function AuthNav() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const checkAuth = useAuthStore((s) => s.checkAuth);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isLoading) {
    return <div className="w-20 h-4 bg-slate-200 rounded animate-pulse" />;
  }

  if (isAuthenticated && user) {
    return (
      <nav className="flex items-center gap-4 text-sm text-slate-600">
        <a href="/dashboard" className="hover:text-slate-900">Dashboard</a>
        <span className="text-slate-400">{user.email}</span>
        <button
          onClick={logout}
          className="hover:text-red-500 transition-colors"
        >
          Logout
        </button>
      </nav>
    );
  }

  return (
    <nav className="flex items-center gap-4 text-sm text-slate-600">
      <a href="/login" className="hover:text-slate-900">Log In</a>
      <a href="/register" className="bg-primary-600 text-white px-3 py-1.5 rounded-lg hover:bg-primary-700 transition-colors">
        Sign Up
      </a>
    </nav>
  );
}

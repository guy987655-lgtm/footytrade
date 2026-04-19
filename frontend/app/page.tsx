'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TrendingUp, BarChart3, Trophy } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import api from '@/lib/api';

const features = [
  {
    icon: TrendingUp,
    title: 'Trade Players',
    description:
      'Buy and sell football players in real-time. Prices move based on real-world performance.',
  },
  {
    icon: BarChart3,
    title: 'Real Stats',
    description:
      'Player valuations powered by live match data, form, and market sentiment.',
  },
  {
    icon: Trophy,
    title: 'Compete',
    description:
      'Climb the leaderboard, earn credits, and prove you have the sharpest eye for talent.',
  },
];

export default function Home() {
  const router = useRouter();
  const { user, setAuth } = useAuthStore();
  const [demoLoading, setDemoLoading] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  const handleDemoLogin = async () => {
    setDemoLoading(true);
    try {
      const { data: tokenData } = await api.post('/auth/dev-login', {
        email: 'demo@footytrade.dev',
        name: 'Demo Trader',
      });
      const token = tokenData.access_token;
      const { data: userData } = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAuth(userData, token);
      router.push('/dashboard');
    } catch {
      alert('Demo login failed — is the backend running?');
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-[85vh] flex-col items-center justify-center overflow-hidden">
      {/* Animated gradient blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 animate-[blob_8s_infinite] rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -right-32 top-1/3 h-80 w-80 animate-[blob_10s_infinite_2s] rounded-full bg-accent/15 blur-3xl" />
        <div className="absolute -bottom-24 left-1/3 h-72 w-72 animate-[blob_12s_infinite_4s] rounded-full bg-primary/10 blur-3xl" />
      </div>

      {/* Hero */}
      <div className="relative z-10 flex max-w-3xl flex-col items-center gap-6 text-center">
        <span className="text-5xl">⚽</span>

        <h1 className="bg-gradient-to-r from-primary via-purple-400 to-accent bg-clip-text text-5xl font-extrabold leading-tight text-transparent md:text-6xl">
          Trade Football Players Like Stocks
        </h1>

        <p className="max-w-xl text-lg text-muted">
          Build your dream portfolio of football talent. Buy low, sell high, and
          compete against other traders — all powered by real match data.
        </p>

        {/* CTA */}
        <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row">
          {user ? (
            <Link
              href="/dashboard"
              className="rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
            >
              Go to Dashboard
            </Link>
          ) : (
            <>
              <a
                href={`${API_URL}/auth/google`}
                className="rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
              >
                Sign in with Google
              </a>
              <button
                onClick={handleDemoLogin}
                disabled={demoLoading}
                className="rounded-xl border border-border bg-card px-8 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-card-hover disabled:opacity-50"
              >
                {demoLoading ? 'Logging in…' : 'Quick Demo Login'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Feature cards */}
      <div className="relative z-10 mt-20 grid w-full max-w-4xl gap-6 px-4 sm:grid-cols-3">
        {features.map(({ icon: Icon, title, description }) => (
          <div
            key={title}
            className="rounded-xl border border-border bg-card p-6 transition-colors hover:bg-card-hover"
          >
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15">
              <Icon size={20} className="text-primary" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-foreground">
              {title}
            </h3>
            <p className="text-sm leading-relaxed text-muted">{description}</p>
          </div>
        ))}
      </div>

      {/* Footer */}
      <footer className="relative z-10 mt-20 pb-4 text-xs text-muted">
        FootyTrade &copy; 2026
      </footer>
    </div>
  );
}

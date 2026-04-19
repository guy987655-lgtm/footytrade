'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store';
import api from '@/lib/api';

function CallbackInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setError('No token found in the URL.');
      return;
    }

    (async () => {
      try {
        const { data: user } = await api.get('/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setAuth(user, token);
        router.replace('/dashboard');
      } catch {
        setError('Authentication failed. Please try again.');
      }
    })();
  }, [searchParams, setAuth, router]);

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-danger/15">
          <span className="text-2xl">✕</span>
        </div>
        <h2 className="text-xl font-semibold text-foreground">
          Something went wrong
        </h2>
        <p className="text-sm text-muted">{error}</p>
        <Link
          href="/"
          className="mt-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          Back to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-border border-t-primary" />
      <p className="text-sm text-muted">Signing you in…</p>
    </div>
  );
}

export default function AuthCallback() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-border border-t-primary" />
          <p className="text-sm text-muted">Loading…</p>
        </div>
      }
    >
      <CallbackInner />
    </Suspense>
  );
}

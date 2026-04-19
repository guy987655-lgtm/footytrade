'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function NotFound() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 text-center">
      <span className="text-6xl">⚽</span>
      <p className="text-muted">Redirecting to home...</p>
    </div>
  );
}

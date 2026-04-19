'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { getSocket, disconnectSocket } from '@/lib/socket';
import { useAuthStore, usePriceStore } from '@/lib/store';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

export default function Providers({ children }: { children: React.ReactNode }) {
  const hydrate = useAuthStore((s) => s.hydrate);
  const updatePrice = usePriceStore((s) => s.updatePrice);
  const initialized = useRef(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const socket = getSocket();

    socket.on('priceUpdate', (data: { playerId: string; price: number }) => {
      updatePrice(data.playerId, data.price);
    });

    return () => {
      disconnectSocket();
    };
  }, [updatePrice]);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ClipboardList,
  History,
  Loader2,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { formatPrice, cn } from '@/lib/utils';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';

type Tab = 'open' | 'history';

interface Order {
  id: string;
  playerId: string;
  playerName: string;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT';
  shares: number;
  price?: number;
  filledShares?: number;
  status: string;
  createdAt: string;
}

interface OrdersResponse {
  orders: Order[];
  total: number;
  page: number;
  limit: number;
}

interface TradeHistoryItem {
  id: string;
  playerId: string;
  playerName: string;
  side: 'BUY' | 'SELL';
  shares: number;
  pricePerShare: number;
  fee: number;
  total: number;
  createdAt: string;
}

interface TradeHistoryResponse {
  trades: TradeHistoryItem[];
  total: number;
  page: number;
  limit: number;
}

function SkeletonBar({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse rounded-md bg-surface', className)} />
  );
}

function TableSkeleton({ cols = 6 }: { cols?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: cols }, (__, j) => (
            <SkeletonBar key={j} className="h-10 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export default function OrdersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { token, hydrated } = useAuthStore();

  const [tab, setTab] = useState<Tab>('open');
  const [historyPage, setHistoryPage] = useState(1);
  const historyLimit = 20;

  useEffect(() => {
    if (hydrated && !token) router.replace('/');
  }, [hydrated, token, router]);

  const openOrders = useQuery<OrdersResponse>({
    queryKey: ['orders', 'open'],
    queryFn: () =>
      api.get('/orders/mine', { params: { status: 'PENDING' } }).then((r) => r.data),
    enabled: !!token,
  });

  const allOrders = useQuery<OrdersResponse>({
    queryKey: ['orders', 'all'],
    queryFn: () => api.get('/orders/mine').then((r) => r.data),
    enabled: !!token && tab === 'history',
  });

  const tradeHistory = useQuery<TradeHistoryResponse>({
    queryKey: ['trade-history', historyPage],
    queryFn: () =>
      api
        .get('/trading/history', {
          params: { page: historyPage, limit: historyLimit },
        })
        .then((r) => r.data),
    enabled: !!token && tab === 'history',
    placeholderData: (prev) => prev,
  });

  const cancelOrder = useMutation({
    mutationFn: (orderId: string) => api.delete(`/orders/${orderId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  if (!token) return null;

  const pending = openOrders.data?.orders ?? [];
  const trades = tradeHistory.data?.trades ?? [];
  const totalTrades = tradeHistory.data?.total ?? 0;
  const totalHistoryPages = Math.ceil(totalTrades / historyLimit) || 1;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-foreground">Orders</h1>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-surface p-1 self-start">
        <button
          onClick={() => setTab('open')}
          className={cn(
            'flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors',
            tab === 'open'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted hover:text-foreground',
          )}
        >
          <ClipboardList size={16} />
          Open Orders
          {pending.length > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/20 px-1.5 text-xs font-bold text-primary">
              {pending.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('history')}
          className={cn(
            'flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors',
            tab === 'history'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted hover:text-foreground',
          )}
        >
          <History size={16} />
          Order History
        </button>
      </div>

      {/* Open Orders */}
      {tab === 'open' && (
        <Card className="p-0">
          <div className="px-5 pt-5">
            <h2 className="text-lg font-semibold text-foreground">
              Pending Orders
            </h2>
          </div>

          {openOrders.isLoading ? (
            <div className="p-5">
              <TableSkeleton />
            </div>
          ) : pending.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <ClipboardList size={40} className="text-muted" />
              <p className="text-sm text-muted">No open orders</p>
            </div>
          ) : (
            <div className="overflow-x-auto px-2 pb-4 pt-3">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-wider text-muted">
                    <th className="px-3 pb-3 font-medium">Player</th>
                    <th className="px-3 pb-3 font-medium">Side</th>
                    <th className="px-3 pb-3 font-medium">Type</th>
                    <th className="px-3 pb-3 text-right font-medium">
                      Shares
                    </th>
                    <th className="px-3 pb-3 text-right font-medium">
                      Limit Price
                    </th>
                    <th className="px-3 pb-3 text-right font-medium">
                      Filled
                    </th>
                    <th className="px-3 pb-3 font-medium">Status</th>
                    <th className="px-3 pb-3 text-right font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {pending.map((order) => (
                    <tr
                      key={order.id}
                      className="border-b border-border/50 transition-colors hover:bg-card-hover"
                    >
                      <td className="px-3 py-3">
                        <Link
                          href={`/players/${order.playerId}`}
                          className="font-medium text-foreground hover:text-primary transition-colors"
                        >
                          {order.playerName}
                        </Link>
                      </td>
                      <td className="px-3 py-3">
                        <Badge
                          variant={order.side === 'BUY' ? 'accent' : 'danger'}
                        >
                          {order.side}
                        </Badge>
                      </td>
                      <td className="px-3 py-3">
                        <Badge variant="muted">{order.type}</Badge>
                      </td>
                      <td className="px-3 py-3 text-right font-medium text-foreground">
                        {order.shares}
                      </td>
                      <td className="px-3 py-3 text-right text-muted">
                        {order.price != null ? formatPrice(order.price) : '—'}
                      </td>
                      <td className="px-3 py-3 text-right text-muted">
                        {order.filledShares ?? 0} / {order.shares}
                      </td>
                      <td className="px-3 py-3">
                        <Badge variant="default">{order.status}</Badge>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="border border-border text-danger hover:bg-danger/10"
                          disabled={cancelOrder.isPending}
                          onClick={() => cancelOrder.mutate(order.id)}
                        >
                          {cancelOrder.isPending ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <X size={14} />
                          )}
                          Cancel
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* History */}
      {tab === 'history' && (
        <Card className="p-0">
          <div className="px-5 pt-5">
            <h2 className="text-lg font-semibold text-foreground">
              Trade History
            </h2>
          </div>

          {tradeHistory.isLoading ? (
            <div className="p-5">
              <TableSkeleton cols={7} />
            </div>
          ) : trades.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <History size={40} className="text-muted" />
              <p className="text-sm text-muted">No trade history yet</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto px-2 pb-2 pt-3">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs uppercase tracking-wider text-muted">
                      <th className="px-3 pb-3 font-medium">Date</th>
                      <th className="px-3 pb-3 font-medium">Player</th>
                      <th className="px-3 pb-3 font-medium">Side</th>
                      <th className="px-3 pb-3 text-right font-medium">
                        Shares
                      </th>
                      <th className="px-3 pb-3 text-right font-medium">
                        Price / Share
                      </th>
                      <th className="px-3 pb-3 text-right font-medium">Fee</th>
                      <th className="px-3 pb-3 text-right font-medium">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {trades.map((t) => (
                      <tr
                        key={t.id}
                        className="border-b border-border/50 transition-colors hover:bg-card-hover"
                      >
                        <td className="px-3 py-3 text-muted">
                          {new Date(t.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="px-3 py-3">
                          <Link
                            href={`/players/${t.playerId}`}
                            className="font-medium text-foreground hover:text-primary transition-colors"
                          >
                            {t.playerName}
                          </Link>
                        </td>
                        <td className="px-3 py-3">
                          <Badge
                            variant={t.side === 'BUY' ? 'accent' : 'danger'}
                          >
                            {t.side}
                          </Badge>
                        </td>
                        <td className="px-3 py-3 text-right font-medium text-foreground">
                          {t.shares}
                        </td>
                        <td className="px-3 py-3 text-right text-foreground">
                          {formatPrice(t.pricePerShare)}
                        </td>
                        <td className="px-3 py-3 text-right text-muted">
                          {formatPrice(t.fee)}
                        </td>
                        <td className="px-3 py-3 text-right font-medium">
                          <span
                            className={
                              t.side === 'BUY' ? 'text-danger' : 'text-accent'
                            }
                          >
                            {t.side === 'BUY' ? '-' : '+'}
                            {formatPrice(t.total)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-center gap-3 border-t border-border px-5 py-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className="border border-border"
                  disabled={historyPage <= 1}
                  onClick={() => setHistoryPage((p) => p - 1)}
                >
                  <ChevronLeft size={14} />
                  Previous
                </Button>
                <span className="text-sm text-muted">
                  Page {historyPage} of {totalHistoryPages}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="border border-border"
                  disabled={historyPage >= totalHistoryPages}
                  onClick={() => setHistoryPage((p) => p + 1)}
                >
                  Next
                  <ChevronRight size={14} />
                </Button>
              </div>
            </>
          )}
        </Card>
      )}
    </div>
  );
}

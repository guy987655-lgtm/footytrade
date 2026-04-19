'use client';

import { use, useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import {
  Star,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  ArrowLeftRight,
  TrendingUp,
  ChevronLeft,
} from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { usePriceStore, useAuthStore } from '@/lib/store';
import { getSocket } from '@/lib/socket';
import { formatPrice, formatPercent, cn } from '@/lib/utils';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface PricePoint {
  date: string;
  price: number;
}

interface PlayerStats {
  goals?: number;
  assists?: number;
  minutes?: number;
  keyPasses?: number;
  xG?: number;
  rating?: number;
}

interface Player {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  team: string;
  league: string;
  position: string;
  currentPrice: number;
  rating: number;
  change24h?: number;
  priceHistory?: PricePoint[];
  stats?: PlayerStats;
}

interface OrderLevel {
  price: number;
  shares: number;
}

interface OrderBook {
  bids: OrderLevel[];
  asks: OrderLevel[];
}

type Tab = 'chart' | 'stats' | 'orderbook';
type TimeRange = '7D' | '30D' | 'ALL';
type TradeMode = 'buy' | 'sell';
type OrderType = 'market' | 'limit';

const FEE_RATE = 0.015;

const POSITION_COLORS: Record<string, string> = {
  FW: 'bg-accent/20 text-accent',
  Forward: 'bg-accent/20 text-accent',
  MF: 'bg-primary/20 text-primary',
  Midfielder: 'bg-primary/20 text-primary',
  DF: 'bg-blue-500/20 text-blue-400',
  Defender: 'bg-blue-500/20 text-blue-400',
  GK: 'bg-orange-500/20 text-orange-400',
  Goalkeeper: 'bg-orange-500/20 text-orange-400',
};

function getInitials(firstName?: string, lastName?: string, name?: string): string {
  if (firstName && lastName) return `${firstName[0]}${lastName[0]}`.toUpperCase();
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  return '??';
}

function SkeletonBar({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-surface', className)} />;
}

export default function PlayerDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const prices = usePriceStore((s) => s.prices);
  const { token, user, updateCredits } = useAuthStore();

  const [activeTab, setActiveTab] = useState<Tab>('chart');
  const [timeRange, setTimeRange] = useState<TimeRange>('30D');
  const [tradeMode, setTradeMode] = useState<TradeMode>('buy');
  const [orderType, setOrderType] = useState<OrderType>('market');
  const [shares, setShares] = useState('');
  const [limitPrice, setLimitPrice] = useState('');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Subscribe to live price for this player
  useEffect(() => {
    const socket = getSocket();
    socket.emit('subscribePlayers', [id]);
    return () => {
      socket.emit('unsubscribePlayers', [id]);
    };
  }, [id]);

  // Auto-dismiss toasts
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const player = useQuery<Player>({
    queryKey: ['player', id],
    queryFn: () => api.get(`/players/${id}`).then((r) => r.data),
  });

  const orderBook = useQuery<OrderBook>({
    queryKey: ['orderbook', id],
    queryFn: () => api.get(`/orders/book/${id}`).then((r) => r.data),
    refetchInterval: 10_000,
  });

  const watchlistCheck = useQuery<boolean>({
    queryKey: ['watchlist-check', id],
    queryFn: () =>
      api.get('/users/watchlist').then((r) => {
        const list = r.data as { playerId: string }[];
        return list.some((w) => w.playerId === id);
      }),
    enabled: !!token,
  });

  const toggleWatchlist = useMutation({
    mutationFn: () => {
      if (watchlistCheck.data) return api.delete(`/users/watchlist/${id}`);
      return api.post(`/users/watchlist/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist-check', id] });
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
    },
  });

  const executeTrade = useMutation({
    mutationFn: (payload: { shares: number; limitPrice?: number }) => {
      if (orderType === 'limit') {
        return api.post('/orders/limit', {
          playerId: id,
          side: tradeMode,
          shares: payload.shares,
          price: payload.limitPrice,
        });
      }
      const endpoint = tradeMode === 'buy' ? '/trading/buy' : '/trading/sell';
      return api.post(endpoint, { playerId: id, shares: payload.shares });
    },
    onSuccess: (res) => {
      const msg = orderType === 'limit'
        ? `Limit ${tradeMode} order placed`
        : `${tradeMode === 'buy' ? 'Bought' : 'Sold'} ${shares} shares`;
      setToast({ type: 'success', message: msg });
      setShares('');
      setLimitPrice('');
      if (res.data?.credits != null) updateCredits(res.data.credits);
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['orderbook', id] });
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Trade failed. Please try again.';
      setToast({ type: 'error', message });
    },
  });

  const p = player.data;
  const livePrice = prices[id] ?? p?.currentPrice ?? 0;
  const change = p?.change24h ?? 0;
  const displayName = p?.name ?? (p ? `${p.firstName} ${p.lastName}` : '');
  const initials = p ? getInitials(p.firstName, p.lastName, p.name) : '??';
  const posColor = POSITION_COLORS[p?.position ?? ''] ?? 'bg-muted/20 text-muted';

  const sharesNum = parseFloat(shares) || 0;
  const limitPriceNum = parseFloat(limitPrice) || 0;
  const unitPrice = orderType === 'limit' ? limitPriceNum : livePrice;
  const subtotal = sharesNum * unitPrice;
  const fee = subtotal * FEE_RATE;
  const total = tradeMode === 'buy' ? subtotal + fee : subtotal - fee;

  const filteredHistory = useMemo(() => {
    if (!p?.priceHistory) return [];
    const now = Date.now();
    const cutoff =
      timeRange === '7D' ? now - 7 * 86_400_000 :
      timeRange === '30D' ? now - 30 * 86_400_000 :
      0;
    return p.priceHistory
      .filter((pt) => new Date(pt.date).getTime() >= cutoff)
      .map((pt) => ({
        ...pt,
        dateLabel: new Date(pt.date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
      }));
  }, [p?.priceHistory, timeRange]);

  const radarData = useMemo(() => {
    if (!p?.stats) return [];
    const s = p.stats;
    const maxValues: Record<string, number> = {
      Goals: 30, Assists: 20, Minutes: 3420, 'Key Passes': 80, xG: 25, Rating: 10,
    };
    return [
      { stat: 'Goals', value: s.goals ?? 0, norm: Math.min(((s.goals ?? 0) / maxValues.Goals) * 100, 100) },
      { stat: 'Assists', value: s.assists ?? 0, norm: Math.min(((s.assists ?? 0) / maxValues.Assists) * 100, 100) },
      { stat: 'Minutes', value: s.minutes ?? 0, norm: Math.min(((s.minutes ?? 0) / maxValues.Minutes) * 100, 100) },
      { stat: 'Key Passes', value: s.keyPasses ?? 0, norm: Math.min(((s.keyPasses ?? 0) / maxValues['Key Passes']) * 100, 100) },
      { stat: 'xG', value: s.xG ?? 0, norm: Math.min(((s.xG ?? 0) / maxValues.xG) * 100, 100) },
      { stat: 'Rating', value: s.rating ?? 0, norm: Math.min(((s.rating ?? 0) / maxValues.Rating) * 100, 100) },
    ];
  }, [p?.stats]);

  const handleTrade = useCallback(() => {
    if (sharesNum <= 0) return;
    executeTrade.mutate({
      shares: sharesNum,
      limitPrice: orderType === 'limit' ? limitPriceNum : undefined,
    });
  }, [sharesNum, limitPriceNum, orderType, executeTrade]);

  if (player.isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <SkeletonBar className="h-8 w-48" />
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 flex flex-col gap-4">
            <Card><SkeletonBar className="h-64 w-full" /></Card>
          </div>
          <Card><SkeletonBar className="h-64 w-full" /></Card>
        </div>
      </div>
    );
  }

  if (player.isError || !p) {
    return (
      <Card className="flex flex-col items-center gap-4 py-16 text-center">
        <p className="text-lg font-medium text-foreground">Player not found</p>
        <Link href="/market" className="text-sm text-primary hover:underline">
          Back to Market
        </Link>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Toast */}
      {toast && (
        <div
          className={cn(
            'fixed right-4 top-4 z-50 rounded-lg border px-4 py-3 text-sm font-medium shadow-lg transition-all',
            toast.type === 'success'
              ? 'border-accent/30 bg-accent/10 text-accent'
              : 'border-danger/30 bg-danger/10 text-danger',
          )}
        >
          {toast.message}
        </div>
      )}

      {/* Back link */}
      <Link
        href="/market"
        className="inline-flex w-fit items-center gap-1 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ChevronLeft size={16} />
        Back to Market
      </Link>

      {/* Header section */}
      <Card className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className={cn('flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-lg font-bold ring-2 ring-border', posColor)}>
            {initials}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-foreground sm:text-2xl">
                {displayName}
              </h1>
              <Badge variant="muted">{p.position}</Badge>
            </div>
            <p className="text-sm text-muted">
              {p.team} · {p.league}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 sm:flex-col sm:items-end">
          <div className="text-right">
            <p className="text-2xl font-bold text-foreground">
              {formatPrice(livePrice)}
            </p>
            <div className="flex items-center justify-end gap-1">
              {change >= 0 ? (
                <ArrowUpRight size={14} className="text-accent" />
              ) : (
                <ArrowDownRight size={14} className="text-danger" />
              )}
              <span className={cn('text-sm font-medium', change >= 0 ? 'text-accent' : 'text-danger')}>
                {formatPercent(change)}
              </span>
              <span className="text-xs text-muted">24h</span>
            </div>
          </div>
          {token && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleWatchlist.mutate()}
              disabled={toggleWatchlist.isPending}
              className="border border-border"
            >
              <Star
                size={16}
                className={watchlistCheck.data ? 'fill-primary text-primary' : 'text-muted'}
              />
              {watchlistCheck.data ? 'Watching' : 'Watch'}
            </Button>
          )}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Tabs */}
        <div className="flex flex-col gap-4 lg:col-span-2">
          {/* Tab buttons */}
          <div className="flex gap-1 rounded-lg bg-surface p-1">
            {(['chart', 'stats', 'orderbook'] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  activeTab === tab
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted hover:text-foreground',
                )}
              >
                {tab === 'chart' && 'Chart'}
                {tab === 'stats' && 'Stats'}
                {tab === 'orderbook' && 'Order Book'}
              </button>
            ))}
          </div>

          {/* Tab: Chart */}
          {activeTab === 'chart' && (
            <Card className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">Price History</h2>
                <div className="flex gap-1">
                  {(['7D', '30D', 'ALL'] as TimeRange[]).map((range) => (
                    <button
                      key={range}
                      onClick={() => setTimeRange(range)}
                      className={cn(
                        'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                        timeRange === range
                          ? 'bg-primary text-white'
                          : 'text-muted hover:bg-card-hover hover:text-foreground',
                      )}
                    >
                      {range}
                    </button>
                  ))}
                </div>
              </div>

              {filteredHistory.length > 0 ? (
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={filteredHistory}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" vertical={false} />
                      <XAxis
                        dataKey="dateLabel"
                        tick={{ fill: '#6b7280', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        domain={['auto', 'auto']}
                        tick={{ fill: '#6b7280', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v: number) => formatPrice(v)}
                        width={60}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#12121e',
                          border: '1px solid #2a2a3e',
                          borderRadius: '0.5rem',
                          color: '#e4e4ef',
                          fontSize: 13,
                        }}
                        formatter={(value) => [formatPrice(Number(value ?? 0)), 'Price']}
                      />
                      <Line
                        type="monotone"
                        dataKey="price"
                        stroke="#8b5cf6"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, fill: '#8b5cf6', stroke: '#0a0a12', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex h-72 items-center justify-center text-sm text-muted">
                  No price history available
                </div>
              )}
            </Card>
          )}

          {/* Tab: Stats */}
          {activeTab === 'stats' && (
            <Card className="flex flex-col gap-6">
              {radarData.length > 0 ? (
                <>
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                        <PolarGrid stroke="#2a2a3e" />
                        <PolarAngleAxis
                          dataKey="stat"
                          tick={{ fill: '#6b7280', fontSize: 11 }}
                        />
                        <PolarRadiusAxis
                          angle={90}
                          domain={[0, 100]}
                          tick={false}
                          axisLine={false}
                        />
                        <Radar
                          dataKey="norm"
                          stroke="#8b5cf6"
                          fill="#8b5cf6"
                          fillOpacity={0.2}
                          strokeWidth={2}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                    {radarData.map((d) => (
                      <div key={d.stat} className="flex flex-col items-center rounded-lg bg-surface p-3">
                        <span className="text-[11px] font-medium uppercase tracking-wider text-muted">
                          {d.stat}
                        </span>
                        <span className="mt-1 text-lg font-bold text-foreground">
                          {typeof d.value === 'number' && d.stat === 'Rating'
                            ? d.value.toFixed(1)
                            : typeof d.value === 'number' && d.stat === 'xG'
                              ? d.value.toFixed(1)
                              : d.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex h-72 items-center justify-center text-sm text-muted">
                  No stats available for this player
                </div>
              )}
            </Card>
          )}

          {/* Tab: Order Book */}
          {activeTab === 'orderbook' && (
            <Card>
              <div className="mb-4 flex items-center gap-2">
                <ArrowLeftRight size={16} className="text-primary" />
                <h2 className="text-sm font-semibold text-foreground">Order Book</h2>
              </div>

              {orderBook.isLoading ? (
                <div className="flex flex-col gap-2">
                  {Array.from({ length: 5 }, (_, i) => (
                    <SkeletonBar key={i} className="h-8 w-full" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {/* Bids */}
                  <div>
                    <div className="mb-2 flex items-center justify-between text-[11px] font-medium uppercase tracking-wider text-muted">
                      <span>Bids</span>
                      <span>Shares</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      {(orderBook.data?.bids ?? []).length > 0 ? (
                        (orderBook.data?.bids ?? []).map((level, i) => (
                          <div
                            key={i}
                            className="relative flex items-center justify-between rounded px-2.5 py-1.5 text-sm"
                          >
                            <div
                              className="absolute inset-y-0 left-0 rounded bg-accent/10"
                              style={{
                                width: `${Math.min(
                                  (level.shares / Math.max(...(orderBook.data?.bids ?? []).map((b) => b.shares), 1)) * 100,
                                  100,
                                )}%`,
                              }}
                            />
                            <span className="relative font-medium text-accent">
                              {formatPrice(level.price)}
                            </span>
                            <span className="relative text-muted">
                              {level.shares.toLocaleString()}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="py-4 text-center text-xs text-muted">No bids</p>
                      )}
                    </div>
                  </div>

                  {/* Asks */}
                  <div>
                    <div className="mb-2 flex items-center justify-between text-[11px] font-medium uppercase tracking-wider text-muted">
                      <span>Asks</span>
                      <span>Shares</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      {(orderBook.data?.asks ?? []).length > 0 ? (
                        (orderBook.data?.asks ?? []).map((level, i) => (
                          <div
                            key={i}
                            className="relative flex items-center justify-between rounded px-2.5 py-1.5 text-sm"
                          >
                            <div
                              className="absolute inset-y-0 right-0 rounded bg-danger/10"
                              style={{
                                width: `${Math.min(
                                  (level.shares / Math.max(...(orderBook.data?.asks ?? []).map((a) => a.shares), 1)) * 100,
                                  100,
                                )}%`,
                              }}
                            />
                            <span className="relative font-medium text-danger">
                              {formatPrice(level.price)}
                            </span>
                            <span className="relative text-muted">
                              {level.shares.toLocaleString()}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="py-4 text-center text-xs text-muted">No asks</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </Card>
          )}
        </div>

        {/* Right: Trade panel */}
        <div className="flex flex-col gap-4">
          <Card className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Trade</h2>
            </div>

            {/* Buy / Sell toggle */}
            <div className="flex gap-1 rounded-lg bg-surface p-1">
              <button
                onClick={() => setTradeMode('buy')}
                className={cn(
                  'flex-1 rounded-md py-2 text-sm font-semibold transition-colors',
                  tradeMode === 'buy'
                    ? 'bg-accent text-white shadow-sm'
                    : 'text-muted hover:text-foreground',
                )}
              >
                Buy
              </button>
              <button
                onClick={() => setTradeMode('sell')}
                className={cn(
                  'flex-1 rounded-md py-2 text-sm font-semibold transition-colors',
                  tradeMode === 'sell'
                    ? 'bg-danger text-white shadow-sm'
                    : 'text-muted hover:text-foreground',
                )}
              >
                Sell
              </button>
            </div>

            {/* Order type toggle */}
            <div className="flex gap-1 rounded-lg bg-surface p-1">
              <button
                onClick={() => setOrderType('market')}
                className={cn(
                  'flex-1 rounded-md py-1.5 text-xs font-medium transition-colors',
                  orderType === 'market'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted hover:text-foreground',
                )}
              >
                Market
              </button>
              <button
                onClick={() => setOrderType('limit')}
                className={cn(
                  'flex-1 rounded-md py-1.5 text-xs font-medium transition-colors',
                  orderType === 'limit'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted hover:text-foreground',
                )}
              >
                Limit
              </button>
            </div>

            {/* Price display / limit input */}
            {orderType === 'market' ? (
              <div className="rounded-lg bg-surface px-3 py-2.5">
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted">
                  Market Price
                </p>
                <p className="mt-0.5 text-lg font-bold text-foreground">
                  {formatPrice(livePrice)}
                </p>
              </div>
            ) : (
              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted">
                  Limit Price
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={limitPrice}
                  onChange={(e) => setLimitPrice(e.target.value)}
                />
              </div>
            )}

            {/* Shares input */}
            <div>
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted">
                Shares
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0"
                value={shares}
                onChange={(e) => setShares(e.target.value)}
              />
            </div>

            {/* Cost breakdown */}
            {sharesNum > 0 && unitPrice > 0 && (
              <div className="flex flex-col gap-2 rounded-lg bg-surface px-3 py-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted">
                    {tradeMode === 'buy' ? 'Est. Cost' : 'Est. Proceeds'}
                  </span>
                  <span className="text-foreground">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Fee (1.5%)</span>
                  <span className="text-muted">{formatPrice(fee)}</span>
                </div>
                <div className="border-t border-border pt-2">
                  <div className="flex justify-between font-semibold">
                    <span className="text-foreground">Total</span>
                    <span className={tradeMode === 'buy' ? 'text-accent' : 'text-danger'}>
                      {formatPrice(total)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Balance reminder */}
            {user && (
              <p className="text-xs text-muted">
                Balance: <span className="font-medium text-foreground">{formatPrice(user.credits)}</span>
              </p>
            )}

            {/* Execute button */}
            <Button
              variant={tradeMode === 'buy' ? 'accent' : 'danger'}
              size="lg"
              className="w-full"
              disabled={
                !token ||
                sharesNum <= 0 ||
                (orderType === 'limit' && limitPriceNum <= 0) ||
                executeTrade.isPending
              }
              onClick={handleTrade}
            >
              {executeTrade.isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : null}
              {orderType === 'limit'
                ? `Place Limit ${tradeMode === 'buy' ? 'Buy' : 'Sell'}`
                : `${tradeMode === 'buy' ? 'Buy' : 'Sell'} ${sharesNum > 0 ? shares : ''} Shares`}
            </Button>

            {!token && (
              <p className="text-center text-xs text-muted">
                <Link href="/" className="text-primary hover:underline">
                  Log in
                </Link>{' '}
                to trade
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

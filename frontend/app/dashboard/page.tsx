'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Star,
  Crown,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { formatCredits, formatPrice, formatPercent, cn } from '@/lib/utils';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';

interface WalletData {
  credits: number;
  portfolioValue: number;
}

interface PortfolioPoint {
  date: string;
  value: number;
}

interface WatchlistItem {
  playerId: string;
  name: string;
  team: string;
  currentPrice: number;
  change24h: number;
}

interface Mover {
  id: string;
  name: string;
  price: number;
  change: number;
}

interface MoversData {
  gainers: Mover[];
  losers: Mover[];
}

interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  totalValue: number;
}

const MOCK_CHART_DATA: PortfolioPoint[] = Array.from({ length: 30 }, (_, i) => ({
  date: new Date(Date.now() - (29 - i) * 86400000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  }),
  value: 10000 + Math.random() * 2000 + i * 150,
}));

function SkeletonBar({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-surface',
        className,
      )}
    />
  );
}

function StatCardSkeleton() {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <SkeletonBar className="h-4 w-20" />
        <SkeletonBar className="h-8 w-8 rounded-lg" />
      </div>
      <SkeletonBar className="mt-3 h-8 w-32" />
      <SkeletonBar className="mt-2 h-3 w-16" />
    </Card>
  );
}

function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3">
          <SkeletonBar className="h-10 w-10 rounded-full" />
          <div className="flex flex-1 flex-col gap-1.5">
            <SkeletonBar className="h-4 w-28" />
            <SkeletonBar className="h-3 w-16" />
          </div>
          <SkeletonBar className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, token, hydrated } = useAuthStore();

  useEffect(() => {
    if (hydrated && !token) router.replace('/');
  }, [hydrated, token, router]);

  const wallet = useQuery<WalletData>({
    queryKey: ['wallet'],
    queryFn: () => api.get('/users/wallet').then((r) => r.data),
    enabled: !!token,
  });

  const portfolio = useQuery<PortfolioPoint[]>({
    queryKey: ['portfolio-history'],
    queryFn: () => api.get('/users/portfolio').then((r) => r.data),
    enabled: !!token,
  });

  const watchlist = useQuery<WatchlistItem[]>({
    queryKey: ['watchlist'],
    queryFn: () => api.get('/users/watchlist').then((r) => r.data),
    enabled: !!token,
  });

  const movers = useQuery<MoversData>({
    queryKey: ['movers'],
    queryFn: () => api.get('/players/movers').then((r) => r.data),
    enabled: !!token,
  });

  const leaderboard = useQuery<LeaderboardEntry[]>({
    queryKey: ['leaderboard'],
    queryFn: () => api.get('/users/leaderboard').then((r) => r.data),
    enabled: !!token,
  });

  const removeWatchlist = useMutation({
    mutationFn: (playerId: string) =>
      api.delete(`/users/watchlist/${playerId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['watchlist'] }),
  });

  if (!token) return null;

  const credits = user?.credits ?? 0;
  const portfolioValue = wallet.data?.portfolioValue ?? 0;
  const totalValue = credits + portfolioValue;

  const chartData =
    portfolio.data && portfolio.data.length > 0
      ? portfolio.data.map((p) => ({
          ...p,
          date: new Date(p.date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          }),
        }))
      : MOCK_CHART_DATA;

  const chartMin = Math.min(...chartData.map((d) => d.value));
  const chartMax = Math.max(...chartData.map((d) => d.value));
  const chartGain = chartData.length > 1
    ? chartData[chartData.length - 1].value - chartData[0].value
    : 0;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>

      {/* Row 1 — Wallet Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {wallet.isLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <Card>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted">Credits</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15">
                  <Wallet size={18} className="text-primary" />
                </div>
              </div>
              <p className="mt-2 text-2xl font-bold text-foreground">
                {formatCredits(credits)}
              </p>
              <p className="mt-1 text-xs text-muted">Available balance</p>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted">
                  Portfolio Value
                </span>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/15">
                  <TrendingUp size={18} className="text-accent" />
                </div>
              </div>
              <p className="mt-2 text-2xl font-bold text-foreground">
                {formatPrice(portfolioValue)}
              </p>
              <p className="mt-1 text-xs text-muted">Current holdings</p>
            </Card>

            <Card className="sm:col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted">
                  Total Value
                </span>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15">
                  <DollarSign size={18} className="text-primary" />
                </div>
              </div>
              <p className="mt-2 text-2xl font-bold text-foreground">
                {formatPrice(totalValue)}
              </p>
              <div className="mt-1 flex items-center gap-1.5">
                {chartGain >= 0 ? (
                  <ArrowUpRight size={14} className="text-accent" />
                ) : (
                  <ArrowDownRight size={14} className="text-danger" />
                )}
                <span
                  className={cn(
                    'text-xs font-medium',
                    chartGain >= 0 ? 'text-accent' : 'text-danger',
                  )}
                >
                  {formatPrice(Math.abs(chartGain))} this period
                </span>
              </div>
            </Card>
          </>
        )}
      </div>

      {/* Row 2 — Portfolio Chart */}
      <Card className="p-0">
        <div className="flex items-center justify-between px-5 pt-5">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Portfolio Performance
            </h2>
            <p className="text-xs text-muted">Value over the last 30 days</p>
          </div>
          <Badge variant={chartGain >= 0 ? 'accent' : 'danger'}>
            {chartGain >= 0 ? '+' : ''}
            {formatPrice(chartGain)}
          </Badge>
        </div>

        <div className="h-72 w-full px-2 pb-2 pt-4">
          {portfolio.isLoading ? (
            <div className="flex h-full items-center justify-center">
              <SkeletonBar className="h-48 w-full rounded-xl" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#2a2a3e"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[chartMin * 0.98, chartMax * 1.02]}
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => formatCredits(v)}
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
                  formatter={(value) => [formatPrice(Number(value ?? 0)), 'Value']}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={chartGain >= 0 ? '#22c55e' : '#ef4444'}
                  strokeWidth={2}
                  fill="url(#portfolioGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      {/* Row 3 — Watchlist + Top Movers */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Watchlist */}
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-foreground">
            Watchlist
          </h2>

          {watchlist.isLoading ? (
            <ListSkeleton />
          ) : !watchlist.data || watchlist.data.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <Star size={32} className="text-muted" />
              <p className="text-sm text-muted">Your watchlist is empty</p>
              <Link
                href="/market"
                className="text-sm font-medium text-primary hover:underline"
              >
                Add players from the Market
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {watchlist.data.map((item) => (
                <Link
                  key={item.playerId}
                  href={`/players/${item.playerId}`}
                  className="group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-card-hover"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-xs font-bold text-primary">
                    {item.name.charAt(0)}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="truncate text-sm font-medium text-foreground">
                      {item.name}
                    </p>
                    <p className="text-xs text-muted">{item.team}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-foreground">
                      {formatPrice(item.currentPrice)}
                    </p>
                    <p
                      className={cn(
                        'text-xs font-medium',
                        item.change24h >= 0 ? 'text-accent' : 'text-danger',
                      )}
                    >
                      {formatPercent(item.change24h)}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      removeWatchlist.mutate(item.playerId);
                    }}
                    className="ml-1 rounded p-1 text-muted opacity-0 transition-all hover:bg-danger/15 hover:text-danger group-hover:opacity-100"
                    aria-label="Remove from watchlist"
                  >
                    <Star size={14} fill="currentColor" />
                  </button>
                </Link>
              ))}
            </div>
          )}
        </Card>

        {/* Top Movers */}
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-foreground">
            Top Movers
          </h2>

          {movers.isLoading ? (
            <ListSkeleton />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Gainers */}
              <div>
                <div className="mb-2 flex items-center gap-1.5">
                  <TrendingUp size={14} className="text-accent" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-accent">
                    Gainers
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  {(movers.data?.gainers ?? []).slice(0, 5).map((m) => (
                    <Link
                      key={m.id}
                      href={`/players/${m.id}`}
                      className="flex items-center justify-between rounded-lg px-2 py-2 transition-colors hover:bg-card-hover"
                    >
                      <span className="truncate text-sm text-foreground">
                        {m.name}
                      </span>
                      <div className="flex items-center gap-2 text-right">
                        <span className="text-xs text-muted">
                          {formatPrice(m.price)}
                        </span>
                        <Badge variant="accent">
                          {formatPercent(m.change)}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                  {(!movers.data?.gainers || movers.data.gainers.length === 0) && (
                    <p className="py-3 text-center text-xs text-muted">
                      No gainers yet
                    </p>
                  )}
                </div>
              </div>

              {/* Losers */}
              <div>
                <div className="mb-2 flex items-center gap-1.5">
                  <TrendingDown size={14} className="text-danger" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-danger">
                    Losers
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  {(movers.data?.losers ?? []).slice(0, 5).map((m) => (
                    <Link
                      key={m.id}
                      href={`/players/${m.id}`}
                      className="flex items-center justify-between rounded-lg px-2 py-2 transition-colors hover:bg-card-hover"
                    >
                      <span className="truncate text-sm text-foreground">
                        {m.name}
                      </span>
                      <div className="flex items-center gap-2 text-right">
                        <span className="text-xs text-muted">
                          {formatPrice(m.price)}
                        </span>
                        <Badge variant="danger">
                          {formatPercent(m.change)}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                  {(!movers.data?.losers || movers.data.losers.length === 0) && (
                    <p className="py-3 text-center text-xs text-muted">
                      No losers yet
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Row 4 — Leaderboard */}
      <Card>
        <div className="mb-4 flex items-center gap-2">
          <Crown size={20} className="text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Leaderboard</h2>
        </div>

        {leaderboard.isLoading ? (
          <ListSkeleton rows={10} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wider text-muted">
                  <th className="pb-3 pr-4 font-medium">Rank</th>
                  <th className="pb-3 pr-4 font-medium">Trader</th>
                  <th className="pb-3 text-right font-medium">Total Value</th>
                </tr>
              </thead>
              <tbody>
                {(leaderboard.data ?? []).slice(0, 10).map((entry) => {
                  const isCurrentUser = entry.userId === user?.id;
                  return (
                    <tr
                      key={entry.userId}
                      className={cn(
                        'border-b border-border/50 transition-colors',
                        isCurrentUser
                          ? 'bg-primary/10'
                          : 'hover:bg-card-hover',
                      )}
                    >
                      <td className="py-3 pr-4">
                        {entry.rank <= 3 ? (
                          <span
                            className={cn(
                              'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold',
                              entry.rank === 1 && 'bg-yellow-500/20 text-yellow-400',
                              entry.rank === 2 && 'bg-gray-300/20 text-gray-300',
                              entry.rank === 3 && 'bg-orange-500/20 text-orange-400',
                            )}
                          >
                            {entry.rank}
                          </span>
                        ) : (
                          <span className="pl-1.5 text-muted">{entry.rank}</span>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={cn(
                            'font-medium',
                            isCurrentUser ? 'text-primary' : 'text-foreground',
                          )}
                        >
                          {entry.name}
                          {isCurrentUser && (
                            <span className="ml-2 text-xs text-muted">(you)</span>
                          )}
                        </span>
                      </td>
                      <td className="py-3 text-right font-medium text-foreground">
                        {formatPrice(entry.totalValue)}
                      </td>
                    </tr>
                  );
                })}
                {(!leaderboard.data || leaderboard.data.length === 0) && (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-muted">
                      No leaderboard data yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  ShoppingCart,
} from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { formatPrice, formatPercent, cn } from '@/lib/utils';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';

interface Holding {
  playerId: string;
  playerName: string;
  team: string;
  shares: number;
  avgBuyPrice: number;
  currentPrice: number;
}

interface PortfolioData {
  holdings: Holding[];
  totalValue: number;
  totalCost: number;
}

function SkeletonBar({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse rounded-md bg-surface', className)} />
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

function TableSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 5 }, (_, i) => (
        <SkeletonBar key={i} className="h-14 w-full" />
      ))}
    </div>
  );
}

export default function PortfolioPage() {
  const router = useRouter();
  const { token, hydrated } = useAuthStore();

  useEffect(() => {
    if (hydrated && !token) router.replace('/');
  }, [hydrated, token, router]);

  const { data, isLoading } = useQuery<PortfolioData>({
    queryKey: ['portfolio'],
    queryFn: () => api.get('/users/portfolio').then((r) => r.data),
    enabled: !!token,
  });

  if (!token) return null;

  const holdings = data?.holdings ?? [];
  const totalValue = holdings.reduce(
    (sum, h) => sum + h.shares * h.currentPrice,
    0,
  );
  const totalCost = holdings.reduce(
    (sum, h) => sum + h.shares * h.avgBuyPrice,
    0,
  );
  const totalPnl = totalValue - totalCost;
  const totalPnlPct = totalCost > 0 ? totalPnl / totalCost : 0;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-foreground">Portfolio</h1>

      {/* Summary row */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted">
                Total Value
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15">
                <Wallet size={18} className="text-primary" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground">
              {formatPrice(totalValue)}
            </p>
            <p className="mt-1 text-xs text-muted">
              {holdings.length} holding{holdings.length !== 1 && 's'}
            </p>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted">Total P&L</span>
              <div
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-lg',
                  totalPnl >= 0 ? 'bg-accent/15' : 'bg-danger/15',
                )}
              >
                {totalPnl >= 0 ? (
                  <TrendingUp size={18} className="text-accent" />
                ) : (
                  <TrendingDown size={18} className="text-danger" />
                )}
              </div>
            </div>
            <p
              className={cn(
                'mt-2 text-2xl font-bold',
                totalPnl >= 0 ? 'text-accent' : 'text-danger',
              )}
            >
              {totalPnl >= 0 ? '+' : ''}
              {formatPrice(totalPnl)}
            </p>
            <p className="mt-1 text-xs text-muted">Unrealized</p>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted">
                Total P&L %
              </span>
              <div
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-lg',
                  totalPnlPct >= 0 ? 'bg-accent/15' : 'bg-danger/15',
                )}
              >
                {totalPnlPct >= 0 ? (
                  <ArrowUpRight size={18} className="text-accent" />
                ) : (
                  <ArrowDownRight size={18} className="text-danger" />
                )}
              </div>
            </div>
            <p
              className={cn(
                'mt-2 text-2xl font-bold',
                totalPnlPct >= 0 ? 'text-accent' : 'text-danger',
              )}
            >
              {formatPercent(totalPnlPct)}
            </p>
            <p className="mt-1 text-xs text-muted">Overall return</p>
          </Card>
        </div>
      )}

      {/* Holdings table */}
      <Card className="p-0">
        <div className="px-5 pt-5">
          <h2 className="text-lg font-semibold text-foreground">Holdings</h2>
        </div>

        {isLoading ? (
          <div className="p-5">
            <TableSkeleton />
          </div>
        ) : holdings.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <ShoppingCart size={40} className="text-muted" />
            <div>
              <p className="text-lg font-medium text-foreground">
                Your portfolio is empty
              </p>
              <p className="mt-1 text-sm text-muted">
                Visit the Market to start trading.
              </p>
            </div>
            <Link href="/market">
              <Button variant="primary" size="md">
                Go to Market
              </Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto px-2 pb-4 pt-3">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wider text-muted">
                  <th className="px-3 pb-3 font-medium">Player</th>
                  <th className="px-3 pb-3 text-right font-medium">Shares</th>
                  <th className="px-3 pb-3 text-right font-medium">
                    Avg Buy
                  </th>
                  <th className="px-3 pb-3 text-right font-medium">
                    Current
                  </th>
                  <th className="px-3 pb-3 text-right font-medium">Value</th>
                  <th className="px-3 pb-3 text-right font-medium">P&L</th>
                  <th className="px-3 pb-3 text-right font-medium">P&L %</th>
                  <th className="px-3 pb-3 text-right font-medium" />
                </tr>
              </thead>
              <tbody>
                {holdings.map((h) => {
                  const value = h.shares * h.currentPrice;
                  const cost = h.shares * h.avgBuyPrice;
                  const pnl = value - cost;
                  const pnlPct = cost > 0 ? pnl / cost : 0;
                  const positive = pnl >= 0;

                  return (
                    <tr
                      key={h.playerId}
                      className="border-b border-border/50 transition-colors hover:bg-card-hover"
                    >
                      <td className="px-3 py-3">
                        <Link
                          href={`/players/${h.playerId}`}
                          className="group flex items-center gap-2"
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                            {h.playerName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-foreground transition-colors group-hover:text-primary">
                              {h.playerName}
                            </p>
                            <p className="text-xs text-muted">{h.team}</p>
                          </div>
                        </Link>
                      </td>
                      <td className="px-3 py-3 text-right font-medium text-foreground">
                        {h.shares}
                      </td>
                      <td className="px-3 py-3 text-right text-muted">
                        {formatPrice(h.avgBuyPrice)}
                      </td>
                      <td className="px-3 py-3 text-right text-foreground">
                        {formatPrice(h.currentPrice)}
                      </td>
                      <td className="px-3 py-3 text-right font-medium text-foreground">
                        {formatPrice(value)}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span
                          className={cn(
                            'font-medium',
                            positive ? 'text-accent' : 'text-danger',
                          )}
                        >
                          {positive ? '+' : ''}
                          {formatPrice(pnl)}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Badge variant={positive ? 'accent' : 'danger'}>
                          {formatPercent(pnlPct)}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() =>
                            router.push(
                              `/players/${h.playerId}?intent=sell`,
                            )
                          }
                        >
                          Sell
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Search, SlidersHorizontal, ChevronDown, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { usePriceStore } from '@/lib/store';
import { formatPrice, cn } from '@/lib/utils';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface Player {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  team: string;
  league: string;
  position: string;
  currentPrice: number;
  footyRating: number;
  change24h?: number;
  priceHistory?: { date: string; price: number }[];
}

interface PlayersResponse {
  data: Player[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

type Position = 'All' | 'Forward' | 'Midfielder' | 'Defender' | 'Goalkeeper';
type SortField = 'price_desc' | 'price_asc' | 'rating_desc' | 'rating_asc' | 'name';

const POSITIONS: Position[] = ['All', 'Forward', 'Midfielder', 'Defender', 'Goalkeeper'];
const LEAGUES = ['All', 'Premier League', 'La Liga', 'Bundesliga', 'Ligue 1', 'Serie A'];
const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: 'price_desc', label: 'Price: High → Low' },
  { value: 'price_asc', label: 'Price: Low → High' },
  { value: 'rating_desc', label: 'Rating: High → Low' },
  { value: 'rating_asc', label: 'Rating: Low → High' },
  { value: 'name', label: 'Name' },
];

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

const POSITION_RING_COLORS: Record<string, string> = {
  FW: 'ring-accent/40',
  Forward: 'ring-accent/40',
  MF: 'ring-primary/40',
  Midfielder: 'ring-primary/40',
  DF: 'ring-blue-400/40',
  Defender: 'ring-blue-400/40',
  GK: 'ring-orange-400/40',
  Goalkeeper: 'ring-orange-400/40',
};

function getInitials(firstName?: string, lastName?: string, name?: string): string {
  if (firstName && lastName) {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  }
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  return '??';
}

function PlayerCardSkeleton() {
  return (
    <Card className="animate-pulse">
      <div className="flex items-start gap-3">
        <div className="h-12 w-12 rounded-full bg-surface" />
        <div className="flex-1">
          <div className="h-4 w-28 rounded bg-surface" />
          <div className="mt-1.5 h-3 w-20 rounded bg-surface" />
        </div>
      </div>
      <div className="mt-4 flex items-end justify-between">
        <div className="h-6 w-20 rounded bg-surface" />
        <div className="h-5 w-14 rounded bg-surface" />
      </div>
    </Card>
  );
}

function DropdownSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[] | { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted">
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-lg border border-border bg-surface px-3 py-2 pr-8 text-sm text-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {options.map((opt) => {
            const val = typeof opt === 'string' ? opt : opt.value;
            const lbl = typeof opt === 'string' ? opt : opt.label;
            return (
              <option key={val} value={val}>
                {lbl}
              </option>
            );
          })}
        </select>
        <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted" />
      </div>
    </div>
  );
}

export default function MarketPage() {
  const router = useRouter();
  const prices = usePriceStore((s) => s.prices);

  const [search, setSearch] = useState('');
  const [position, setPosition] = useState<Position>('All');
  const [league, setLeague] = useState('All');
  const [sort, setSort] = useState<SortField>('price_desc');
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const limit = 24;

  const queryParams = useMemo(() => {
    const p: Record<string, string | number> = { page, limit };
    if (search.trim()) p.search = search.trim();
    if (position !== 'All') p.position = position;
    if (league !== 'All') p.league = league;
    const sortMap: Record<SortField, { sortBy: string; order: string }> = {
      price_desc: { sortBy: 'price', order: 'desc' },
      price_asc: { sortBy: 'price', order: 'asc' },
      rating_desc: { sortBy: 'rating', order: 'desc' },
      rating_asc: { sortBy: 'rating', order: 'asc' },
      name: { sortBy: 'name', order: 'asc' },
    };
    const { sortBy, order } = sortMap[sort];
    p.sortBy = sortBy;
    p.order = order;
    return p;
  }, [search, position, league, sort, page]);

  const { data, isLoading, isFetching } = useQuery<PlayersResponse>({
    queryKey: ['players', queryParams],
    queryFn: () =>
      api.get('/players', { params: queryParams }).then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  const players = data?.data ?? [];
  const total = data?.meta?.total ?? 0;
  const hasMore = page * limit < total;

  function handleFilterChange(setter: (v: never) => void, value: string) {
    setter(value as never);
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-foreground">Market</h1>
        <p className="text-sm text-muted">
          Browse and trade football players
          {total > 0 && (
            <span className="ml-1.5 text-foreground/60">
              · {total} player{total !== 1 && 's'}
            </span>
          )}
        </p>
      </div>

      {/* Search + filter toggle */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search players by name..."
            className="pl-9"
          />
        </div>
        <Button
          variant="ghost"
          onClick={() => setShowFilters(!showFilters)}
          className="shrink-0 border border-border"
        >
          <SlidersHorizontal size={16} />
          <span className="hidden sm:inline">Filters</span>
        </Button>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <Card className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted">
              Position
            </label>
            <div className="flex flex-wrap gap-1.5">
              {POSITIONS.map((pos) => (
                <button
                  key={pos}
                  onClick={() => handleFilterChange(setPosition as never, pos)}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                    position === pos
                      ? 'bg-primary text-white'
                      : 'bg-surface text-muted hover:bg-card-hover hover:text-foreground',
                  )}
                >
                  {pos}
                </button>
              ))}
            </div>
          </div>

          <DropdownSelect
            label="League"
            value={league}
            options={LEAGUES}
            onChange={(v) => handleFilterChange(setLeague as never, v)}
          />

          <DropdownSelect
            label="Sort by"
            value={sort}
            options={SORT_OPTIONS}
            onChange={(v) => handleFilterChange(setSort as never, v)}
          />
        </Card>
      )}

      {/* Active filter badges */}
      {(position !== 'All' || league !== 'All' || search.trim()) && (
        <div className="flex flex-wrap items-center gap-2">
          {search.trim() && (
            <Badge variant="default">
              &ldquo;{search.trim()}&rdquo;
              <button onClick={() => { setSearch(''); setPage(1); }} className="ml-1 opacity-60 hover:opacity-100">×</button>
            </Badge>
          )}
          {position !== 'All' && (
            <Badge variant="default">
              {position}
              <button onClick={() => { setPosition('All'); setPage(1); }} className="ml-1 opacity-60 hover:opacity-100">×</button>
            </Badge>
          )}
          {league !== 'All' && (
            <Badge variant="default">
              {league}
              <button onClick={() => { setLeague('All'); setPage(1); }} className="ml-1 opacity-60 hover:opacity-100">×</button>
            </Badge>
          )}
          <button
            onClick={() => { setSearch(''); setPosition('All'); setLeague('All'); setSort('price_desc'); setPage(1); }}
            className="text-xs text-muted hover:text-foreground"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Player grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <PlayerCardSkeleton key={i} />
          ))}
        </div>
      ) : players.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 py-16 text-center">
          <Search size={40} className="text-muted" />
          <p className="text-lg font-medium text-foreground">No players found</p>
          <p className="text-sm text-muted">
            Try adjusting your search or filters
          </p>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {players.map((player) => {
              const livePrice = prices[player.id] ?? player.currentPrice;
              const initials = getInitials(player.firstName, player.lastName, player.name);
              const posColor = POSITION_COLORS[player.position] ?? 'bg-muted/20 text-muted';
              const ringColor = POSITION_RING_COLORS[player.position] ?? 'ring-muted/40';
              const change = player.change24h ?? 0;

              return (
                <Card
                  key={player.id}
                  className="group cursor-pointer transition-all hover:border-primary/30 hover:bg-card-hover"
                  onClick={() => router.push(`/players/${player.id}`)}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        'flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold ring-2',
                        posColor,
                        ringColor,
                      )}
                    >
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                        {player.name ?? `${player.firstName} ${player.lastName}`}
                      </p>
                      <p className="truncate text-xs text-muted">
                        {player.team}
                      </p>
                      <p className="text-[11px] text-muted/70">{player.league}</p>
                    </div>
                    <Badge variant="muted" className="shrink-0 text-[10px]">
                      {player.position}
                    </Badge>
                  </div>

                  <div className="mt-4 flex items-end justify-between">
                    <div>
                      <p className="text-lg font-bold text-foreground">
                        {formatPrice(livePrice)}
                      </p>
                      {change !== 0 && (
                        <div className="flex items-center gap-1">
                          {change > 0 ? (
                            <TrendingUp size={12} className="text-accent" />
                          ) : (
                            <TrendingDown size={12} className="text-danger" />
                          )}
                          <span
                            className={cn(
                              'text-xs font-medium',
                              change > 0 ? 'text-accent' : 'text-danger',
                            )}
                          >
                            {change > 0 ? '+' : ''}{(change * 100).toFixed(2)}%
                          </span>
                        </div>
                      )}
                    </div>
                    {player.footyRating > 0 && (
                      <Badge variant="default" className="text-xs">
                        ★ {player.footyRating.toFixed(1)}
                      </Badge>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-center gap-3 pt-2">
            {page > 1 && (
              <Button variant="ghost" size="sm" onClick={() => setPage((p) => p - 1)} className="border border-border">
                Previous
              </Button>
            )}
            <span className="text-sm text-muted">
              Page {page} of {Math.ceil(total / limit) || 1}
            </span>
            {hasMore && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={isFetching}
              >
                {isFetching ? <Loader2 size={14} className="animate-spin" /> : null}
                Load More
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

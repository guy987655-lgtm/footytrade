'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShieldAlert,
  Activity,
  Flame,
  Users,
  ClipboardList,
  TrendingDown,
  TrendingUp,
  Settings,
  Save,
  Loader2,
  Droplets,
  ChevronDown,
} from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { formatCredits, formatPrice, cn } from '@/lib/utils';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface HealthData {
  totalCreditsInCirculation: number;
  totalPortfolioValue: number;
  totalBurnedFees: number;
  activeUsers7d: number;
  pendingOrders: number;
  inflationRate: number;
}

interface AdminSetting {
  key: string;
  value: string;
  description?: string;
}

interface Player {
  id: string;
  name: string;
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
        <SkeletonBar className="h-4 w-24" />
        <SkeletonBar className="h-8 w-8 rounded-lg" />
      </div>
      <SkeletonBar className="mt-3 h-8 w-32" />
    </Card>
  );
}

const SLIDER_CONFIG: Record<string, { min: number; max: number; step: number; format: (v: number) => string }> = {
  FEE_PERCENT: { min: 0, max: 10, step: 0.1, format: (v) => `${v}%` },
  DEMAND_MULTIPLIER: { min: 0.1, max: 5.0, step: 0.1, format: (v) => `${v.toFixed(1)}x` },
  MARKET_MAKER_SPREAD: { min: 0, max: 0.1, step: 0.005, format: (v) => v.toFixed(3) },
};

const TOGGLE_KEYS = new Set(['MARKET_MAKER_ENABLED']);

export default function AdminPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { token, user, hydrated } = useAuthStore();

  const [settingsState, setSettingsState] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [liquidityPlayer, setLiquidityPlayer] = useState('');
  const [liquidityShares, setLiquidityShares] = useState('');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (hydrated && !token) router.replace('/');
  }, [hydrated, token, router]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const health = useQuery<HealthData>({
    queryKey: ['admin', 'health'],
    queryFn: () => api.get('/admin/health').then((r) => r.data),
    enabled: !!token && user?.role === 'ADMIN',
  });

  const settings = useQuery<AdminSetting[]>({
    queryKey: ['admin', 'settings'],
    queryFn: () => api.get('/admin/settings').then((r) => r.data),
    enabled: !!token && user?.role === 'ADMIN',
  });

  const players = useQuery<{ players: Player[] }>({
    queryKey: ['players-list'],
    queryFn: () => api.get('/players', { params: { limit: 200 } }).then((r) => r.data),
    enabled: !!token && user?.role === 'ADMIN',
  });

  useEffect(() => {
    if (settings.data) {
      const map: Record<string, string> = {};
      settings.data.forEach((s) => {
        map[s.key] = s.value;
      });
      setSettingsState(map);
    }
  }, [settings.data]);

  const updateSetting = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      api.put(`/admin/settings/${key}`, { value }),
    onSuccess: (_, variables) => {
      setSavingKey(null);
      setToast({ type: 'success', message: `Updated ${variables.key}` });
      queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] });
    },
    onError: (err: unknown) => {
      setSavingKey(null);
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Failed to update setting';
      setToast({ type: 'error', message });
    },
  });

  const injectLiquidity = useMutation({
    mutationFn: (payload: { playerId: string; shares: number }) =>
      api.post('/admin/liquidity/inject', payload),
    onSuccess: () => {
      setToast({ type: 'success', message: 'Liquidity injected' });
      setLiquidityShares('');
      queryClient.invalidateQueries({ queryKey: ['admin', 'health'] });
    },
    onError: () => setToast({ type: 'error', message: 'Injection failed' }),
  });

  const removeLiquidity = useMutation({
    mutationFn: (payload: { playerId: string; shares: number }) =>
      api.post('/admin/liquidity/remove', payload),
    onSuccess: () => {
      setToast({ type: 'success', message: 'Liquidity removed' });
      setLiquidityShares('');
      queryClient.invalidateQueries({ queryKey: ['admin', 'health'] });
    },
    onError: () => setToast({ type: 'error', message: 'Removal failed' }),
  });

  if (!token) return null;

  if (user?.role !== 'ADMIN') {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <ShieldAlert size={48} className="text-danger" />
        <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
        <p className="text-sm text-muted">
          You do not have permission to view this page.
        </p>
        <Button variant="primary" onClick={() => router.push('/dashboard')}>
          Go to Dashboard
        </Button>
      </div>
    );
  }

  const h = health.data;
  const inflationPositive = (h?.inflationRate ?? 0) > 0;

  function handleSave(key: string) {
    setSavingKey(key);
    updateSetting.mutate({ key, value: settingsState[key] ?? '' });
  }

  function handleLiquidity(action: 'inject' | 'remove') {
    const shares = parseFloat(liquidityShares);
    if (!liquidityPlayer || !shares || shares <= 0) return;
    const payload = { playerId: liquidityPlayer, shares };
    if (action === 'inject') injectLiquidity.mutate(payload);
    else removeLiquidity.mutate(payload);
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

      <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>

      {/* System Health */}
      <div>
        <div className="mb-4 flex items-center gap-2">
          <Activity size={18} className="text-primary" />
          <h2 className="text-lg font-semibold text-foreground">
            System Health
          </h2>
        </div>

        {health.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted">
                  Credits in Circulation
                </span>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15">
                  <Activity size={18} className="text-primary" />
                </div>
              </div>
              <p className="mt-2 text-2xl font-bold text-foreground">
                {formatCredits(h?.totalCreditsInCirculation ?? 0)}
              </p>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted">
                  Total Portfolio Value
                </span>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/15">
                  <TrendingUp size={18} className="text-accent" />
                </div>
              </div>
              <p className="mt-2 text-2xl font-bold text-foreground">
                {formatPrice(h?.totalPortfolioValue ?? 0)}
              </p>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted">
                  Total Burned Fees
                </span>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-danger/15">
                  <Flame size={18} className="text-danger" />
                </div>
              </div>
              <p className="mt-2 text-2xl font-bold text-foreground">
                {formatPrice(h?.totalBurnedFees ?? 0)}
              </p>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted">
                  Active Users (7d)
                </span>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15">
                  <Users size={18} className="text-primary" />
                </div>
              </div>
              <p className="mt-2 text-2xl font-bold text-foreground">
                {h?.activeUsers7d?.toLocaleString() ?? 0}
              </p>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted">
                  Pending Orders
                </span>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15">
                  <ClipboardList size={18} className="text-primary" />
                </div>
              </div>
              <p className="mt-2 text-2xl font-bold text-foreground">
                {h?.pendingOrders?.toLocaleString() ?? 0}
              </p>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted">
                  Inflation Rate
                </span>
                <div
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-lg',
                    inflationPositive ? 'bg-danger/15' : 'bg-accent/15',
                  )}
                >
                  {inflationPositive ? (
                    <TrendingUp size={18} className="text-danger" />
                  ) : (
                    <TrendingDown size={18} className="text-accent" />
                  )}
                </div>
              </div>
              <p
                className={cn(
                  'mt-2 text-2xl font-bold',
                  inflationPositive ? 'text-danger' : 'text-accent',
                )}
              >
                {inflationPositive ? '+' : ''}
                {((h?.inflationRate ?? 0) * 100).toFixed(2)}%
              </p>
              <p className="mt-1 text-xs text-muted">
                {inflationPositive ? 'Inflationary' : 'Deflationary'}
              </p>
            </Card>
          </div>
        )}
      </div>

      {/* Settings */}
      <Card>
        <div className="mb-6 flex items-center gap-2">
          <Settings size={18} className="text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Settings</h2>
        </div>

        {settings.isLoading ? (
          <div className="flex flex-col gap-4">
            {Array.from({ length: 4 }, (_, i) => (
              <SkeletonBar key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {(settings.data ?? []).map((setting) => {
              const slider = SLIDER_CONFIG[setting.key];
              const isToggle = TOGGLE_KEYS.has(setting.key);
              const currentValue = settingsState[setting.key] ?? setting.value;
              const isSaving = savingKey === setting.key;

              if (isToggle) {
                const enabled = currentValue === 'true' || currentValue === '1';
                return (
                  <div
                    key={setting.key}
                    className="flex items-center justify-between rounded-lg bg-surface px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {setting.key.replace(/_/g, ' ')}
                      </p>
                      {setting.description && (
                        <p className="text-xs text-muted">
                          {setting.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          const next = enabled ? 'false' : 'true';
                          setSettingsState((s) => ({
                            ...s,
                            [setting.key]: next,
                          }));
                        }}
                        className={cn(
                          'relative h-7 w-12 rounded-full transition-colors',
                          enabled ? 'bg-accent' : 'bg-border',
                        )}
                      >
                        <span
                          className={cn(
                            'absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform',
                            enabled ? 'translate-x-5' : 'translate-x-0.5',
                          )}
                        />
                      </button>
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={isSaving}
                        onClick={() => handleSave(setting.key)}
                      >
                        {isSaving ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Save size={14} />
                        )}
                        Save
                      </Button>
                    </div>
                  </div>
                );
              }

              if (slider) {
                const numVal = parseFloat(currentValue) || 0;
                return (
                  <div
                    key={setting.key}
                    className="rounded-lg bg-surface px-4 py-3"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {setting.key.replace(/_/g, ' ')}
                        </p>
                        {setting.description && (
                          <p className="text-xs text-muted">
                            {setting.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-primary">
                          {slider.format(numVal)}
                        </span>
                        <Button
                          variant="primary"
                          size="sm"
                          disabled={isSaving}
                          onClick={() => handleSave(setting.key)}
                        >
                          {isSaving ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Save size={14} />
                          )}
                          Save
                        </Button>
                      </div>
                    </div>
                    <input
                      type="range"
                      min={slider.min}
                      max={slider.max}
                      step={slider.step}
                      value={numVal}
                      onChange={(e) =>
                        setSettingsState((s) => ({
                          ...s,
                          [setting.key]: e.target.value,
                        }))
                      }
                      className="w-full accent-primary"
                    />
                    <div className="mt-1 flex justify-between text-[11px] text-muted">
                      <span>{slider.format(slider.min)}</span>
                      <span>{slider.format(slider.max)}</span>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={setting.key}
                  className="flex items-center gap-3 rounded-lg bg-surface px-4 py-3"
                >
                  <div className="flex-1">
                    <p className="mb-1 text-sm font-medium text-foreground">
                      {setting.key.replace(/_/g, ' ')}
                    </p>
                    {setting.description && (
                      <p className="mb-2 text-xs text-muted">
                        {setting.description}
                      </p>
                    )}
                    <Input
                      value={currentValue}
                      onChange={(e) =>
                        setSettingsState((s) => ({
                          ...s,
                          [setting.key]: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={isSaving}
                    onClick={() => handleSave(setting.key)}
                    className="shrink-0 self-end"
                  >
                    {isSaving ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Save size={14} />
                    )}
                    Save
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Liquidity Management */}
      <Card>
        <div className="mb-6 flex items-center gap-2">
          <Droplets size={18} className="text-primary" />
          <h2 className="text-lg font-semibold text-foreground">
            Liquidity Management
          </h2>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted">
              Select Player
            </label>
            <div className="relative">
              <select
                value={liquidityPlayer}
                onChange={(e) => setLiquidityPlayer(e.target.value)}
                className="w-full appearance-none rounded-lg border border-border bg-surface px-3 py-2 pr-8 text-sm text-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Choose a player...</option>
                {(players.data?.players ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted">
              Shares Amount
            </label>
            <Input
              type="number"
              min="0"
              step="1"
              placeholder="0"
              value={liquidityShares}
              onChange={(e) => setLiquidityShares(e.target.value)}
            />
          </div>

          <div className="flex gap-3">
            <Button
              variant="accent"
              size="md"
              className="flex-1"
              disabled={
                !liquidityPlayer ||
                !liquidityShares ||
                parseFloat(liquidityShares) <= 0 ||
                injectLiquidity.isPending
              }
              onClick={() => handleLiquidity('inject')}
            >
              {injectLiquidity.isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Droplets size={16} />
              )}
              Inject
            </Button>
            <Button
              variant="danger"
              size="md"
              className="flex-1"
              disabled={
                !liquidityPlayer ||
                !liquidityShares ||
                parseFloat(liquidityShares) <= 0 ||
                removeLiquidity.isPending
              }
              onClick={() => handleLiquidity('remove')}
            >
              {removeLiquidity.isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Droplets size={16} />
              )}
              Remove
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

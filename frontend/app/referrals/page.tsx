'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  Link2,
  Copy,
  Check,
  Gift,
  Clock,
  UserPlus,
} from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

interface ReferredUser {
  id: string;
  name: string;
  signupDate: string;
  tradesCompleted: number;
  status: 'PENDING' | 'AWARDED' | 'EXPIRED';
}

interface ReferralData {
  referralCode: string;
  totalInvites: number;
  successful: number;
  pending: number;
  referredUsers: ReferredUser[];
}

function SkeletonBar({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse rounded-md bg-surface', className)} />
  );
}

const REQUIRED_TRADES = 5;

const STATUS_BADGE: Record<string, { variant: 'accent' | 'default' | 'danger'; label: string }> = {
  PENDING: { variant: 'default', label: 'Pending' },
  AWARDED: { variant: 'accent', label: 'Awarded' },
  EXPIRED: { variant: 'danger', label: 'Expired' },
};

export default function ReferralsPage() {
  const router = useRouter();
  const { token, user, hydrated } = useAuthStore();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (hydrated && !token) router.replace('/');
  }, [hydrated, token, router]);

  const { data, isLoading } = useQuery<ReferralData>({
    queryKey: ['referrals'],
    queryFn: () => api.get('/referrals').then((r) => r.data),
    enabled: !!token,
  });

  if (!token) return null;

  const referralCode = data?.referralCode ?? user?.referralCode ?? '';
  const referralLink = referralCode
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback?ref=${referralCode}`
    : '';

  function handleCopy() {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const totalInvites = data?.totalInvites ?? 0;
  const successful = data?.successful ?? 0;
  const pending = data?.pending ?? 0;
  const referredUsers = data?.referredUsers ?? [];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-foreground">Referrals</h1>

      {/* Referral link */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Link2 size={18} className="text-primary" />
          <h2 className="text-lg font-semibold text-foreground">
            Your Referral Link
          </h2>
        </div>

        {isLoading ? (
          <SkeletonBar className="h-10 w-full" />
        ) : (
          <div className="flex gap-2">
            <Input
              value={referralLink}
              readOnly
              className="font-mono text-xs"
            />
            <Button
              variant={copied ? 'accent' : 'primary'}
              size="md"
              onClick={handleCopy}
              className="shrink-0"
            >
              {copied ? (
                <>
                  <Check size={16} />
                  Copied
                </>
              ) : (
                <>
                  <Copy size={16} />
                  Copy
                </>
              )}
            </Button>
          </div>
        )}

        <p className="mt-3 text-xs text-muted">
          Share this link with friends. You both earn bonus credits when they
          complete {REQUIRED_TRADES} trades!
        </p>
      </Card>

      {/* Stats */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Card key={i}>
              <SkeletonBar className="h-4 w-20" />
              <SkeletonBar className="mt-3 h-8 w-16" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted">
                Total Invites
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15">
                <UserPlus size={18} className="text-primary" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground">
              {totalInvites}
            </p>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted">
                Successful
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/15">
                <Gift size={18} className="text-accent" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-accent">{successful}</p>
            <p className="mt-1 text-xs text-muted">Credits awarded</p>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted">Pending</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15">
                <Clock size={18} className="text-primary" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground">
              {pending}
            </p>
            <p className="mt-1 text-xs text-muted">Awaiting trades</p>
          </Card>
        </div>
      )}

      {/* Referred users table */}
      <Card className="p-0">
        <div className="flex items-center gap-2 px-5 pt-5">
          <Users size={18} className="text-primary" />
          <h2 className="text-lg font-semibold text-foreground">
            Referred Users
          </h2>
        </div>

        {isLoading ? (
          <div className="p-5">
            <div className="flex flex-col gap-3">
              {Array.from({ length: 4 }, (_, i) => (
                <SkeletonBar key={i} className="h-14 w-full" />
              ))}
            </div>
          </div>
        ) : referredUsers.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Users size={40} className="text-muted" />
            <p className="text-sm text-muted">
              No referrals yet. Share your link to get started!
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto px-2 pb-4 pt-3">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wider text-muted">
                  <th className="px-3 pb-3 font-medium">Name</th>
                  <th className="px-3 pb-3 font-medium">Signup Date</th>
                  <th className="px-3 pb-3 font-medium">Trades Progress</th>
                  <th className="px-3 pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {referredUsers.map((u) => {
                  const badge = STATUS_BADGE[u.status] ?? STATUS_BADGE.PENDING;
                  const progress = Math.min(
                    u.tradesCompleted / REQUIRED_TRADES,
                    1,
                  );

                  return (
                    <tr
                      key={u.id}
                      className="border-b border-border/50 transition-colors hover:bg-card-hover"
                    >
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                            {u.name.charAt(0)}
                          </div>
                          <span className="font-medium text-foreground">
                            {u.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-muted">
                        {new Date(u.signupDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-2 w-24 overflow-hidden rounded-full bg-surface">
                            <div
                              className={cn(
                                'h-full rounded-full transition-all',
                                progress >= 1 ? 'bg-accent' : 'bg-primary',
                              )}
                              style={{ width: `${progress * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted">
                            {u.tradesCompleted}/{REQUIRED_TRADES}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <Badge variant={badge.variant}>{badge.label}</Badge>
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

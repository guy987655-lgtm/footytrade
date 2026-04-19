import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getWallet(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        portfolio: { include: { player: { select: { currentPrice: true } } } },
      },
    });

    if (!user) throw new NotFoundException('User not found');

    const portfolioValue = user.portfolio.reduce(
      (sum, item) => sum + item.shares * item.player.currentPrice,
      0,
    );

    return {
      credits: user.credits,
      portfolioValue: Math.round(portfolioValue * 100) / 100,
      totalValue: Math.round((user.credits + portfolioValue) * 100) / 100,
    };
  }

  async getPortfolio(userId: string) {
    const items = await this.prisma.portfolioItem.findMany({
      where: { userId },
      include: {
        player: {
          select: {
            id: true,
            name: true,
            team: true,
            photoUrl: true,
            currentPrice: true,
            footyRating: true,
          },
        },
      },
    });

    return items.map((item) => {
      const currentValue = item.shares * item.player.currentPrice;
      const costBasis = item.shares * item.avgBuyPrice;
      const pnl = currentValue - costBasis;
      const pnlPercent = costBasis > 0 ? (pnl / costBasis) * 100 : 0;

      return {
        playerId: item.playerId,
        player: item.player,
        shares: item.shares,
        avgBuyPrice: item.avgBuyPrice,
        currentValue: Math.round(currentValue * 100) / 100,
        pnl: Math.round(pnl * 100) / 100,
        pnlPercent: Math.round(pnlPercent * 100) / 100,
      };
    });
  }

  async addToWatchlist(userId: string, playerId: string) {
    await this.prisma.player.findUniqueOrThrow({ where: { id: playerId } });

    return this.prisma.watchlistItem.upsert({
      where: { userId_playerId: { userId, playerId } },
      create: { userId, playerId },
      update: {},
    });
  }

  async removeFromWatchlist(userId: string, playerId: string) {
    await this.prisma.watchlistItem.deleteMany({
      where: { userId, playerId },
    });
    return { removed: true };
  }

  async getWatchlist(userId: string) {
    const items = await this.prisma.watchlistItem.findMany({
      where: { userId },
      include: {
        player: {
          select: {
            id: true,
            name: true,
            team: true,
            position: true,
            photoUrl: true,
            currentPrice: true,
            footyRating: true,
          },
        },
      },
    });

    return items.map((item) => item.player);
  }

  async getLeaderboard(limit = 20) {
    const users = await this.prisma.user.findMany({
      include: {
        portfolio: {
          include: { player: { select: { currentPrice: true } } },
        },
      },
    });

    const ranked = users
      .map((u) => {
        const portfolioValue = u.portfolio.reduce(
          (sum, item) => sum + item.shares * item.player.currentPrice,
          0,
        );
        return {
          id: u.id,
          name: u.name,
          totalValue: Math.round((u.credits + portfolioValue) * 100) / 100,
        };
      })
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, limit);

    return ranked.map((u, i) => ({
      rank: i + 1,
      name: u.name,
      totalValue: u.totalValue,
    }));
  }

  async getFriendsLeaderboard(userId: string, limit = 20) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, referredById: true },
    });
    if (!user) throw new NotFoundException('User not found');

    // Collect the referral chain: users you referred + user who referred you
    const friendIds = new Set<string>();
    friendIds.add(userId);

    const myReferrals = await this.prisma.user.findMany({
      where: { referredById: userId },
      select: { id: true },
    });
    myReferrals.forEach((r) => friendIds.add(r.id));

    if (user.referredById) {
      friendIds.add(user.referredById);
      const theirReferrals = await this.prisma.user.findMany({
        where: { referredById: user.referredById },
        select: { id: true },
      });
      theirReferrals.forEach((r) => friendIds.add(r.id));
    }

    const friends = await this.prisma.user.findMany({
      where: { id: { in: [...friendIds] } },
      include: {
        portfolio: {
          include: { player: { select: { currentPrice: true } } },
        },
      },
    });

    const ranked = friends
      .map((u) => {
        const portfolioValue = u.portfolio.reduce(
          (sum, item) => sum + item.shares * item.player.currentPrice,
          0,
        );
        return {
          id: u.id,
          name: u.name,
          totalValue: Math.round((u.credits + portfolioValue) * 100) / 100,
        };
      })
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, limit);

    return ranked.map((u, i) => ({
      rank: i + 1,
      name: u.name,
      totalValue: u.totalValue,
    }));
  }
}

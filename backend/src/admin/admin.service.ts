import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { RedisService } from '../common/redis.service';

const INITIAL_CREDITS_PER_USER = 10000;

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async getSystemHealth() {
    const [
      creditAgg,
      portfolioItems,
      feeAgg,
      activeUserCount,
      pendingOrders,
      userCount,
    ] = await Promise.all([
      this.prisma.user.aggregate({ _sum: { credits: true } }),
      this.prisma.portfolioItem.findMany({
        include: { player: { select: { currentPrice: true } } },
      }),
      this.prisma.transaction.aggregate({ _sum: { fee: true } }),
      this.prisma.transaction
        .findMany({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
          distinct: ['userId'],
          select: { userId: true },
        })
        .then((rows) => rows.length),
      this.prisma.order.count({ where: { status: 'PENDING' } }),
      this.prisma.user.count(),
    ]);

    const totalCreditsInCirculation = creditAgg._sum.credits ?? 0;
    const totalPortfolioValue = portfolioItems.reduce(
      (sum, item) => sum + item.shares * item.player.currentPrice,
      0,
    );
    const totalBurnedFees = feeAgg._sum.fee ?? 0;
    const initialCreditsIssued = userCount * INITIAL_CREDITS_PER_USER;
    const inflationRate =
      initialCreditsIssued > 0
        ? (totalCreditsInCirculation - initialCreditsIssued) /
          initialCreditsIssued
        : 0;

    return {
      totalCreditsInCirculation:
        Math.round(totalCreditsInCirculation * 100) / 100,
      totalPortfolioValue: Math.round(totalPortfolioValue * 100) / 100,
      totalBurnedFees: Math.round(totalBurnedFees * 100) / 100,
      activeUsers: activeUserCount,
      pendingOrders,
      userCount,
      inflationRate: Math.round(inflationRate * 10000) / 10000,
    };
  }

  async getSettings() {
    return this.prisma.adminSetting.findMany();
  }

  async updateSetting(key: string, value: string) {
    const setting = await this.prisma.adminSetting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });

    await this.redis.del(`admin_setting:${key}`);
    this.logger.log(`Admin setting "${key}" updated to "${value}"`);

    return setting;
  }

  async injectLiquidity(playerId: string, shares: number) {
    const bot = await this.getBotUser();

    await this.prisma.player.findUniqueOrThrow({
      where: { id: playerId },
    });

    const item = await this.prisma.portfolioItem.upsert({
      where: { userId_playerId: { userId: bot.id, playerId } },
      create: {
        userId: bot.id,
        playerId,
        shares,
        avgBuyPrice: 0,
      },
      update: { shares: { increment: shares } },
    });

    this.logger.log(
      `Injected ${shares} shares of player ${playerId} to bot. New total: ${item.shares}`,
    );

    return item;
  }

  async removeLiquidity(playerId: string, shares: number) {
    const bot = await this.getBotUser();

    const item = await this.prisma.portfolioItem.findUnique({
      where: { userId_playerId: { userId: bot.id, playerId } },
    });

    if (!item || item.shares < shares) {
      throw new NotFoundException(
        `Bot has ${item?.shares ?? 0} shares, cannot remove ${shares}`,
      );
    }

    const remaining = item.shares - shares;

    if (remaining <= 0) {
      await this.prisma.portfolioItem.delete({
        where: { userId_playerId: { userId: bot.id, playerId } },
      });
    } else {
      await this.prisma.portfolioItem.update({
        where: { userId_playerId: { userId: bot.id, playerId } },
        data: { shares: remaining },
      });
    }

    this.logger.log(
      `Removed ${shares} shares of player ${playerId} from bot. Remaining: ${remaining}`,
    );

    return { remaining: Math.max(0, remaining) };
  }

  private async getBotUser() {
    const bot = await this.prisma.user.findFirst({
      where: { email: 'bot@footytrade.internal' },
    });
    if (!bot) {
      throw new NotFoundException(
        'Bot user not found. The market maker will create it automatically on first run.',
      );
    }
    return bot;
  }
}

import {
  Injectable,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { RedisService } from '../common/redis.service';
import { PricingService } from '../pricing/pricing.service';
import { FeeService } from './fee.service';

const MAX_PORTFOLIO_PLAYERS = 15;
const LOCK_TTL_SECONDS = 5;

@Injectable()
export class TradingService {
  private readonly logger = new Logger(TradingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly pricingService: PricingService,
    private readonly feeService: FeeService,
  ) {}

  async executeBuy(userId: string, playerId: string, shares: number) {
    const lockKey = `trade:${userId}:${playerId}`;
    const acquired = await this.redis.set(lockKey, '1', 'EX', LOCK_TTL_SECONDS, 'NX');
    if (!acquired) {
      throw new ConflictException('A trade for this player is already in progress');
    }

    try {
      const player = await this.prisma.player.findUniqueOrThrow({
        where: { id: playerId },
      });

      const totalCost = Math.round(shares * player.currentPrice * 100) / 100;
      const { fee } = await this.feeService.calculateFee(totalCost);
      const debit = Math.round((totalCost + fee) * 100) / 100;

      const user = await this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
      });

      if (user.credits < debit) {
        throw new BadRequestException(
          `Insufficient credits. Need ${debit}, have ${user.credits}`,
        );
      }

      const existingItem = await this.prisma.portfolioItem.findUnique({
        where: { userId_playerId: { userId, playerId } },
      });

      if (!existingItem) {
        const uniquePlayers = await this.prisma.portfolioItem.count({
          where: { userId },
        });
        if (uniquePlayers >= MAX_PORTFOLIO_PLAYERS) {
          throw new BadRequestException(
            `Portfolio limit reached. Maximum ${MAX_PORTFOLIO_PLAYERS} unique players allowed`,
          );
        }
      }

      const transaction = await this.prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: userId },
          data: { credits: { decrement: debit } },
        });

        const oldShares = existingItem?.shares ?? 0;
        const oldAvg = existingItem?.avgBuyPrice ?? 0;
        const newTotalShares = oldShares + shares;
        const newAvgBuyPrice =
          Math.round(
            ((oldAvg * oldShares + player.currentPrice * shares) /
              newTotalShares) *
              100,
          ) / 100;

        await tx.portfolioItem.upsert({
          where: { userId_playerId: { userId, playerId } },
          create: {
            userId,
            playerId,
            shares,
            avgBuyPrice: player.currentPrice,
          },
          update: {
            shares: newTotalShares,
            avgBuyPrice: newAvgBuyPrice,
          },
        });

        return tx.transaction.create({
          data: {
            userId,
            playerId,
            side: 'BUY',
            shares,
            pricePerShare: player.currentPrice,
            fee,
            total: debit,
          },
        });
      });

      this.pricingService.recalculatePrice(playerId).catch((err) => {
        this.logger.error(`Price recalculation failed for ${playerId}`, err);
      });

      return transaction;
    } finally {
      await this.redis.del(lockKey);
    }
  }

  async executeSell(userId: string, playerId: string, shares: number) {
    const lockKey = `trade:${userId}:${playerId}`;
    const acquired = await this.redis.set(lockKey, '1', 'EX', LOCK_TTL_SECONDS, 'NX');
    if (!acquired) {
      throw new ConflictException('A trade for this player is already in progress');
    }

    try {
      const portfolioItem = await this.prisma.portfolioItem.findUnique({
        where: { userId_playerId: { userId, playerId } },
      });

      if (!portfolioItem || portfolioItem.shares < shares) {
        throw new BadRequestException(
          `Insufficient shares. Own ${portfolioItem?.shares ?? 0}, trying to sell ${shares}`,
        );
      }

      const player = await this.prisma.player.findUniqueOrThrow({
        where: { id: playerId },
      });

      const totalProceeds = Math.round(shares * player.currentPrice * 100) / 100;
      const { fee } = await this.feeService.calculateFee(totalProceeds);
      const credit = Math.round((totalProceeds - fee) * 100) / 100;

      const remainingShares = portfolioItem.shares - shares;

      const transaction = await this.prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: userId },
          data: { credits: { increment: credit } },
        });

        if (remainingShares <= 0) {
          await tx.portfolioItem.delete({
            where: { userId_playerId: { userId, playerId } },
          });
        } else {
          await tx.portfolioItem.update({
            where: { userId_playerId: { userId, playerId } },
            data: { shares: remainingShares },
          });
        }

        return tx.transaction.create({
          data: {
            userId,
            playerId,
            side: 'SELL',
            shares,
            pricePerShare: player.currentPrice,
            fee,
            total: credit,
          },
        });
      });

      this.pricingService.recalculatePrice(playerId).catch((err) => {
        this.logger.error(`Price recalculation failed for ${playerId}`, err);
      });

      return transaction;
    } finally {
      await this.redis.del(lockKey);
    }
  }

  async getTransactionHistory(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { player: { select: { name: true, photoUrl: true } } },
      }),
      this.prisma.transaction.count({ where: { userId } }),
    ]);

    return {
      data: transactions,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

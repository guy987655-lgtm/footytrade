import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { RedisService } from '../common/redis.service';

@Injectable()
export class PricingService {
  private readonly logger = new Logger(PricingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async getAdminSetting(key: string): Promise<string> {
    const cacheKey = `admin_setting:${key}`;
    const cached = await this.redis.get(cacheKey);
    if (cached !== null) return cached;

    const setting = await this.prisma.adminSetting.findUnique({
      where: { key },
    });
    if (!setting) {
      throw new Error(`AdminSetting "${key}" not found`);
    }

    await this.redis.set(cacheKey, setting.value, 'EX', 60);
    return setting.value;
  }

  async recalculatePrice(playerId: string): Promise<number> {
    const player = await this.prisma.player.findUniqueOrThrow({
      where: { id: playerId },
    });

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const previousHistory = await this.prisma.priceHistory.findFirst({
      where: { playerId, timestamp: { lte: twentyFourHoursAgo } },
      orderBy: { timestamp: 'desc' },
    });
    const previousRating = previousHistory
      ? previousHistory.price
      : player.footyRating;

    const [buyOrders, sellOrders] = await Promise.all([
      this.prisma.order.count({
        where: { playerId, side: 'BUY', status: 'PENDING' },
      }),
      this.prisma.order.count({
        where: { playerId, side: 'SELL', status: 'PENDING' },
      }),
    ]);

    const demandMultiplier = parseFloat(
      await this.getAdminSetting('demandMultiplier'),
    );

    const ratingChange = (player.footyRating - previousRating) / 100;
    const totalOrders = buyOrders + sellOrders;
    const buyPressure =
      ((buyOrders - sellOrders) / Math.max(totalOrders, 1)) * 0.05;
    const priceChange =
      (ratingChange * 0.7 + buyPressure * 0.3) * demandMultiplier;
    const newPrice = Math.max(
      1,
      Math.round(player.currentPrice * (1 + priceChange) * 100) / 100,
    );

    await this.prisma.player.update({
      where: { id: playerId },
      data: { currentPrice: newPrice },
    });

    await this.prisma.priceHistory.create({
      data: { playerId, price: newPrice },
    });

    await this.redis.publish(
      'price:update',
      JSON.stringify({
        playerId,
        price: newPrice,
        timestamp: new Date().toISOString(),
      }),
    );

    return newPrice;
  }

  async recalculateAllPrices(): Promise<void> {
    const players = await this.prisma.player.findMany({
      select: { id: true },
    });

    this.logger.log(`Recalculating prices for ${players.length} players`);

    for (const player of players) {
      try {
        await this.recalculatePrice(player.id);
      } catch (error) {
        this.logger.error(
          `Failed to recalculate price for player ${player.id}`,
          error instanceof Error ? error.stack : error,
        );
      }
    }
  }

  async getPriceHistory(playerId: string, days: number) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    return this.prisma.priceHistory.findMany({
      where: { playerId, timestamp: { gte: since } },
      orderBy: { timestamp: 'asc' },
    });
  }
}

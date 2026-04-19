import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { RedisService } from '../common/redis.service';
import { TradingService } from '../trading/trading.service';

const FEE_ESTIMATE_PERCENT = 2;

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly tradingService: TradingService,
  ) {}

  async placeLimitOrder(
    userId: string,
    playerId: string,
    side: 'BUY' | 'SELL',
    shares: number,
    limitPrice: number,
  ) {
    if (side === 'BUY') {
      const totalCost = shares * limitPrice;
      const estimatedFee = totalCost * (FEE_ESTIMATE_PERCENT / 100);
      const required = Math.round((totalCost + estimatedFee) * 100) / 100;

      const user = await this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
      });
      if (user.credits < required) {
        throw new BadRequestException(
          `Insufficient credits. Need ~${required}, have ${user.credits}`,
        );
      }
    } else {
      const portfolioItem = await this.prisma.portfolioItem.findUnique({
        where: { userId_playerId: { userId, playerId } },
      });
      if (!portfolioItem || portfolioItem.shares < shares) {
        throw new BadRequestException(
          `Insufficient shares. Own ${portfolioItem?.shares ?? 0}, trying to sell ${shares}`,
        );
      }
    }

    const order = await this.prisma.order.create({
      data: {
        userId,
        playerId,
        side,
        type: 'LIMIT',
        shares,
        limitPrice,
        status: 'PENDING',
      },
    });

    // BUY orders use negative score so ZRANGEBYSCORE returns highest price first
    const key = `orderbook:${playerId}:${side.toLowerCase()}`;
    const score = side === 'BUY' ? -limitPrice : limitPrice;
    await this.redis.zadd(key, score, order.id);

    await this.tryMatchOrders(playerId);

    return order;
  }

  async tryMatchOrders(playerId: string) {
    const buyKey = `orderbook:${playerId}:buy`;
    const sellKey = `orderbook:${playerId}:sell`;

    while (true) {
      // Best buy = highest price → stored as most-negative score → first in ZRANGEBYSCORE
      const bestBuyEntries = await this.redis.zrangebyscore(
        buyKey,
        '-inf',
        '+inf',
        'WITHSCORES',
        'LIMIT',
        0,
        1,
      );
      if (bestBuyEntries.length < 2) break;

      // Best sell = lowest price → stored as lowest positive score → first in ZRANGEBYSCORE
      const bestSellEntries = await this.redis.zrangebyscore(
        sellKey,
        '-inf',
        '+inf',
        'WITHSCORES',
        'LIMIT',
        0,
        1,
      );
      if (bestSellEntries.length < 2) break;

      const buyOrderId = bestBuyEntries[0];
      const buyPrice = -parseFloat(bestBuyEntries[1]); // negate back to real price
      const sellOrderId = bestSellEntries[0];
      const sellPrice = parseFloat(bestSellEntries[1]);

      if (buyPrice < sellPrice) break;

      const [buyOrder, sellOrder] = await Promise.all([
        this.prisma.order.findUniqueOrThrow({ where: { id: buyOrderId } }),
        this.prisma.order.findUniqueOrThrow({ where: { id: sellOrderId } }),
      ]);

      const buyRemaining = buyOrder.shares - buyOrder.filledQty;
      const sellRemaining = sellOrder.shares - sellOrder.filledQty;
      const matchQty = Math.min(buyRemaining, sellRemaining);
      const matchPrice = sellPrice; // execute at the resting (sell) price

      try {
        await this.tradingService.executeBuy(
          buyOrder.userId,
          playerId,
          matchQty,
        );
        await this.tradingService.executeSell(
          sellOrder.userId,
          playerId,
          matchQty,
        );
      } catch (err) {
        this.logger.error(
          `Order match execution failed: buy=${buyOrderId} sell=${sellOrderId}`,
          err,
        );
        break;
      }

      const newBuyFilled = buyOrder.filledQty + matchQty;
      const newSellFilled = sellOrder.filledQty + matchQty;

      await this.prisma.$transaction([
        this.prisma.order.update({
          where: { id: buyOrderId },
          data: {
            filledQty: newBuyFilled,
            status:
              newBuyFilled >= buyOrder.shares ? 'FILLED' : 'PARTIALLY_FILLED',
          },
        }),
        this.prisma.order.update({
          where: { id: sellOrderId },
          data: {
            filledQty: newSellFilled,
            status:
              newSellFilled >= sellOrder.shares
                ? 'FILLED'
                : 'PARTIALLY_FILLED',
          },
        }),
      ]);

      if (newBuyFilled >= buyOrder.shares) {
        await this.redis.zrem(buyKey, buyOrderId);
      }
      if (newSellFilled >= sellOrder.shares) {
        await this.redis.zrem(sellKey, sellOrderId);
      }
    }
  }

  async cancelOrder(userId: string, orderId: string) {
    const order = await this.prisma.order.findUniqueOrThrow({
      where: { id: orderId },
    });

    if (order.userId !== userId) {
      throw new ForbiddenException('You do not own this order');
    }
    if (order.status !== 'PENDING' && order.status !== 'PARTIALLY_FILLED') {
      throw new BadRequestException(
        `Cannot cancel order with status ${order.status}`,
      );
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'CANCELLED' },
    });

    const key = `orderbook:${order.playerId}:${order.side.toLowerCase()}`;
    await this.redis.zrem(key, orderId);

    return updated;
  }

  async getOrderBook(playerId: string) {
    const buyKey = `orderbook:${playerId}:buy`;
    const sellKey = `orderbook:${playerId}:sell`;

    const [buyEntries, sellEntries] = await Promise.all([
      this.redis.zrangebyscore(buyKey, '-inf', '+inf', 'WITHSCORES'),
      this.redis.zrangebyscore(sellKey, '-inf', '+inf', 'WITHSCORES'),
    ]);

    const buyOrderIds: string[] = [];
    const buyScores = new Map<string, number>();
    for (let i = 0; i < buyEntries.length; i += 2) {
      buyOrderIds.push(buyEntries[i]);
      buyScores.set(buyEntries[i], -parseFloat(buyEntries[i + 1]));
    }

    const sellOrderIds: string[] = [];
    const sellScores = new Map<string, number>();
    for (let i = 0; i < sellEntries.length; i += 2) {
      sellOrderIds.push(sellEntries[i]);
      sellScores.set(sellEntries[i], parseFloat(sellEntries[i + 1]));
    }

    const allIds = [...buyOrderIds, ...sellOrderIds];
    const orders =
      allIds.length > 0
        ? await this.prisma.order.findMany({
            where: { id: { in: allIds } },
            select: { id: true, side: true, shares: true, filledQty: true },
          })
        : [];

    const orderMap = new Map(orders.map((o) => [o.id, o]));

    const aggregateLevels = (
      ids: string[],
      scores: Map<string, number>,
    ): { price: number; totalShares: number }[] => {
      const levels = new Map<number, number>();
      for (const id of ids) {
        const price = scores.get(id);
        const order = orderMap.get(id);
        if (price == null || !order) continue;
        const remaining = order.shares - order.filledQty;
        levels.set(price, (levels.get(price) ?? 0) + remaining);
      }
      return Array.from(levels.entries())
        .map(([price, totalShares]) => ({ price, totalShares }))
        .filter((l) => l.totalShares > 0);
    };

    const buyLevels = aggregateLevels(buyOrderIds, buyScores)
      .sort((a, b) => b.price - a.price)
      .slice(0, 10);

    const sellLevels = aggregateLevels(sellOrderIds, sellScores)
      .sort((a, b) => a.price - b.price)
      .slice(0, 10);

    return { bids: buyLevels, asks: sellLevels };
  }

  async getUserOrders(userId: string, status?: string) {
    const where: any = { userId };
    if (status) {
      where.status = status;
    }

    return this.prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { player: { select: { name: true, photoUrl: true } } },
    });
  }
}

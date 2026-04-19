import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma.service';
import { RedisService } from '../common/redis.service';
import { OrdersService } from '../orders/orders.service';
import { PricingService } from '../pricing/pricing.service';

const BOT_EMAIL = 'bot@footytrade.internal';
const DEFAULT_SPREAD = 0.02;
const BOT_CREDITS = 999_999_999;

@Injectable()
export class MarketMakerService {
  private readonly logger = new Logger(MarketMakerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly config: ConfigService,
    private readonly ordersService: OrdersService,
    private readonly pricingService: PricingService,
  ) {}

  @Cron('*/30 * * * * *')
  async provideLiquidity() {
    try {
      const enabled = await this.pricingService
        .getAdminSetting('marketMakerEnabled')
        .catch(() => 'true');

      if (enabled === 'false') return;

      const spreadStr = await this.pricingService
        .getAdminSetting('marketMakerSpread')
        .catch(() => String(DEFAULT_SPREAD));
      const spread = parseFloat(spreadStr) || DEFAULT_SPREAD;

      const botUser = await this.getOrCreateBotUser();
      const players = await this.prisma.player.findMany({
        select: { id: true, currentPrice: true },
      });

      for (const player of players) {
        try {
          await this.provideForPlayer(player, botUser.id, spread);
        } catch (err) {
          this.logger.error(
            `Market maker failed for player ${player.id}`,
            err instanceof Error ? err.stack : err,
          );
        }
      }
    } catch (err) {
      this.logger.error(
        'Market maker cycle failed',
        err instanceof Error ? err.stack : err,
      );
    }
  }

  private async provideForPlayer(
    player: { id: string; currentPrice: number },
    botUserId: string,
    spread: number,
  ) {
    const pendingSells = await this.prisma.order.count({
      where: { playerId: player.id, side: 'SELL', status: 'PENDING' },
    });
    const pendingBuys = await this.prisma.order.count({
      where: { playerId: player.id, side: 'BUY', status: 'PENDING' },
    });

    if (pendingSells > 0 && pendingBuys === 0) {
      const buyPrice =
        Math.round(player.currentPrice * (1 - spread) * 100) / 100;
      await this.ordersService.placeLimitOrder(
        botUserId,
        player.id,
        'BUY',
        1,
        buyPrice,
      );
      this.logger.debug(
        `Placed BUY @ ${buyPrice} for player ${player.id}`,
      );
    }

    if (pendingBuys > 0 && pendingSells === 0) {
      const sellPrice =
        Math.round(player.currentPrice * (1 + spread) * 100) / 100;
      await this.ordersService.placeLimitOrder(
        botUserId,
        player.id,
        'SELL',
        1,
        sellPrice,
      );
      this.logger.debug(
        `Placed SELL @ ${sellPrice} for player ${player.id}`,
      );
    }
  }

  async getOrCreateBotUser() {
    const existing = await this.prisma.user.findUnique({
      where: { email: BOT_EMAIL },
    });
    if (existing) return existing;

    this.logger.log('Creating market-maker bot user');
    return this.prisma.user.create({
      data: {
        email: BOT_EMAIL,
        name: 'FootyTrade Bot',
        credits: BOT_CREDITS,
      },
    });
  }
}

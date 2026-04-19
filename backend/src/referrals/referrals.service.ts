import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma.service';

const REFERRAL_BONUS_CREDITS = 500;
const REQUIRED_TRADES = 5;
const ELIGIBILITY_WINDOW_DAYS = 7;

@Injectable()
export class ReferralsService {
  private readonly logger = new Logger(ReferralsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getReferralInfo(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const bonuses = await this.prisma.referralBonus.findMany({
      where: { referrerId: userId },
      include: {
        referee: {
          select: { id: true, name: true, createdAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const sevenDaysAgo = new Date(
      Date.now() - ELIGIBILITY_WINDOW_DAYS * 24 * 60 * 60 * 1000,
    );

    const referredUsers = await Promise.all(
      bonuses.map(async (bonus) => {
        const windowEnd = new Date(bonus.referee.createdAt);
        windowEnd.setDate(
          windowEnd.getDate() + ELIGIBILITY_WINDOW_DAYS,
        );

        const tradesCount = await this.prisma.transaction.count({
          where: {
            userId: bonus.refereeId,
            createdAt: {
              gte: bonus.referee.createdAt,
              lte: windowEnd,
            },
          },
        });

        return {
          name: bonus.referee.name,
          joinedAt: bonus.referee.createdAt,
          tradesCount,
          requiredTrades: REQUIRED_TRADES,
          status: bonus.status,
        };
      }),
    );

    return {
      referralCode: user.referralCode,
      referredUsers,
    };
  }

  @Cron('0 */6 * * *')
  async checkAndAwardBonuses() {
    this.logger.log('Checking referral bonuses...');

    const pending = await this.prisma.referralBonus.findMany({
      where: { status: 'PENDING' },
      include: {
        referee: { select: { id: true, createdAt: true } },
      },
    });

    let awarded = 0;
    let expired = 0;

    for (const bonus of pending) {
      const windowEnd = new Date(bonus.referee.createdAt);
      windowEnd.setDate(
        windowEnd.getDate() + ELIGIBILITY_WINDOW_DAYS,
      );

      const tradesCount = await this.prisma.transaction.count({
        where: {
          userId: bonus.refereeId,
          createdAt: {
            gte: bonus.referee.createdAt,
            lte: windowEnd,
          },
        },
      });

      if (tradesCount >= REQUIRED_TRADES) {
        await this.prisma.$transaction([
          this.prisma.user.update({
            where: { id: bonus.referrerId },
            data: { credits: { increment: REFERRAL_BONUS_CREDITS } },
          }),
          this.prisma.user.update({
            where: { id: bonus.refereeId },
            data: { credits: { increment: REFERRAL_BONUS_CREDITS } },
          }),
          this.prisma.referralBonus.update({
            where: { id: bonus.id },
            data: { status: 'AWARDED', awardedAt: new Date() },
          }),
        ]);
        awarded++;
      } else if (windowEnd < new Date()) {
        await this.prisma.referralBonus.update({
          where: { id: bonus.id },
          data: { status: 'EXPIRED' },
        });
        expired++;
      }
    }

    this.logger.log(
      `Referral check complete: ${awarded} awarded, ${expired} expired, ${pending.length - awarded - expired} still pending`,
    );
  }
}

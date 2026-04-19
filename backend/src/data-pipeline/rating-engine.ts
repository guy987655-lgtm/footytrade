import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

interface StatsInput {
  goals: number;
  assists: number;
  minutes: number;
  keyPasses: number;
  xG: number;
  rating: number;
}

@Injectable()
export class RatingEngine {
  private readonly logger = new Logger(RatingEngine.name);

  constructor(private readonly prisma: PrismaService) {}

  calculateRating(stats: StatsInput): number {
    const goalsScore = Math.min(stats.goals * 6, 30);
    const assistsScore = Math.min(stats.assists * 4, 20);
    const minutesScore = Math.min((stats.minutes / 90) * 2, 15);
    const keyPassScore = Math.min(stats.keyPasses * 0.5, 15);
    const xGScore = Math.min(stats.xG * 5, 10);
    const apiRatingScore = Math.min((stats.rating / 10) * 10, 10);

    const total =
      goalsScore +
      assistsScore +
      minutesScore +
      keyPassScore +
      xGScore +
      apiRatingScore;

    return Math.max(1, Math.min(100, Math.round(total)));
  }

  async updatePlayerRatings(): Promise<void> {
    const players = await this.prisma.player.findMany({
      include: {
        stats: { orderBy: { date: 'desc' }, take: 1 },
      },
    });

    let updated = 0;

    for (const player of players) {
      const latest = player.stats[0];
      if (!latest) continue;

      const footyRating = this.calculateRating({
        goals: latest.goals,
        assists: latest.assists,
        minutes: latest.minutes,
        keyPasses: latest.keyPasses,
        xG: latest.xG,
        rating: latest.rating,
      });

      await this.prisma.player.update({
        where: { id: player.id },
        data: { footyRating },
      });

      updated++;
    }

    this.logger.log(`Updated ratings for ${updated} players`);
  }
}

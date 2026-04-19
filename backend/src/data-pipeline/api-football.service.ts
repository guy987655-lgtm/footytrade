import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import axios from 'axios';
import { PrismaService } from '../common/prisma.service';
import { RatingEngine } from './rating-engine';

interface ParsedStats {
  goals: number;
  assists: number;
  minutes: number;
  keyPasses: number;
  rating: number;
}

@Injectable()
export class ApiFootballService {
  private readonly logger = new Logger(ApiFootballService.name);
  private readonly apiKey: string;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly ratingEngine: RatingEngine,
  ) {
    this.apiKey = this.config.get<string>('API_FOOTBALL_KEY', '');
  }

  async fetchPlayerStats(externalId: number): Promise<ParsedStats | null> {
    if (!this.apiKey) return null;

    const { data } = await axios.get(
      `https://v3.football.api-sports.io/players`,
      {
        params: { id: externalId, season: 2025 },
        headers: { 'x-apisports-key': this.apiKey },
      },
    );

    const player = data?.response?.[0];
    if (!player?.statistics?.length) return null;

    const totals = player.statistics.reduce(
      (acc: ParsedStats, s: any) => ({
        goals: acc.goals + (s.goals?.total ?? 0),
        assists: acc.assists + (s.goals?.assists ?? 0),
        minutes: acc.minutes + (s.games?.minutes ?? 0),
        keyPasses: acc.keyPasses + (s.passes?.key ?? 0),
        rating: Math.max(acc.rating, parseFloat(s.games?.rating ?? '0')),
      }),
      { goals: 0, assists: 0, minutes: 0, keyPasses: 0, rating: 0 },
    );

    return totals;
  }

  @Cron('0 6 * * *')
  async syncAllPlayers(): Promise<void> {
    if (!this.apiKey) {
      this.logger.warn(
        'API_FOOTBALL_KEY not configured — skipping player sync',
      );
      return;
    }

    const players = await this.prisma.player.findMany({
      where: { externalId: { not: null } },
    });

    this.logger.log(`Syncing stats for ${players.length} players`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const player of players) {
      try {
        const stats = await this.fetchPlayerStats(player.externalId!);
        if (!stats) continue;

        await this.prisma.playerStats.upsert({
          where: {
            playerId_date: { playerId: player.id, date: today },
          },
          update: {
            goals: stats.goals,
            assists: stats.assists,
            minutes: stats.minutes,
            keyPasses: stats.keyPasses,
            rating: stats.rating,
          },
          create: {
            playerId: player.id,
            date: today,
            goals: stats.goals,
            assists: stats.assists,
            minutes: stats.minutes,
            keyPasses: stats.keyPasses,
            rating: stats.rating,
          },
        });
      } catch (err) {
        this.logger.error(
          `Failed to sync player ${player.name} (${player.externalId}): ${(err as Error).message}`,
        );
      }
    }

    this.logger.log('Player sync complete — updating ratings');
    await this.ratingEngine.updatePlayerRatings();
  }
}

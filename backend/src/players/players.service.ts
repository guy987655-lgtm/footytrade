import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';

interface FindAllFilters {
  position?: string;
  team?: string;
  league?: string;
  search?: string;
  sortBy?: 'price' | 'rating' | 'name';
  order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

@Injectable()
export class PlayersService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters: FindAllFilters = {}) {
    const {
      position,
      team,
      league,
      search,
      sortBy = 'name',
      order = 'asc',
      page = 1,
      limit = 50,
    } = filters;

    const where: Prisma.PlayerWhereInput = {};

    if (position) where.position = position;
    if (team) where.team = team;
    if (league) where.league = league;
    if (search) where.name = { contains: search };

    const sortFieldMap: Record<string, string> = {
      price: 'currentPrice',
      rating: 'footyRating',
      name: 'name',
    };
    const orderBy = { [sortFieldMap[sortBy] ?? 'name']: order };

    const skip = (page - 1) * limit;

    const [players, total] = await this.prisma.$transaction([
      this.prisma.player.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.player.count({ where }),
    ]);

    return {
      data: players,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const player = await this.prisma.player.findUnique({
      where: { id },
      include: {
        stats: {
          orderBy: { date: 'desc' },
          take: 1,
        },
        priceHistory: {
          where: { timestamp: { gte: thirtyDaysAgo } },
          orderBy: { timestamp: 'asc' },
        },
      },
    });

    if (!player) {
      throw new NotFoundException(`Player with id "${id}" not found`);
    }

    return player;
  }

  async getTopMovers() {
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const players = await this.prisma.player.findMany({
      include: {
        priceHistory: {
          where: { timestamp: { lte: oneDayAgo } },
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
      },
    });

    const movers = players
      .filter((p) => p.priceHistory.length > 0)
      .map((p) => {
        const oldPrice = p.priceHistory[0].price;
        const change = p.currentPrice - oldPrice;
        const changePercent = (change / oldPrice) * 100;
        return {
          id: p.id,
          name: p.name,
          team: p.team,
          position: p.position,
          photoUrl: p.photoUrl,
          currentPrice: p.currentPrice,
          previousPrice: oldPrice,
          change,
          changePercent: Math.round(changePercent * 100) / 100,
        };
      });

    movers.sort((a, b) => b.changePercent - a.changePercent);

    return {
      gainers: movers.slice(0, 5),
      losers: movers.slice(-5).reverse(),
    };
  }
}

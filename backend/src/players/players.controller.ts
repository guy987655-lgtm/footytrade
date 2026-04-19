import { Controller, Get, Param, Query } from '@nestjs/common';
import { PlayersService } from './players.service';

@Controller('players')
export class PlayersController {
  constructor(private playersService: PlayersService) {}

  @Get()
  findAll(
    @Query('position') position?: string,
    @Query('team') team?: string,
    @Query('league') league?: string,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: 'price' | 'rating' | 'name',
    @Query('order') order?: 'asc' | 'desc',
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.playersService.findAll({
      position,
      team,
      league,
      search,
      sortBy,
      order,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('movers')
  getTopMovers() {
    return this.playersService.getTopMovers();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.playersService.findOne(id);
  }
}

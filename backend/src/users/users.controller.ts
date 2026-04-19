import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('wallet')
  @UseGuards(JwtAuthGuard)
  getWallet(@Req() req) {
    return this.usersService.getWallet(req.user.id);
  }

  @Get('portfolio')
  @UseGuards(JwtAuthGuard)
  getPortfolio(@Req() req) {
    return this.usersService.getPortfolio(req.user.id);
  }

  @Get('watchlist')
  @UseGuards(JwtAuthGuard)
  getWatchlist(@Req() req) {
    return this.usersService.getWatchlist(req.user.id);
  }

  @Post('watchlist/:playerId')
  @UseGuards(JwtAuthGuard)
  addToWatchlist(@Req() req, @Param('playerId') playerId: string) {
    return this.usersService.addToWatchlist(req.user.id, playerId);
  }

  @Delete('watchlist/:playerId')
  @UseGuards(JwtAuthGuard)
  removeFromWatchlist(@Req() req, @Param('playerId') playerId: string) {
    return this.usersService.removeFromWatchlist(req.user.id, playerId);
  }

  @Get('leaderboard')
  getLeaderboard(@Query('limit') limit?: string) {
    return this.usersService.getLeaderboard(
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  @Get('leaderboard/friends')
  @UseGuards(JwtAuthGuard)
  getFriendsLeaderboard(@Req() req, @Query('limit') limit?: string) {
    return this.usersService.getFriendsLeaderboard(
      req.user.id,
      limit ? parseInt(limit, 10) : undefined,
    );
  }
}

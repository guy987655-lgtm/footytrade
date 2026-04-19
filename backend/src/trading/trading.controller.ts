import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { IsString, IsNumber, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TradingService } from './trading.service';

class TradeDto {
  @IsString()
  playerId!: string;

  @IsNumber()
  @Min(0.01)
  @Type(() => Number)
  shares!: number;
}

class HistoryQueryDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  limit?: number = 20;
}

@Controller('trading')
@UseGuards(JwtAuthGuard)
export class TradingController {
  constructor(private readonly tradingService: TradingService) {}

  @Post('buy')
  buy(@Req() req, @Body() dto: TradeDto) {
    return this.tradingService.executeBuy(req.user.id, dto.playerId, dto.shares);
  }

  @Post('sell')
  sell(@Req() req, @Body() dto: TradeDto) {
    return this.tradingService.executeSell(req.user.id, dto.playerId, dto.shares);
  }

  @Get('history')
  history(@Req() req, @Query() query: HistoryQueryDto) {
    return this.tradingService.getTransactionHistory(
      req.user.id,
      query.page ?? 1,
      query.limit ?? 20,
    );
  }
}

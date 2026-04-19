import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { IsString, IsNumber, IsIn, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OrdersService } from './orders.service';

class LimitOrderDto {
  @IsString()
  playerId!: string;

  @IsIn(['BUY', 'SELL'])
  side!: 'BUY' | 'SELL';

  @IsNumber()
  @Min(0.01)
  @Type(() => Number)
  shares!: number;

  @IsNumber()
  @Min(0.01)
  @Type(() => Number)
  limitPrice!: number;
}

class UserOrdersQueryDto {
  @IsOptional()
  @IsString()
  status?: string;
}

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('limit')
  @UseGuards(JwtAuthGuard)
  placeLimitOrder(@Req() req, @Body() dto: LimitOrderDto) {
    return this.ordersService.placeLimitOrder(
      req.user.id,
      dto.playerId,
      dto.side,
      dto.shares,
      dto.limitPrice,
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  cancelOrder(@Req() req, @Param('id') id: string) {
    return this.ordersService.cancelOrder(req.user.id, id);
  }

  @Get('book/:playerId')
  getOrderBook(@Param('playerId') playerId: string) {
    return this.ordersService.getOrderBook(playerId);
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  getUserOrders(@Req() req, @Query() query: UserOrdersQueryDto) {
    return this.ordersService.getUserOrders(req.user.id, query.status);
  }
}

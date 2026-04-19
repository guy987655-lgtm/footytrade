import { Module } from '@nestjs/common';
import { TradingModule } from '../trading/trading.module';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';

@Module({
  imports: [TradingModule],
  providers: [OrdersService],
  controllers: [OrdersController],
  exports: [OrdersService],
})
export class OrdersModule {}

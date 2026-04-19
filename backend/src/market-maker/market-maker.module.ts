import { Module } from '@nestjs/common';
import { TradingModule } from '../trading/trading.module';
import { OrdersModule } from '../orders/orders.module';
import { PricingModule } from '../pricing/pricing.module';
import { MarketMakerService } from './market-maker.service';

@Module({
  imports: [TradingModule, OrdersModule, PricingModule],
  providers: [MarketMakerService],
})
export class MarketMakerModule {}

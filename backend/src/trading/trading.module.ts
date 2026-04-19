import { Module } from '@nestjs/common';
import { PricingModule } from '../pricing/pricing.module';
import { TradingService } from './trading.service';
import { FeeService } from './fee.service';
import { TradingController } from './trading.controller';

@Module({
  imports: [PricingModule],
  providers: [TradingService, FeeService],
  controllers: [TradingController],
  exports: [TradingService],
})
export class TradingModule {}

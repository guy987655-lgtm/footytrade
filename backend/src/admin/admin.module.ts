import { Module } from '@nestjs/common';
import { PricingModule } from '../pricing/pricing.module';
import { MarketMakerModule } from '../market-maker/market-maker.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [PricingModule, MarketMakerModule],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PlayersModule } from './players/players.module';
import { DataPipelineModule } from './data-pipeline/data-pipeline.module';
import { PricingModule } from './pricing/pricing.module';
import { TradingModule } from './trading/trading.module';
import { OrdersModule } from './orders/orders.module';
import { MarketMakerModule } from './market-maker/market-maker.module';
import { ReferralsModule } from './referrals/referrals.module';
import { AdminModule } from './admin/admin.module';
import { RealtimeModule } from './realtime/realtime.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    CommonModule,
    AuthModule,
    UsersModule,
    PlayersModule,
    DataPipelineModule,
    PricingModule,
    TradingModule,
    OrdersModule,
    MarketMakerModule,
    ReferralsModule,
    AdminModule,
    RealtimeModule,
  ],
})
export class AppModule {}

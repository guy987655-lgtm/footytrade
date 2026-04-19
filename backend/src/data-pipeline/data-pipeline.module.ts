import { Module } from '@nestjs/common';
import { ApiFootballService } from './api-football.service';
import { RatingEngine } from './rating-engine';

@Module({
  providers: [ApiFootballService, RatingEngine],
  exports: [ApiFootballService, RatingEngine],
})
export class DataPipelineModule {}

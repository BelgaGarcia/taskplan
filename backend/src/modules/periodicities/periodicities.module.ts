import { Module } from '@nestjs/common';
import { PeriodicitiesController } from './periodicities.controller';
import { PeriodicitiesService } from './periodicities.service';

@Module({
  controllers: [PeriodicitiesController],
  providers: [PeriodicitiesService],
})
export class PeriodicitiesModule {}

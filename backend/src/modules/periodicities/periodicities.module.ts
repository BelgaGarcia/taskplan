import { Module } from '@nestjs/common';
import { PeriodicitiesController } from './periodicities.controller';
import { PeriodicitiesService } from './periodicities.service';
import { TaskOccurrencesModule } from '../task-occurrences/task-occurrences.module';

@Module({
  controllers: [PeriodicitiesController],
  imports: [TaskOccurrencesModule],
  providers: [PeriodicitiesService],
})
export class PeriodicitiesModule {}

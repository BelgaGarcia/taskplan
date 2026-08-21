import { Module } from '@nestjs/common';
import { OccurrenceGeneratorService } from './occurrence-generator.service';
import { TaskOccurrencesController } from './task-occurrences.controller';
import { TaskOccurrencesService } from './task-occurrences.service';
import { PositionsModule } from '../positions/positions.module';

@Module({
  imports: [PositionsModule],
  controllers: [TaskOccurrencesController],
  providers: [TaskOccurrencesService, OccurrenceGeneratorService],
  exports: [TaskOccurrencesService, OccurrenceGeneratorService],
})
export class TaskOccurrencesModule {}

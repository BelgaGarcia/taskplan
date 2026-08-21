import { Module } from '@nestjs/common';
import { PositionsController } from './positions.controller';
import { PositionsService } from './positions.service';
import { PositionHierarchyService } from './position-hierarchy.service';

@Module({
  controllers: [PositionsController],
  providers: [PositionsService, PositionHierarchyService],
  exports: [PositionsService, PositionHierarchyService],
})
export class PositionsModule {}

import { PartialType } from '@nestjs/swagger';
import { CreatePeriodicityDto } from './create-periodicity.dto';

export class UpdatePeriodicityDto extends PartialType(CreatePeriodicityDto) {}

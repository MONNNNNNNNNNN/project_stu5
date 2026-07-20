import { PartialType } from '@nestjs/mapped-types';
import { CreateGrowthRecordDto } from './create-growth-record.dto';

export class UpdateGrowthRecordDto extends PartialType(CreateGrowthRecordDto) {}

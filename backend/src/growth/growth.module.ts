import { Module } from '@nestjs/common';
import { GrowthController } from './growth.controller';
import { GrowthService } from './growth.service';
import { GrowthReferenceService } from './growth-reference.service';
import { ChildrenModule } from '../children/children.module';

@Module({
  imports: [ChildrenModule],
  controllers: [GrowthController],
  providers: [GrowthService, GrowthReferenceService],
  // SuggestionsModule reads the same LMS tables to decide whether a BMI is out of range, so
  // the trigger and the number the parent sees can never disagree.
  exports: [GrowthReferenceService],
})
export class GrowthModule {}

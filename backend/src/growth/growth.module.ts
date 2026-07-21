import { Module } from '@nestjs/common';
import { GrowthController } from './growth.controller';
import { GrowthService } from './growth.service';
import { GrowthReferenceService } from './growth-reference.service';
import { ChildrenModule } from '../children/children.module';

@Module({
  imports: [ChildrenModule],
  controllers: [GrowthController],
  providers: [GrowthService, GrowthReferenceService],
})
export class GrowthModule {}

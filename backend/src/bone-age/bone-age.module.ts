import { Module } from '@nestjs/common';
import { BoneAgeController } from './bone-age.controller';
import { BoneAgeService } from './bone-age.service';
import { BoneAgeInferenceService } from './bone-age.inference';
import { ChildrenModule } from '../children/children.module';

@Module({
  imports: [ChildrenModule],
  controllers: [BoneAgeController],
  providers: [BoneAgeService, BoneAgeInferenceService],
})
export class BoneAgeModule {}

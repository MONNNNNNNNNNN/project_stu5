import { Module } from '@nestjs/common';
import { PubertyController } from './puberty.controller';
import { PubertyService } from './puberty.service';
import { ChildrenModule } from '../children/children.module';

@Module({
  imports: [ChildrenModule],
  controllers: [PubertyController],
  providers: [PubertyService],
})
export class PubertyModule {}

import { Module } from '@nestjs/common';
import { SuggestionsService } from './suggestions.service';
import { SuggestionsController } from './suggestions.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ChildrenModule } from '../children/children.module';
import { GrowthModule } from '../growth/growth.module';

@Module({
  imports: [PrismaModule, ChildrenModule, GrowthModule],
  controllers: [SuggestionsController],
  providers: [SuggestionsService],
})
export class SuggestionsModule {}

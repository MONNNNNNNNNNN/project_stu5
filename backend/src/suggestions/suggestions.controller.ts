import { Controller, Get, Query } from '@nestjs/common';
import { SuggestionsService } from './suggestions.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';

@Controller('suggestions')
export class SuggestionsController {
  constructor(private suggestions: SuggestionsService) {}

  /** Everything the app thinks is worth doing next for one child, in priority order. */
  @Get()
  forChild(@CurrentUser() user: AuthUser, @Query('childId') childId: string) {
    return this.suggestions.forChild(user.userId, childId);
  }
}

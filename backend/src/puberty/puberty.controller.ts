import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { PubertyService } from './puberty.service';
import { SubmitPubertyScreeningDto } from './dto/submit-puberty-screening.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';

@Controller('puberty')
export class PubertyController {
  constructor(private pubertyService: PubertyService) {}

  @Post('questionnaire')
  submit(@CurrentUser() user: AuthUser, @Body() dto: SubmitPubertyScreeningDto) {
    return this.pubertyService.submit(user.userId, dto);
  }

  @Get('history')
  history(@CurrentUser() user: AuthUser, @Query('childId') childId: string) {
    return this.pubertyService.history(user.userId, childId);
  }

  @Get('plan')
  plan(@CurrentUser() user: AuthUser, @Query('childId') childId: string) {
    return this.pubertyService.plan(user.userId, childId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.pubertyService.findOne(user.userId, id);
  }
}

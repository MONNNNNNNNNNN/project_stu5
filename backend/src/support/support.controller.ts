import { Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { SupportService } from './support.service';
import { CreateSupportMessageDto } from './dto/create-support-message.dto';
import { Public } from '../common/decorators/public.decorator';

@Public()
@Controller('support')
export class SupportController {
  constructor(private supportService: SupportService) {}

  // Unauthenticated and it writes a row per call, so without a limit this is a way to fill
  // the database from outside.
  @Throttle({ default: { limit: 5, ttl: 10 * 60_000 } })
  @Post('contact')
  create(@Body() dto: CreateSupportMessageDto) {
    return this.supportService.create(dto);
  }
}

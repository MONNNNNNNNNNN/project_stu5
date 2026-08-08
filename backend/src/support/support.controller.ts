import { Body, Controller, Post } from '@nestjs/common';
import { SupportService } from './support.service';
import { CreateSupportMessageDto } from './dto/create-support-message.dto';
import { Public } from '../common/decorators/public.decorator';

@Public()
@Controller('support')
export class SupportController {
  constructor(private supportService: SupportService) {}

  @Post('contact')
  create(@Body() dto: CreateSupportMessageDto) {
    return this.supportService.create(dto);
  }
}

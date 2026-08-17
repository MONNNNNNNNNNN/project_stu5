import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { AppService } from './app.service';
import { Public } from './common/decorators/public.decorator';

@Public()
// Render polls this endpoint continuously to decide whether the service is alive. Counting
// those probes would mean a database write per health check, and they are not traffic worth
// limiting anyway.
@SkipThrottle()
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  getHealth() {
    return this.appService.getHealth();
  }
}

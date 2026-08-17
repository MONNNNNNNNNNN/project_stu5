import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { ProxyAwareThrottlerGuard } from './common/throttler-proxy.guard';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ChildrenModule } from './children/children.module';
import { GrowthModule } from './growth/growth.module';
import { PubertyModule } from './puberty/puberty.module';
import { BoneAgeModule } from './bone-age/bone-age.module';
import { ArticlesModule } from './articles/articles.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SupportModule } from './support/support.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Baseline ceiling for ordinary API traffic. The routes that actually need
    // protecting — login, register, forgot-password, the public contact form — carry
    // their own much tighter @Throttle on top of this.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    PrismaModule,
    AuthModule,
    UsersModule,
    ChildrenModule,
    GrowthModule,
    PubertyModule,
    BoneAgeModule,
    ArticlesModule,
    NotificationsModule,
    SupportModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Order matters: APP_GUARD providers run in registration order, and throttling first
    // means a credential-stuffing flood is rejected before it costs a passport verify and
    // a bcrypt compare each.
    {
      provide: APP_GUARD,
      useClass: ProxyAwareThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}

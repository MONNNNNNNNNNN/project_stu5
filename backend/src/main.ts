import { setDefaultResultOrder } from 'dns';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppModule } from './app.module';

// Render's outbound IPv6 to Gmail SMTP is unreachable (ENETUNREACH); Node resolves
// smtp.gmail.com's AAAA record first by default. Prefer IPv4 for all outbound connections.
setDefaultResultOrder('ipv4first');

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  app.use(
    helmet({
      // The frontend is served from a different origin (Vercel) than this API, so helmet's
      // same-origin default for CORP would block the browser from rendering the avatar and
      // X-ray images these routes stream back.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // Render terminates TLS at its edge and forwards the caller in X-Forwarded-For. Without
  // trusting that one hop every request looks like it came from the proxy, and the rate
  // limiter would count all users as a single client — one burst locking out everyone.
  app.set('trust proxy', 1);

  // NOTE: uploads are deliberately *not* mounted as static assets. `uploads/bone-age/`
  // holds children's radiographs; serving that directory would hand any anonymous caller a
  // medical image, since the filenames travel to the client in API responses. They are
  // streamed instead through guardian-checked routes — see BoneAgeController.image and
  // UsersController.avatar.

  await app.listen(process.env.PORT ?? 3001);
}
void bootstrap();

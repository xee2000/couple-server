import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'warn', 'error', 'debug'],
  });

  // 글로벌 예외 필터 — 모든 오류를 fly.io 로그에 기록
  const { httpAdapter } = app.get(HttpAdapterHost);
  app.useGlobalFilters(new AllExceptionsFilter());

  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');
  Logger.log(`🚀 Server running on port ${port}`, 'Bootstrap');
}
bootstrap();

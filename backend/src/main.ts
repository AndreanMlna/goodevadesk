import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // 1. Security Headers (Helmet)
  app.use(
    helmet({
      contentSecurityPolicy: false, // Swagger UI compatibility
    }),
  );

  // 2. CORS Setup
  const origins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
    : ['http://localhost:5173', 'http://localhost:3000'];

  app.enableCors({
    origin: origins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: ['Content-Type', 'Accept', 'x-api-key', 'X-API-KEY'],
  });

  // 3. Global Pipes & Filters
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  // 4. OpenAPI / Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('GoodevaDesk Support Ticket API')
    .setDescription(
      'Multi-tenant Customer Support Ticket API with Automated LLM Classification & Redis Caching',
    )
    .setVersion('1.0.0')
    .addApiKey(
      {
        type: 'apiKey',
        name: 'x-api-key',
        in: 'header',
        description: 'Organization API Key for multi-tenant isolation',
      },
      'x-api-key',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
    customSiteTitle: 'GoodevaDesk API Documentation',
  });

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');

  logger.log(`🚀 GoodevaDesk Backend API is running on: http://localhost:${port}`);
  logger.log(`📚 Interactive OpenAPI Swagger Docs: http://localhost:${port}/api/docs`);
  logger.log(`🩺 Health Check endpoint: http://localhost:${port}/health`);
}

bootstrap();

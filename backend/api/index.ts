import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import express, { Express, Request, Response } from 'express';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';
import { LoggingInterceptor } from '../src/common/interceptors/logging.interceptor';

const server: Express = express();
let isAppInitialized = false;

async function createNestServer() {
  if (!isAppInitialized) {
    const app = await NestFactory.create(AppModule, new ExpressAdapter(server));

    app.use(
      helmet({
        contentSecurityPolicy: false,
      }),
    );

    const allowedOrigins = process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
      : ['https://goodevadesk.vercel.app', 'http://localhost:5173', 'http://localhost:3000'];

    app.enableCors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (
          allowedOrigins.includes(origin) ||
          origin.endsWith('.vercel.app') ||
          origin.includes('localhost') ||
          process.env.NODE_ENV !== 'production'
        ) {
          return callback(null, true);
        }
        return callback(new Error('Blocked by CORS policy: Origin not allowed.'));
      },
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      credentials: true,
      allowedHeaders: ['Content-Type', 'Accept', 'x-api-key', 'X-API-KEY', 'Authorization'],
    });

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

    await app.init();
    isAppInitialized = true;
  }
  return server;
}

export default async function handler(req: Request, res: Response) {
  await createNestServer();

  // If Vercel rewrote the URL to /api/index, retrieve original requested path from Vercel headers
  if (req.url === '/api/index' || req.url === '/api') {
    const rawPath =
      (req.headers['x-vercel-matched-path'] as string) ||
      (req.headers['x-matched-path'] as string) ||
      (req.headers['x-forwarded-url'] as string);
    if (rawPath && rawPath !== '/api/index' && rawPath !== '/api') {
      req.url = rawPath;
    }
  }

  server(req, res);
}

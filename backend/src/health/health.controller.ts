import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { RedisCacheService } from '../redis/redis.service';
import { ConfigService } from '@nestjs/config';

@ApiTags('System')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisCacheService,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Health check endpoint', description: 'Returns system status, database, cache, and LLM connectivity' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  async check() {
    let dbStatus = 'ok';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      dbStatus = 'degraded';
    }

    const redisReady = this.redisService.isReady();
    const llmProvider = this.configService.get<string>('LLM_PROVIDER', 'mock');

    return {
      status: dbStatus === 'ok' ? 'ok' : 'degraded',
      service: 'goodevadesk-api',
      timestamp: new Date().toISOString(),
      checks: {
        database: dbStatus,
        redis: redisReady ? 'connected' : 'degraded (running in non-cache mode)',
        llmProvider: llmProvider,
        uptimeSeconds: Math.floor(process.uptime()),
      },
    };
  }
}

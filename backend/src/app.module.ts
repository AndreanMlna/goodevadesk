import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { LlmModule } from './llm/llm.module';
import { AuthModule } from './auth/auth.module';
import { TicketsModule } from './tickets/tickets.module';
import { HealthModule } from './health/health.module';
import { KnowledgeBaseModule } from './knowledge-base/knowledge-base.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { EscalationModule } from './escalation/escalation.module';
import { GuardrailsModule } from './guardrails/guardrails.module';
import { VectorModule } from './vector/vector.module';
import { SemanticCacheModule } from './cache/cache.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env'],
    }),
    PrismaModule,
    RedisModule,
    KnowledgeBaseModule,
    VectorModule,
    GuardrailsModule,
    SemanticCacheModule,
    LlmModule,
    AuthModule,
    TicketsModule,
    HealthModule,
    AnalyticsModule,
    WebhooksModule,
    EscalationModule,
  ],
})
export class AppModule {}

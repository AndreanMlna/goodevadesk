import { Module } from '@nestjs/common';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { AuthModule } from '../auth/auth.module';
import { GuardrailsModule } from '../guardrails/guardrails.module';
import { SemanticCacheModule } from '../cache/cache.module';
import { VectorModule } from '../vector/vector.module';

@Module({
  imports: [AuthModule, GuardrailsModule, SemanticCacheModule, VectorModule],
  controllers: [TicketsController],
  providers: [TicketsService],
  exports: [TicketsService],
})
export class TicketsModule {}

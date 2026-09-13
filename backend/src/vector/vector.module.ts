import { Module } from '@nestjs/common';
import { VectorService } from './vector.service';
import { VectorController } from './vector.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { KnowledgeBaseModule } from '../knowledge-base/knowledge-base.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, KnowledgeBaseModule, AuthModule],
  controllers: [VectorController],
  providers: [VectorService],
  exports: [VectorService],
})
export class VectorModule {}

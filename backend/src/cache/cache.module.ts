import { Module } from '@nestjs/common';
import { SemanticCacheService } from './semantic-cache.service';
import { VectorModule } from '../vector/vector.module';

@Module({
  imports: [VectorModule],
  providers: [SemanticCacheService],
  exports: [SemanticCacheService],
})
export class SemanticCacheModule {}

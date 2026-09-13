import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { VectorService } from './vector.service';
import { ApiKeyGuard } from '../auth/api-key.guard';

@ApiTags('Vector RAG')
@ApiHeader({
  name: 'x-api-key',
  description: 'Tenant authentication API Key',
  required: true,
})
@UseGuards(ApiKeyGuard)
@Controller('knowledge-base')
export class VectorController {
  constructor(private readonly vectorService: VectorService) {}

  @Get('vector-search')
  @ApiOperation({
    summary: 'Fase 3: Vector RAG Hybrid Semantic Search',
    description: 'Executes cosine similarity dense vector search combined with keyword sparse search over PostgreSQL knowledge_vectors.',
  })
  @ApiResponse({ status: 200, description: 'Hybrid search ranked SOP results.' })
  async vectorSearch(
    @Query('query') query: string,
    @Query('limit') limit?: string,
  ) {
    const maxResults = limit ? parseInt(limit, 10) : 3;
    return await this.vectorService.hybridSearch(query || '', maxResults);
  }

  @Post('vector-sync')
  @ApiOperation({
    summary: 'Fase 3: Synchronize SOP vectors into PostgreSQL knowledge_vectors',
  })
  @ApiResponse({ status: 200, description: 'Sync completed.' })
  async syncVectors() {
    const count = await this.vectorService.syncSopVectors();
    return { success: true, synced_documents: count };
  }
}

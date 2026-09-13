import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { KnowledgeBaseService } from './knowledge-base.service';
import { ApiKeyGuard } from '../auth/api-key.guard';

@ApiTags('Knowledge Base')
@ApiHeader({
  name: 'x-api-key',
  description: 'Tenant authentication API Key',
  required: true,
})
@UseGuards(ApiKeyGuard)
@Controller('knowledge-base')
export class KnowledgeBaseController {
  constructor(private readonly kbService: KnowledgeBaseService) {}

  @Get()
  @ApiOperation({
    summary: 'List all active SOP documents for RAG anti-hallucination grounding',
  })
  @ApiResponse({ status: 200, description: 'Active SOP documents list.' })
  getDocuments() {
    return this.kbService.getAllDocuments();
  }

  @Post()
  @ApiOperation({
    summary: 'Enterprise: Ingest a new SOP standard operating procedure document',
    description: 'Uploads and indexes a new SOP policy with instant keyword extraction for RAG grounding.',
  })
  @ApiResponse({ status: 201, description: 'Document ingested and indexed.' })
  addDocument(
    @Body()
    body: {
      title: string;
      category: 'billing' | 'technical' | 'general';
      content: string;
      docId?: string;
    },
  ) {
    return this.kbService.addDocument(body);
  }
}

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { LlmService } from './llm.service';
import { KnowledgeBaseService } from '../knowledge-base/knowledge-base.service';
import {
  LlmProvider,
  SupportedGeminiModel,
  SupportedOpenAiModel,
  SupportedAnthropicModel,
  DEFAULT_GEMINI_MODEL,
  DEFAULT_OPENAI_MODEL,
  DEFAULT_ANTHROPIC_MODEL,
  resolveLlmProvider,
  resolveGeminiModel,
  resolveOpenAiModel,
  resolveAnthropicModel,
} from './llm.constants';

describe('LLM Constants & Resolvers (Enterprise Configuration Pattern)', () => {
  describe('resolveLlmProvider', () => {
    it('should resolve valid providers accurately case-insensitively', () => {
      expect(resolveLlmProvider('GEMINI')).toBe(LlmProvider.GEMINI);
      expect(resolveLlmProvider(' openai ')).toBe(LlmProvider.OPENAI);
      expect(resolveLlmProvider('Anthropic')).toBe(LlmProvider.ANTHROPIC);
      expect(resolveLlmProvider('mock')).toBe(LlmProvider.MOCK);
    });

    it('should fallback to mock provider for invalid or undefined values', () => {
      expect(resolveLlmProvider(undefined)).toBe(LlmProvider.MOCK);
      expect(resolveLlmProvider(null)).toBe(LlmProvider.MOCK);
      expect(resolveLlmProvider('')).toBe(LlmProvider.MOCK);
      expect(resolveLlmProvider('unknown-llm')).toBe(LlmProvider.MOCK);
    });
  });

  describe('resolveGeminiModel', () => {
    it('should resolve supported Gemini models', () => {
      expect(resolveGeminiModel('gemini-3.5-flash-lite')).toBe(SupportedGeminiModel.GEMINI_3_5_FLASH_LITE);
      expect(resolveGeminiModel('gemini-2.5-flash')).toBe(SupportedGeminiModel.GEMINI_2_5_FLASH);
    });

    it('should automatically migrate deprecated models to modern enterprise default', () => {
      expect(resolveGeminiModel('gemini-1.5-flash')).toBe(DEFAULT_GEMINI_MODEL);
      expect(resolveGeminiModel('gemini-1.5-pro')).toBe(DEFAULT_GEMINI_MODEL);
    });

    it('should fallback to default if value is empty or undefined', () => {
      expect(resolveGeminiModel(undefined)).toBe(DEFAULT_GEMINI_MODEL);
      expect(resolveGeminiModel('')).toBe(DEFAULT_GEMINI_MODEL);
    });
  });

  describe('resolveOpenAiModel & resolveAnthropicModel', () => {
    it('should resolve supported OpenAI models or fallback to default', () => {
      expect(resolveOpenAiModel('gpt-4o-mini')).toBe(SupportedOpenAiModel.GPT_4O_MINI);
      expect(resolveOpenAiModel(undefined)).toBe(DEFAULT_OPENAI_MODEL);
    });

    it('should resolve supported Anthropic models or fallback to default', () => {
      expect(resolveAnthropicModel('claude-3-5-sonnet-20241022')).toBe(SupportedAnthropicModel.CLAUDE_3_5_SONNET);
      expect(resolveAnthropicModel(undefined)).toBe(DEFAULT_ANTHROPIC_MODEL);
    });
  });
});

describe('LlmService', () => {
  let service: LlmService;
  let kbService: KnowledgeBaseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LlmService,
        KnowledgeBaseService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              if (key === 'LLM_PROVIDER') return 'mock';
              return null;
            }),
          },
        },
      ],
    }).compile();

    kbService = module.get<KnowledgeBaseService>(KnowledgeBaseService);
    kbService.onModuleInit();
    service = module.get<LlmService>(LlmService);
  });

  it('should initialize successfully and classify tickets in mock mode', async () => {
    const result = await service.classifyAndDraft('Invoice payment error', 'I was charged twice');
    expect(result).not.toBeNull();
    expect(result?.category).toBe('billing');
    expect(result?.provider).toBe('mock-engine');
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { ApiKeyGuard } from './api-key.guard';
import { PrismaService } from '../prisma/prisma.service';
import { UnauthorizedException, ExecutionContext } from '@nestjs/common';

describe('ApiKeyGuard', () => {
  let guard: ApiKeyGuard;
  let prismaService: any;

  beforeEach(async () => {
    prismaService = {
      organization: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeyGuard,
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();

    guard = module.get<ApiKeyGuard>(ApiKeyGuard);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should throw UnauthorizedException if x-api-key header is missing', async () => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: {},
          ip: '127.0.0.1',
        }),
      }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(mockContext)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should throw UnauthorizedException if API key is not found in database', async () => {
    prismaService.organization.findUnique.mockResolvedValue(null);

    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { 'x-api-key': 'invalid_key' },
          ip: '127.0.0.1',
        }),
      }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(mockContext)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should attach organization to request and return true for valid API key', async () => {
    const mockOrg = {
      id: 'org-uuid-123',
      name: 'Acme Corp',
      api_key: 'acme_live_key_12345',
    };
    prismaService.organization.findUnique.mockResolvedValue(mockOrg);

    const requestObj: any = {
      headers: { 'x-api-key': 'acme_live_key_12345' },
      ip: '127.0.0.1',
    };

    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => requestObj,
      }),
    } as unknown as ExecutionContext;

    const result = await guard.canActivate(mockContext);
    expect(result).toBe(true);
    expect(requestObj.organization).toEqual(mockOrg);
  });
});

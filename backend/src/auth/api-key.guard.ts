import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Organization } from '@prisma/client';


export interface AuthenticatedRequest extends Request {
  organization: Organization;
}

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);

  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey =
      request.headers['x-api-key'] ||
      request.headers['X-API-KEY'] ||
      request.headers['x-api-token'];

    if (!apiKey || typeof apiKey !== 'string') {
      this.logger.warn(`Authentication failed: Missing x-api-key header from IP: ${request.ip}`);
      throw new UnauthorizedException({
        statusCode: 401,
        message: 'Authentication required: missing x-api-key header',
        error: 'Unauthorized',
      });
    }

    try {
      const organization = await this.prisma.organization.findUnique({
        where: { api_key: apiKey.trim() },
      });

      if (!organization) {
        this.logger.warn(
          `Authentication failed: Invalid API key provided ("${apiKey.trim().slice(0, 10)}...") from IP: ${request.ip || 'unknown'}`,
        );
        throw new UnauthorizedException({
          statusCode: 401,
          message: 'Authentication failed: invalid x-api-key. Please ensure the organization exists and database is seeded.',
          error: 'Unauthorized',
        });
      }

      // Attach verified organization to request for tenant-scoped operations
      request.organization = organization;
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(
        `Database query error in ApiKeyGuard: ${error instanceof Error ? error.message : error}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new UnauthorizedException({
        statusCode: 401,
        message: 'Authentication failed: unable to verify API key at this time',
        error: 'Unauthorized',
      });
    }
  }
}

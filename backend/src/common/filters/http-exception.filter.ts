import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | object = 'Unexpected error occurred';

    if (
      exception &&
      typeof exception === 'object' &&
      'getStatus' in exception &&
      typeof (exception as any).getStatus === 'function'
    ) {
      status = (exception as any).getStatus();
      const exceptionResponse = (exception as any).getResponse?.();
      message =
        typeof exceptionResponse === 'object' && exceptionResponse !== null && 'message' in exceptionResponse
          ? (exceptionResponse as any).message
          : (exceptionResponse as string) || 'Http exception';
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `[${request.method}] ${request.url} - Status: ${status} - ServerError: ${JSON.stringify(message)}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(
        `[${request.method}] ${request.url} - Status: ${status} - ClientWarning: ${JSON.stringify(message)}`,
      );
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
    });
  }
}

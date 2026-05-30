import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.message
        : (exception as Error)?.message ?? '알 수 없는 오류';

    const stack =
      exception instanceof Error ? exception.stack : undefined;

    // 4xx는 WARN, 5xx는 ERROR
    const logLine = `[${req.method}] ${req.url} → ${status} | ${message}`;
    if (status >= 500) {
      this.logger.error(logLine, stack);
    } else {
      this.logger.warn(logLine);
    }

    res.status(status).json({
      statusCode: status,
      message,
      path: req.url,
      timestamp: new Date().toISOString(),
    });
  }
}

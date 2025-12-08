import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

type MongoErrorLike = {
  code?: number;
  message?: string;
  keyValue?: Record<string, unknown>;
};

@Catch()
export class MongoExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();

    const e = exception as MongoErrorLike;

    // Duplicate key error
    if (e && e.code === 11000) {
      return res.status(HttpStatus.CONFLICT).json({
        statusCode: HttpStatus.CONFLICT,
        error: 'Conflict',
        message: 'Duplicate key',
        details: e.keyValue ?? null,
      });
    }

    // Not handled: let Nest default handler deal with it
    throw exception;
  }
}

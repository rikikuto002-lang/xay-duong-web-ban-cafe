import type { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger.js';

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const requestId = `req-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  res.setHeader('X-Request-Id', requestId);

  res.on('finish', () => {
    const durationMs = Date.now() - start;
    const logData = {
      requestId,
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      durationMs
    };

    if (res.statusCode >= 500) {
      logger.error('HTTP Request failed with server error', logData);
    } else if (res.statusCode >= 400) {
      logger.warn('HTTP Request failed with client error', logData);
    } else {
      logger.info('HTTP Request processed successfully', logData);
    }
  });

  next();
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const error = err instanceof Error ? err : new Error(String(err));
  const requestId = res.getHeader('X-Request-Id') as string | undefined;

  logger.error('Unhandled Application Exception Caught', {
    requestId,
    method: req.method,
    url: req.originalUrl,
    error
  });

  res.status(500).json({
    success: false,
    message: 'Đã xảy ra lỗi máy chủ nội bộ. Vui lòng thử lại sau.',
    requestId,
    ...(process.env.NODE_ENV !== 'production' ? { stack: error.stack } : {})
  });
}

import type { Context, Next } from 'hono';
import { logger } from '../lib/logger.js';

export async function requestLogger(c: Context, next: Next) {
  const start = Date.now();
  const requestId = `req-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  c.header('X-Request-Id', requestId);

  await next();

  const durationMs = Date.now() - start;
  const status = c.res.status;
  const logData = {
    requestId,
    method: c.req.method,
    url: c.req.url,
    status,
    durationMs
  };

  if (status >= 500) {
    logger.error('HTTP Request failed with server error', logData);
  } else if (status >= 400) {
    logger.warn('HTTP Request failed with client error', logData);
  } else {
    logger.info('HTTP Request processed successfully', logData);
  }
}

export function errorHandler(err: unknown, c: Context) {
  const error = err instanceof Error ? err : new Error(String(err));
  const requestId = c.res.headers.get('X-Request-Id') ?? undefined;

  logger.error('Unhandled Application Exception Caught', {
    requestId,
    method: c.req.method,
    url: c.req.url,
    error
  });

  return c.json({
    success: false,
    message: 'Đã xảy ra lỗi máy chủ nội bộ. Vui lòng thử lại sau.',
    requestId,
    ...(process.env.NODE_ENV !== 'production' ? { stack: error.stack } : {})
  }, 500);
}

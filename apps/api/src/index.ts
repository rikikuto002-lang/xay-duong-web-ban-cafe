import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { env } from './config/env.js';
import authRouter from './routes/auth.js';
import productsRouter from './routes/products.js';
import cartRouter from './routes/cart.js';
import ordersRouter from './routes/orders.js';
import categoriesRouter from './routes/categories.js';
import uploadRouter from './routes/upload.js';
import adminStatsRouter from './routes/adminStats.js';
import reservationsRouter from './routes/reservations.js';
import couponsRouter from './routes/coupons.js';
import shippingRouter from './routes/shipping.js';
import reviewsRouter from './routes/reviews.js';
import { requestLogger, errorHandler } from './middleware/errorHandler.js';
import { logger } from './lib/logger.js';

const app = new Hono();

app.use('*', cors());
app.use('*', requestLogger);

// Cloudflare Workers bindings bridge
app.use('*', async (c, next) => {
  if (c.env) {
    const envBindings = c.env as Record<string, unknown>;
    if (envBindings.DB) {
      (globalThis as Record<string, unknown>).DB = envBindings.DB;
    }
    if (envBindings.PRODUCT_IMAGES) {
      (globalThis as Record<string, unknown>).PRODUCT_IMAGES = envBindings.PRODUCT_IMAGES;
    }
  }
  await next();
});

app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    environment: env.nodeEnv,
    service: 'cafe-api',
    uptimeSeconds: process.uptime()
  });
});

app.route('/api/auth', authRouter);
app.route('/api/categories', categoriesRouter);
app.route('/api/products', productsRouter);
app.route('/api/cart', cartRouter);
app.route('/api/orders', ordersRouter);
app.route('/api/upload', uploadRouter);
app.route('/api/admin', adminStatsRouter);
app.route('/api/reservations', reservationsRouter);
app.route('/api/coupons', couponsRouter);
app.route('/api/shipping', shippingRouter);
app.route('/api/reviews', reviewsRouter);

app.onError(errorHandler);

const isWorkers =
  typeof (globalThis as { WebSocketPair?: unknown }).WebSocketPair !== 'undefined' ||
  (typeof navigator !== 'undefined' && navigator.userAgent?.includes('Cloudflare-Workers'));

const isTestEnv =
  typeof process !== 'undefined' &&
  (process.env.NODE_ENV === 'test' ||
    Boolean(process.env.NODE_TEST_CONTEXT) ||
    process.argv?.some((arg) => arg.includes('test')));

if (!isWorkers && !isTestEnv) {
  serve({
    fetch: app.fetch,
    port: env.port
  }, () => {
    logger.info(`Cafe API (Hono) running at PUBLIC_API_URL=https://ban-cafe-api.rikikuto002.workers.dev
:${env.port}`, { port: env.port });
  });
}

export default app;

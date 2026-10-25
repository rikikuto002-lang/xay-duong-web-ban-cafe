import express from 'express';
import cors from 'cors';
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

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(requestLogger);

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    environment: env.nodeEnv,
    service: 'cafe-api',
    uptimeSeconds: process.uptime()
  });
});

app.use('/api/auth', authRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/products', productsRouter);
app.use('/api/cart', cartRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/admin', adminStatsRouter);
app.use('/api/reservations', reservationsRouter);
app.use('/api/coupons', couponsRouter);
app.use('/api/shipping', shippingRouter);
app.use('/api/reviews', reviewsRouter);

// Global Error Handler
app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  app.listen(env.port, () => {
    logger.info(`Cafe API running at http://localhost:${env.port}`, { port: env.port });
  });
}

export default app;

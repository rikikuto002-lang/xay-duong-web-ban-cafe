import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { categories, products } from './data/mockData.js';
import authRouter from './routes/auth.js';
import productsRouter from './routes/products.js';
import cartRouter from './routes/cart.js';
import ordersRouter from './routes/orders.js';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    environment: env.nodeEnv,
    service: 'cafe-api'
  });
});

app.get('/api/categories', (req, res) => {
  res.json({ categories });
});

app.get('/api/products', (req, res) => {
  res.json({ products });
});

app.use('/api/auth', authRouter);
app.use('/api/products', productsRouter);
app.use('/api/cart', cartRouter);
app.use('/api/orders', ordersRouter);

app.listen(env.port, () => {
  console.log(`API running at http://localhost:${env.port}`);
});

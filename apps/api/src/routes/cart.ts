import { Router } from 'express';
import { cartItems, products } from '../data/mockData.js';
import { authMiddleware } from '../middleware/auth.js';
import type { AuthUser } from '../middleware/auth.js';

const router = Router();

// GET /api/cart - get user's cart
router.get('/', authMiddleware, (_req, res) => {

  // In a real app, cart would be stored per-user in database
  // For now, return the global cartItems for demo
  const items = cartItems.map((entry) => {
    const product = products.find((item) => item.id === entry.productId);
    return {
      productId: entry.productId,
      quantity: entry.quantity,
      name: product?.name,
      price: product?.price,
      total: (product?.price ?? 0) * entry.quantity
    };
  });

  res.json({
    message: 'Giỏ hàng hiện tại',
    items,
    total: items.reduce((sum, item) => sum + (item.total ?? 0), 0)
  });
});

// POST /api/cart/add - add item to cart
router.post('/add', authMiddleware, (req, res) => {
  const { productId, quantity = 1 } = req.body;

  cartItems.push({ productId, quantity });

  res.status(200).json({
    message: 'Đã thêm sản phẩm vào giỏ hàng',
    item: { productId, quantity }
  });
});

export default router;
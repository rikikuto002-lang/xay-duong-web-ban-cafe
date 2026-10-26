import { Hono } from 'hono';
import { cartItems, products } from '../data/mockData.js';
import { authMiddleware } from '../middleware/auth.js';

const router = new Hono();

// GET /api/cart - get user's cart
router.get('/', authMiddleware, (c) => {
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

  return c.json({
    message: 'Giỏ hàng hiện tại',
    items,
    total: items.reduce((sum, item) => sum + (item.total ?? 0), 0)
  });
});

// POST /api/cart/add - add item to cart
router.post('/add', authMiddleware, async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { productId, quantity = 1 } = body ?? {};

  cartItems.push({ productId, quantity });

  return c.json({
    message: 'Đã thêm sản phẩm vào giỏ hàng',
    item: { productId, quantity }
  });
});

export default router;

import { Hono } from 'hono';
import { getDatabase } from '../lib/database.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = new Hono();

// Public: list products
router.get('/', async (c) => {
  const category = c.req.query('category');
  const db = await getDatabase();
  const products = await db.listProducts(category ? String(category) : undefined);

  return c.json({
    message: 'Danh sách sản phẩm',
    products
  });
});

// Public: get product by ID
router.get('/:id', async (c) => {
  const db = await getDatabase();
  const id = Number(c.req.param('id'));
  const product = await db.getProductById(id);

  if (!product) {
    return c.json({ message: 'Không tìm thấy sản phẩm' }, 404);
  }

  return c.json({ product });
});

// Admin only: create product
router.post('/', authMiddleware, requireRole('admin'), async (c) => {
  const payload = await c.req.json().catch(() => ({}));
  const db = await getDatabase();

  const newProduct = await db.createProduct({
    id: Date.now(),
    name: payload.name,
    category: payload.category,
    price: Number(payload.price),
    stock: Number(payload.stock ?? 0),
    image: payload.image ?? 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=800&q=80',
    description: payload.description ?? 'Sản phẩm mới'
  });

  return c.json({
    message: 'Thêm sản phẩm thành công',
    product: newProduct
  }, 201);
});

// Admin only: update product
router.put('/:id', authMiddleware, requireRole('admin'), async (c) => {
  const payload = await c.req.json().catch(() => ({}));
  const db = await getDatabase();
  const id = Number(c.req.param('id'));

  const updated = await db.updateProduct(id, {
    name: payload.name,
    category: payload.category,
    price: Number(payload.price),
    stock: Number(payload.stock ?? 0),
    image: payload.image,
    description: payload.description
  });

  if (!updated) {
    return c.json({ message: 'Không tìm thấy sản phẩm để cập nhật' }, 404);
  }

  return c.json({
    message: 'Cập nhật sản phẩm thành công',
    product: updated
  });
});

// Admin only: delete product
router.delete('/:id', authMiddleware, requireRole('admin'), async (c) => {
  const db = await getDatabase();
  const id = Number(c.req.param('id'));

  const deleted = await db.deleteProduct(id);
  if (!deleted) {
    return c.json({ message: 'Không tìm thấy sản phẩm để xoá' }, 404);
  }

  return c.json({ message: 'Xoá sản phẩm thành công', id });
});

export default router;

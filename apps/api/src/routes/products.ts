import { Router } from 'express';
import { getDatabase } from '../lib/database.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = Router();

// Public: list products
router.get('/', async (req, res) => {
  const { category } = req.query;
  const db = await getDatabase();
  const products = await db.listProducts(category ? String(category) : undefined);

  res.json({
    message: 'Danh sách sản phẩm',
    products
  });
});

// Public: get product by ID
router.get('/:id', async (req, res) => {
  const db = await getDatabase();
  const product = await db.getProductById(Number(req.params.id));

  if (!product) {
    return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
  }

  return res.json({ product });
});

// Admin only: create product
router.post('/', authMiddleware, requireRole('admin'), async (req, res) => {
  const payload = req.body;
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

  res.status(201).json({
    message: 'Thêm sản phẩm thành công',
    product: newProduct
  });
});

// Admin only: update product
router.put('/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  const payload = req.body;
  const db = await getDatabase();
  const id = Number(req.params.id);

  const updated = await db.updateProduct(id, {
    name: payload.name,
    category: payload.category,
    price: Number(payload.price),
    stock: Number(payload.stock ?? 0),
    image: payload.image,
    description: payload.description
  });

  if (!updated) {
    return res.status(404).json({ message: 'Không tìm thấy sản phẩm để cập nhật' });
  }

  return res.json({
    message: 'Cập nhật sản phẩm thành công',
    product: updated
  });
});

// Admin only: delete product
router.delete('/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  const db = await getDatabase();
  const id = Number(req.params.id);

  const deleted = await db.deleteProduct(id);
  if (!deleted) {
    return res.status(404).json({ message: 'Không tìm thấy sản phẩm để xoá' });
  }

  return res.json({ message: 'Xoá sản phẩm thành công', id });
});

export default router;
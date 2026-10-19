import { Router } from 'express';
import { getDatabase } from '../lib/database.js';
import { products as mockProducts } from '../data/mockData.js';

const router = Router();

router.get('/', async (req, res) => {
  const { category } = req.query;
  const db = await getDatabase();
  const products = await db.listProducts(category ? String(category) : undefined);

  res.json({
    message: 'Danh sách sản phẩm',
    products
  });
});

router.get('/:id', async (req, res) => {
  const db = await getDatabase();
  const product = await db.getProductById(Number(req.params.id));

  if (!product) {
    return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
  }

  return res.json({ product });
});

router.post('/', async (req, res) => {
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

  mockProducts.unshift(newProduct);

  res.status(201).json({
    message: 'Thêm sản phẩm thành công',
    product: newProduct
  });
});

router.put('/:id', async (req, res) => {
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

  const index = mockProducts.findIndex((product) => product.id === id);
  if (index >= 0) {
    mockProducts[index] = updated;
  }

  return res.json({
    message: 'Cập nhật sản phẩm thành công',
    product: updated
  });
});

router.delete('/:id', async (req, res) => {
  const db = await getDatabase();
  const id = Number(req.params.id);

  const deleted = await db.deleteProduct(id);
  if (!deleted) {
    return res.status(404).json({ message: 'Không tìm thấy sản phẩm để xoá' });
  }

  const index = mockProducts.findIndex((product) => product.id === id);
  if (index >= 0) {
    mockProducts.splice(index, 1);
  }

  return res.json({ message: 'Xoá sản phẩm thành công', id });
});

export default router;

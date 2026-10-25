import { Router } from 'express';
import { getDatabase } from '../lib/database.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = Router();

// Public: list categories
router.get('/', async (_req, res) => {
  const db = await getDatabase();
  const categories = await db.listCategories();
  res.json({
    message: 'Danh sách danh mục',
    categories
  });
});

// Admin only: create category
router.post('/', authMiddleware, requireRole('admin'), async (req, res) => {
  const { name } = req.body ?? {};
  if (!name || !String(name).trim()) {
    return res.status(400).json({ message: 'Tên danh mục không được để trống.' });
  }

  const db = await getDatabase();
  const newCategory = await db.createCategory({ name: String(name).trim() });
  return res.status(201).json({
    message: 'Thêm danh mục thành công',
    category: newCategory
  });
});

// Admin only: update category
router.put('/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  const { name } = req.body ?? {};
  const id = Number(req.params.id);
  if (!name || !String(name).trim()) {
    return res.status(400).json({ message: 'Tên danh mục không được để trống.' });
  }

  const db = await getDatabase();
  const updated = await db.updateCategory(id, { name: String(name).trim() });
  if (!updated) {
    return res.status(404).json({ message: 'Không tìm thấy danh mục để cập nhật.' });
  }

  return res.json({
    message: 'Cập nhật danh mục thành công',
    category: updated
  });
});

// Admin only: delete category
router.delete('/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  const id = Number(req.params.id);
  const db = await getDatabase();
  const success = await db.deleteCategory(id);
  if (!success) {
    return res.status(404).json({ message: 'Không tìm thấy danh mục để xóa.' });
  }

  return res.json({ message: 'Xóa danh mục thành công', id });
});

export default router;


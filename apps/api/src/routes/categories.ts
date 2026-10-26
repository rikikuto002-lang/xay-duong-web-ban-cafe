import { Hono } from 'hono';
import { getDatabase } from '../lib/database.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = new Hono();

// Public: list categories
router.get('/', async (c) => {
  const db = await getDatabase();
  const categories = await db.listCategories();
  return c.json({
    message: 'Danh sách danh mục',
    categories
  });
});

// Admin only: create category
router.post('/', authMiddleware, requireRole('admin'), async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { name } = body ?? {};
  if (!name || !String(name).trim()) {
    return c.json({ message: 'Tên danh mục không được để trống.' }, 400);
  }

  const db = await getDatabase();
  const newCategory = await db.createCategory({ name: String(name).trim() });
  return c.json({
    message: 'Thêm danh mục thành công',
    category: newCategory
  }, 201);
});

// Admin only: update category
router.put('/:id', authMiddleware, requireRole('admin'), async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { name } = body ?? {};
  const id = Number(c.req.param('id'));
  if (!name || !String(name).trim()) {
    return c.json({ message: 'Tên danh mục không được để trống.' }, 400);
  }

  const db = await getDatabase();
  const updated = await db.updateCategory(id, { name: String(name).trim() });
  if (!updated) {
    return c.json({ message: 'Không tìm thấy danh mục để cập nhật.' }, 404);
  }

  return c.json({
    message: 'Cập nhật danh mục thành công',
    category: updated
  });
});

// Admin only: delete category
router.delete('/:id', authMiddleware, requireRole('admin'), async (c) => {
  const id = Number(c.req.param('id'));
  const db = await getDatabase();
  const success = await db.deleteCategory(id);
  if (!success) {
    return c.json({ message: 'Không tìm thấy danh mục để xóa.' }, 404);
  }

  return c.json({ message: 'Xóa danh mục thành công', id });
});

export default router;

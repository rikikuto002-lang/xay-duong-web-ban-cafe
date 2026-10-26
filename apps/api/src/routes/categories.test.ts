import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../index.js';
import { getDatabase } from '../lib/database.js';
import { createToken } from '../middleware/auth.js';

test('Category CRUD: list, create, update, delete in database', async () => {
  const db = await getDatabase();
  const adminToken = createToken({ id: 'admin-1', email: 'admin@cafeshop.vn', name: 'Admin', role: 'admin' });

  // 1. List categories
  const listRes = await app.request('/api/categories', { method: 'GET' });
  assert.equal(listRes.status, 200);
  const listData = await listRes.json();
  assert.ok(Array.isArray(listData.categories));
  const initialCount = listData.categories.length;

  // 2. Create category
  const createRes = await app.request('/api/categories', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({ name: 'Cà phê ủ lạnh Cold Brew' })
  });
  assert.equal(createRes.status, 201);
  const createData = await createRes.json();
  const createdCat = createData.category;
  assert.equal(createdCat.name, 'Cà phê ủ lạnh Cold Brew');

  const afterCreateList = await db.listCategories();
  assert.equal(afterCreateList.length, initialCount + 1);

  // 3. Update category
  const updated = await db.updateCategory(createdCat.id, { name: 'Cold Brew Đặc Biệt' });
  assert.ok(updated);
  assert.equal(updated?.name, 'Cold Brew Đặc Biệt');

  // 4. Delete category
  const deleted = await db.deleteCategory(createdCat.id);
  assert.equal(deleted, true);
  const afterDeleteList = await db.listCategories();
  assert.equal(afterDeleteList.length, initialCount);
});

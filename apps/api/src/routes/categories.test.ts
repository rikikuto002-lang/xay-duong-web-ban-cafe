import test from 'node:test';
import assert from 'node:assert/strict';

function createMockRes() {
  const res: any = {
    statusCode: 200,
    body: null,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: any) {
      this.body = data;
      return this;
    }
  };
  return res;
}

test('Category CRUD: list, create, update, delete in database', async () => {
  const { default: categoriesRouter } = await import('./categories.js');
  const { getDatabase } = await import('../lib/database.js');
  const db = await getDatabase();

  const getRoute = (categoriesRouter as any).stack.find((l: any) => l.route?.path === '/' && l.route?.methods?.get);
  assert.ok(getRoute);
  const [getHandler] = getRoute.route.stack.map((s: any) => s.handle);

  const postRoute = (categoriesRouter as any).stack.find((l: any) => l.route?.path === '/' && l.route?.methods?.post);
  assert.ok(postRoute);
  const [, , postHandler] = postRoute.route.stack.map((s: any) => s.handle);

  // 1. List categories
  const listRes = createMockRes();
  await getHandler({}, listRes);
  assert.equal(listRes.statusCode, 200);
  assert.ok(Array.isArray(listRes.body.categories));
  const initialCount = listRes.body.categories.length;

  // 2. Create category
  const createReq: any = {
    body: { name: 'Cà phê ủ lạnh Cold Brew' },
    user: { id: 'admin-1', role: 'admin' }
  };
  const createRes = createMockRes();
  await postHandler(createReq, createRes);
  assert.equal(createRes.statusCode, 201);
  const createdCat = createRes.body.category;
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


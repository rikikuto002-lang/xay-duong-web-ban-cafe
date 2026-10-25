import test from 'node:test';
import assert from 'node:assert/strict';

import { products } from '../data/mockData.js';
import { validateCheckoutPayload } from './orders.js';

test('checkout rejects invalid stock before creating an order', () => {
  const result = validateCheckoutPayload(
    {
      customerName: 'Nguyễn Văn A',
      phone: '0900000002',
      address: '123 Đường ABC',
      paymentMethod: 'bank-transfer',
      userEmail: 'customer@example.com',
      total: 999999,
      items: [{ productId: 1, quantity: 999 }]
    },
    products
  );

  assert.equal(result.ok, false);
  assert.match(result.message ?? '', /không đủ/i);
});

test('checkout recalculates total from server-side product prices', () => {
  const result = validateCheckoutPayload(
    {
      customerName: 'Nguyễn Văn A',
      phone: '0900000002',
      address: '123 Đường ABC',
      paymentMethod: 'bank-transfer',
      userEmail: 'customer@example.com',
      total: 1,
      items: [{ productId: 1, quantity: 2 }]
    },
    products
  );

  assert.equal(result.ok, true);
  assert.equal(result.total, 90000 + 15000);
  assert.equal(result.subtotal, 90000);
});

test('order creation persists both order metadata and order item records', async () => {
  const { getDatabase } = await import('../lib/database.js');
  const db = await getDatabase();

  const created = await db.createOrder({
    userEmail: 'customer@example.com',
    customerName: 'Nguyễn Văn A',
    phone: '0900000002',
    address: '123 Đường ABC',
    paymentMethod: 'bank-transfer',
    total: 250000,
    status: 'pending',
    items: [
      { productId: 1, quantity: 2, price: 45000, name: 'Cà phê sữa đá' }
    ]
  });

  const byId = await db.getOrderById(created.id);
  assert.ok(byId);
  assert.deepEqual(byId?.items?.[0]?.productId, 1);
  assert.deepEqual((await db.listOrders('customer@example.com')).length >= 1, true);
});

// Helper for testing express router handlers in-memory without TCP socket
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

test('GET /api/orders enforces auth and ignores client-supplied ?role=admin query param', async () => {
  const { default: ordersRouter } = await import('./orders.js');
  const { authMiddleware } = await import('../middleware/auth.js');
  const { getDatabase } = await import('../lib/database.js');
  const db = await getDatabase();

  const order1 = await db.createOrder({
    userEmail: 'alice@example.com',
    customerName: 'Alice',
    phone: '0900000001',
    address: 'Address 1',
    paymentMethod: 'cod',
    total: 50000,
    status: 'pending',
    items: [{ productId: 1, quantity: 1, price: 50000, name: 'Cà phê đen' }]
  });

  const order2 = await db.createOrder({
    userEmail: 'bob@example.com',
    customerName: 'Bob',
    phone: '0900000002',
    address: 'Address 2',
    paymentMethod: 'cod',
    total: 60000,
    status: 'pending',
    items: [{ productId: 2, quantity: 1, price: 60000, name: 'Cappuccino' }]
  });

  // Find router handlers
  const listRoute = (ordersRouter as any).stack.find((layer: any) => layer.route?.path === '/' && layer.route?.methods?.get);
  assert.ok(listRoute, 'GET / handler found');
  const [authMw, listHandler] = listRoute.route.stack.map((s: any) => s.handle);

  // 1. Without auth token -> 401
  const unauthReq: any = { headers: {}, query: { role: 'admin' } };
  const unauthRes = createMockRes();
  let nextCalled = false;
  authMw(unauthReq, unauthRes, () => { nextCalled = true; });
  assert.equal(nextCalled, false);
  assert.equal(unauthRes.statusCode, 401);

  // 2. Customer user with ?role=admin query param -> role must remain customer, only seeing Alice's orders
  const customerReq: any = {
    headers: {},
    query: { role: 'admin' },
    user: { id: 'alice-1', email: 'alice@example.com', name: 'Alice', role: 'customer' }
  };
  const customerRes = createMockRes();
  await listHandler(customerReq, customerRes);
  assert.equal(customerRes.statusCode, 200);
  assert.ok(customerRes.body.orders.length > 0);
  for (const o of customerRes.body.orders) {
    assert.equal(o.customerEmail.toLowerCase(), 'alice@example.com');
  }

  // 3. Admin user -> sees all orders
  const adminReq: any = {
    headers: {},
    query: {},
    user: { id: 'admin-1', email: 'admin@cafeshop.vn', name: 'Admin', role: 'admin' }
  };
  const adminRes = createMockRes();
  await listHandler(adminReq, adminRes);
  assert.equal(adminRes.statusCode, 200);
  const ids = adminRes.body.orders.map((o: any) => o.id);
  assert.ok(ids.includes(order1.id));
  assert.ok(ids.includes(order2.id));
});

test('GET /api/orders/:id prevents IDOR: customer cannot access another customer order', async () => {
  const { default: ordersRouter } = await import('./orders.js');
  const { getDatabase } = await import('../lib/database.js');
  const db = await getDatabase();

  const bobsOrder = await db.createOrder({
    userEmail: 'bob_secret@example.com',
    customerName: 'Bob Secret',
    phone: '0900000009',
    address: 'Private Address',
    paymentMethod: 'bank-transfer',
    total: 120000,
    status: 'pending',
    items: [{ productId: 1, quantity: 2, price: 60000, name: 'Item' }]
  });

  const getByIdRoute = (ordersRouter as any).stack.find((layer: any) => layer.route?.path === '/:id' && layer.route?.methods?.get);
  assert.ok(getByIdRoute, 'GET /:id handler found');
  const [, getByIdHandler] = getByIdRoute.route.stack.map((s: any) => s.handle);

  // Alice tries to get Bob's order by ID -> 403 Forbidden
  const aliceReq: any = {
    params: { id: bobsOrder.id },
    user: { id: 'alice-1', email: 'alice@example.com', name: 'Alice', role: 'customer' }
  };
  const aliceRes = createMockRes();
  await getByIdHandler(aliceReq, aliceRes);
  assert.equal(aliceRes.statusCode, 403);
  assert.match(aliceRes.body.message, /không có quyền/i);

  // Bob requests own order -> 200 OK
  const bobReq: any = {
    params: { id: bobsOrder.id },
    user: { id: 'bob-1', email: 'bob_secret@example.com', name: 'Bob Secret', role: 'customer' }
  };
  const bobRes = createMockRes();
  await getByIdHandler(bobReq, bobRes);
  assert.equal(bobRes.statusCode, 200);
  assert.equal(bobRes.body.order.id, bobsOrder.id);

  // Admin requests Bob's order -> 200 OK
  const adminReq: any = {
    params: { id: bobsOrder.id },
    user: { id: 'admin-1', email: 'admin@cafeshop.vn', name: 'Admin', role: 'admin' }
  };
  const adminRes = createMockRes();
  await getByIdHandler(adminReq, adminRes);
  assert.equal(adminRes.statusCode, 200);
  assert.equal(adminRes.body.order.id, bobsOrder.id);
});


test('POST /api/orders/checkout validates stock from DB, deducts stock, and saves order items', async () => {
  const { default: ordersRouter } = await import('./orders.js');
  const { getDatabase } = await import('../lib/database.js');
  const db = await getDatabase();
  const product = await db.getProductById(1);
  assert.ok(product);
  const initialStock = product.stock;

  const checkoutRoute = (ordersRouter as any).stack.find((l: any) => l.route?.path === '/checkout' && l.route?.methods?.post);
  assert.ok(checkoutRoute);
  const [, checkoutHandler] = checkoutRoute.route.stack.map((s: any) => s.handle);

  // 1. Checkout exceeding stock -> returns 409 and stock is unchanged
  const badReq: any = {
    body: { customerName: 'Khách test', phone: '0912345678', address: '123 Đường', items: [{ productId: 1, quantity: initialStock + 10 }] },
    user: { id: 'user-1', email: 'test@example.com', name: 'Test', role: 'customer' }
  };
  const badRes = createMockRes();
  await checkoutHandler(badReq, badRes);
  assert.equal(badRes.statusCode, 409);
  const productAfterFail = await db.getProductById(1);
  assert.equal(productAfterFail?.stock, initialStock);

  // 2. Checkout valid -> returns 201, deducts stock and saves order_items
  const goodReq: any = {
    body: { customerName: 'Khách test', phone: '0912345678', address: '123 Đường', items: [{ productId: 1, quantity: 2 }] },
    user: { id: 'user-1', email: 'test@example.com', name: 'Test', role: 'customer' }
  };
  const goodRes = createMockRes();
  await checkoutHandler(goodReq, goodRes);
  assert.equal(goodRes.statusCode, 201);
  assert.ok(goodRes.body.order?.id);
  assert.equal(goodRes.body.order.items.length, 1);
  assert.equal(goodRes.body.order.items[0].quantity, 2);

  const productAfterSuccess = await db.getProductById(1);
  assert.equal(productAfterSuccess?.stock, initialStock - 2);
});


test('generateVietQrUrl generates dynamic NAPAS/VietQR payment URL', async () => {
  const { generateVietQrUrl } = await import('./orders.js');
  const url = generateVietQrUrl({
    amount: 145000,
    orderId: 'ORD-999',
    accountNumber: '1023456789'
  });
  assert.ok(url.includes('https://img.vietqr.io/image/'));
  assert.ok(url.includes('145000'));
  assert.ok(url.includes('ORD-999'));
});

test('Webhook /api/orders/webhook/payment automatically reconciles payment and switches status to paid', async () => {
  const { default: ordersRouter } = await import('./orders.js');
  const { getDatabase } = await import('../lib/database.js');
  const db = await getDatabase();

  const order = await db.createOrder({
    userEmail: 'customer@example.com',
    customerName: 'Nguyen Van A',
    phone: '0900000001',
    address: '123 Le Loi',
    paymentMethod: 'bank-transfer',
    paymentStatus: 'unpaid',
    total: 105000,
    status: 'pending',
    items: [{ productId: 1, quantity: 2, price: 45000, name: 'Cafe' }]
  });

  const webhookRoute = (ordersRouter as any).stack.find((l: any) => l.route?.path === '/webhook/payment' && l.route?.methods?.post);
  assert.ok(webhookRoute);
  const [webhookHandler] = webhookRoute.route.stack.map((s: any) => s.handle);

  const req: any = {
    body: {
      orderId: order.id,
      amount: 105000,
      transactionId: 'TXN-ABC123XYZ',
      content: `CAFE ${order.id}`
    }
  };
  const res = createMockRes();
  await webhookHandler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);

  const updated = await db.getOrderById(order.id);
  assert.equal(updated?.paymentStatus, 'paid');
  assert.equal(updated?.status, 'confirmed');
  assert.ok(updated?.history.some((h) => h.status === 'payment_paid'));
});

test('Customer can cancel pending order and product stock is restored', async () => {
  const { default: ordersRouter } = await import('./orders.js');
  const { getDatabase } = await import('../lib/database.js');
  const db = await getDatabase();

  const product = await db.getProductById(2);
  assert.ok(product);
  const stockBefore = product.stock;

  const order = await db.createOrder({
    userEmail: 'cancel_user@example.com',
    customerName: 'Cancel User',
    phone: '0900000002',
    address: '456 Nguyen Hue',
    paymentMethod: 'cod',
    paymentStatus: 'unpaid',
    total: 59000,
    status: 'pending',
    items: [{ productId: 2, quantity: 3, price: 59000, name: 'Cappuccino' }]
  });

  const cancelRoute = (ordersRouter as any).stack.find((l: any) => l.route?.path === '/:id/cancel' && l.route?.methods?.post);
  assert.ok(cancelRoute);
  const [, cancelHandler] = cancelRoute.route.stack.map((s: any) => s.handle);

  const req: any = {
    params: { id: order.id },
    body: { reason: 'Khách đổi ý' },
    user: { id: 'user-c', email: 'cancel_user@example.com', name: 'Cancel User', role: 'customer' }
  };
  const res = createMockRes();
  await cancelHandler(req, res);

  assert.equal(res.statusCode, 200);
  const updatedOrder = await db.getOrderById(order.id);
  assert.equal(updatedOrder?.status, 'cancelled');

  // Verify stock was restored (+3)
  const productAfter = await db.getProductById(2);
  assert.equal(productAfter?.stock, stockBefore + 3);
});

test('State transitions are strictly validated (cannot transition completed -> pending)', async () => {
  const { default: ordersRouter } = await import('./orders.js');
  const { getDatabase } = await import('../lib/database.js');
  const db = await getDatabase();

  const order = await db.createOrder({
    userEmail: 'done@example.com',
    customerName: 'Done User',
    phone: '0900000003',
    address: '789 D',
    paymentMethod: 'cod',
    paymentStatus: 'paid',
    total: 99000,
    status: 'completed',
    items: [{ productId: 1, quantity: 1, price: 45000, name: 'Cafe' }]
  });

  const patchRoute = (ordersRouter as any).stack.find((l: any) => l.route?.path === '/:id/status' && l.route?.methods?.patch);
  assert.ok(patchRoute);
  const [, , patchHandler] = patchRoute.route.stack.map((s: any) => s.handle);

  // Admin attempts illegal transition: completed -> pending
  const req: any = {
    params: { id: order.id },
    body: { status: 'pending' },
    user: { id: 'admin-1', email: 'admin@cafeshop.vn', name: 'Admin', role: 'admin' }
  };
  const res = createMockRes();
  await patchHandler(req, res);

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /không hợp lệ/i);
});

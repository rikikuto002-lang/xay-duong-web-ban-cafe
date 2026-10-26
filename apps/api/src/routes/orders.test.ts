import test from 'node:test';
import assert from 'node:assert/strict';

import app from '../index.js';
import { products } from '../data/mockData.js';
import { validateCheckoutPayload, generateVietQrUrl } from './orders.js';
import { getDatabase } from '../lib/database.js';
import { createToken } from '../middleware/auth.js';

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

test('GET /api/orders enforces auth and ignores client-supplied ?role=admin query param', async () => {
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

  // 1. Without auth token -> 401
  const unauthRes = await app.request('/api/orders?role=admin', { method: 'GET' });
  assert.equal(unauthRes.status, 401);

  // 2. Customer user with ?role=admin query param -> role must remain customer, only seeing Alice's orders
  const aliceToken = createToken({ id: 'alice-1', email: 'alice@example.com', name: 'Alice', role: 'customer' });
  const customerRes = await app.request('/api/orders?role=admin', {
    method: 'GET',
    headers: { Authorization: `Bearer ${aliceToken}` }
  });
  assert.equal(customerRes.status, 200);
  const customerData = await customerRes.json();
  assert.ok(customerData.orders.length > 0);
  for (const o of customerData.orders) {
    assert.equal(o.customerEmail.toLowerCase(), 'alice@example.com');
  }

  // 3. Admin user -> sees all orders
  const adminToken = createToken({ id: 'admin-1', email: 'admin@cafeshop.vn', name: 'Admin', role: 'admin' });
  const adminRes = await app.request('/api/orders', {
    method: 'GET',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.equal(adminRes.status, 200);
  const adminData = await adminRes.json();
  const ids = adminData.orders.map((o: any) => o.id);
  assert.ok(ids.includes(order1.id));
  assert.ok(ids.includes(order2.id));
});

test('GET /api/orders/:id prevents IDOR: customer cannot access another customer order', async () => {
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

  const aliceToken = createToken({ id: 'alice-1', email: 'alice@example.com', name: 'Alice', role: 'customer' });
  const bobToken = createToken({ id: 'bob-1', email: 'bob_secret@example.com', name: 'Bob Secret', role: 'customer' });
  const adminToken = createToken({ id: 'admin-1', email: 'admin@cafeshop.vn', name: 'Admin', role: 'admin' });

  // Alice tries to get Bob's order by ID -> 403 Forbidden
  const aliceRes = await app.request(`/api/orders/${bobsOrder.id}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${aliceToken}` }
  });
  assert.equal(aliceRes.status, 403);
  const aliceData = await aliceRes.json();
  assert.match(aliceData.message, /không có quyền/i);

  // Bob requests own order -> 200 OK
  const bobRes = await app.request(`/api/orders/${bobsOrder.id}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${bobToken}` }
  });
  assert.equal(bobRes.status, 200);
  const bobData = await bobRes.json();
  assert.equal(bobData.order.id, bobsOrder.id);

  // Admin requests Bob's order -> 200 OK
  const adminRes = await app.request(`/api/orders/${bobsOrder.id}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.equal(adminRes.status, 200);
  const adminData = await adminRes.json();
  assert.equal(adminData.order.id, bobsOrder.id);
});

test('POST /api/orders/checkout validates stock from DB, deducts stock, and saves order items', async () => {
  const db = await getDatabase();
  const product = await db.getProductById(1);
  assert.ok(product);
  const initialStock = product.stock;
  const userToken = createToken({ id: 'user-1', email: 'test@example.com', name: 'Test', role: 'customer' });

  // 1. Checkout exceeding stock -> returns 409 and stock is unchanged
  const badRes = await app.request('/api/orders/checkout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userToken}`
    },
    body: JSON.stringify({
      customerName: 'Khách test',
      phone: '0912345678',
      address: '123 Đường',
      items: [{ productId: 1, quantity: initialStock + 10 }]
    })
  });
  assert.equal(badRes.status, 409);
  const productAfterFail = await db.getProductById(1);
  assert.equal(productAfterFail?.stock, initialStock);

  // 2. Checkout valid -> returns 201, deducts stock and saves order_items
  const goodRes = await app.request('/api/orders/checkout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userToken}`
    },
    body: JSON.stringify({
      customerName: 'Khách test',
      phone: '0912345678',
      address: '123 Đường',
      items: [{ productId: 1, quantity: 2 }]
    })
  });
  assert.equal(goodRes.status, 201);
  const goodData = await goodRes.json();
  assert.ok(goodData.order?.id);
  assert.equal(goodData.order.items.length, 1);
  assert.equal(goodData.order.items[0].quantity, 2);

  const productAfterSuccess = await db.getProductById(1);
  assert.equal(productAfterSuccess?.stock, initialStock - 2);
});

test('generateVietQrUrl generates dynamic NAPAS/VietQR payment URL', () => {
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

  const res = await app.request('/api/orders/webhook/payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orderId: order.id,
      amount: 105000,
      transactionId: 'TXN-ABC123XYZ',
      content: `CAFE ${order.id}`
    })
  });

  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.success, true);

  const updated = await db.getOrderById(order.id);
  assert.equal(updated?.paymentStatus, 'paid');
  assert.equal(updated?.status, 'confirmed');
  assert.ok(updated?.history.some((h) => h.status === 'payment_paid'));
});

test('Customer can cancel pending order and product stock is restored', async () => {
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

  const cancelToken = createToken({ id: 'user-c', email: 'cancel_user@example.com', name: 'Cancel User', role: 'customer' });
  const res = await app.request(`/api/orders/${order.id}/cancel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cancelToken}`
    },
    body: JSON.stringify({ reason: 'Khách đổi ý' })
  });

  assert.equal(res.status, 200);
  const updatedOrder = await db.getOrderById(order.id);
  assert.equal(updatedOrder?.status, 'cancelled');

  // Verify stock was restored (+3)
  const productAfter = await db.getProductById(2);
  assert.equal(productAfter?.stock, stockBefore + 3);
});

test('State transitions are strictly validated (cannot transition completed -> pending)', async () => {
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

  const adminToken = createToken({ id: 'admin-1', email: 'admin@cafeshop.vn', name: 'Admin', role: 'admin' });
  const res = await app.request(`/api/orders/${order.id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({ status: 'pending' })
  });

  assert.equal(res.status, 400);
  const data = await res.json();
  assert.match(data.message, /không hợp lệ/i);
});

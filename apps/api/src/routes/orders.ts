import { Hono } from 'hono';
import { getDatabase, calculateShippingFee, type DbOrderStatus, type DbPaymentStatus } from '../lib/database.js';
import { products as catalogProducts } from '../data/mockData.js';
import { authMiddleware, requireRole, type AuthUser, type AuthEnv } from '../middleware/auth.js';

const router = new Hono<AuthEnv>();

const normalizeEmail = (value?: string) => String(value ?? '').trim().toLowerCase();

export const BANK_CONFIG = {
  bankId: 'vietcombank',
  bankName: 'Vietcombank',
  accountNumber: '1023456789',
  accountName: 'Cafe Commerce Co., Ltd'
};

export function generateVietQrUrl(params: {
  amount: number;
  orderId: string;
  bankId?: string;
  accountNumber?: string;
  accountName?: string;
}) {
  const bankId = params.bankId || BANK_CONFIG.bankId;
  const accountNumber = params.accountNumber || BANK_CONFIG.accountNumber;
  const accountName = encodeURIComponent(params.accountName || BANK_CONFIG.accountName);
  const memo = encodeURIComponent(`CAFE ${params.orderId}`);
  return `https://img.vietqr.io/image/${bankId}-${accountNumber}-compact2.png?amount=${params.amount}&addInfo=${memo}&accountName=${accountName}`;
}

export const ALLOWED_STATUS_TRANSITIONS: Record<string, DbOrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['shipping', 'cancelled'],
  shipping: ['completed', 'cancelled'],
  completed: [],
  cancelled: []
};

export function validateCheckoutPayload(payload: Record<string, unknown>, productCatalog = catalogProducts) {
  const items = Array.isArray(payload.items) ? payload.items : [];

  if (!items.length) {
    return { ok: false as const, status: 400 as const, message: 'Giỏ hàng đang trống.' };
  }

  const productMap = new Map(productCatalog.map((product) => [product.id, product]));
  const normalizedItems: Array<{ productId: number; quantity: number; price: number; name: string; subtotal: number }> = [];
  let subtotal = 0;

  for (const item of items) {
    const productId = Number((item as { productId?: number })?.productId);
    const quantity = Number((item as { quantity?: number })?.quantity ?? 0);

    if (!Number.isFinite(productId) || productId <= 0) {
      return { ok: false as const, status: 400 as const, message: 'Mã sản phẩm không hợp lệ.' };
    }

    const product = productMap.get(productId);
    if (!product) {
      return { ok: false as const, status: 404 as const, message: `Sản phẩm ${productId} không tồn tại.` };
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      return { ok: false as const, status: 400 as const, message: `Số lượng của ${product.name} không hợp lệ.` };
    }

    if (quantity > product.stock) {
      return { ok: false as const, status: 409 as const, message: `Sản phẩm ${product.name} không đủ số lượng trong kho.` };
    }

    const subtotalForItem = product.price * quantity;
    subtotal += subtotalForItem;

    normalizedItems.push({
      productId: product.id,
      quantity,
      price: product.price,
      name: product.name,
      subtotal: subtotalForItem
    });
  }

  const shipping = subtotal > 0 ? 15000 : 0;
  const total = subtotal + shipping;

  return {
    ok: true as const,
    items: normalizedItems,
    subtotal,
    shipping,
    total
  };
}

// 1. GET /api/orders - list orders (with authentication)
router.get('/', authMiddleware, async (c) => {
  const user = c.get('user') as AuthUser;
  const db = await getDatabase();
  const orders = user.role === 'admin' ? await db.listOrders() : await db.listOrders(user.email);

  return c.json({
    message: user.role === 'admin' ? 'Danh sách đơn hàng' : 'Danh sách đơn hàng của khách',
    orders: orders.map((order) => ({
      id: order.id,
      customerName: order.customerName,
      customerEmail: order.userEmail ?? user.email,
      phone: order.phone,
      address: order.address,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus ?? 'unpaid',
      total: order.total,
      status: order.status,
      createdAt: order.createdAt,
      items: order.items,
      history: order.history ?? [],
      qrUrl: order.paymentMethod === 'bank-transfer' ? generateVietQrUrl({ amount: order.total, orderId: order.id }) : undefined
    }))
  });
});

// 2. GET /api/orders/:id - get order by ID (with authorization check & dynamic VietQR)
router.get('/:id', authMiddleware, async (c) => {
  const user = c.get('user') as AuthUser;
  const db = await getDatabase();
  const orderId = String(c.req.param('id') ?? '');
  const order = await db.getOrderById(orderId);

  if (!order) {
    return c.json({ message: 'Không tìm thấy đơn hàng' }, 404);
  }

  if (user.role !== 'admin' && normalizeEmail(order.userEmail ?? user.email) !== normalizeEmail(user.email)) {
    return c.json({ message: 'Bạn không có quyền xem đơn hàng này.' }, 403);
  }

  const qrUrl = order.paymentMethod === 'bank-transfer'
    ? generateVietQrUrl({ amount: order.total, orderId: order.id })
    : undefined;

  return c.json({
    order: {
      ...order,
      customerEmail: order.userEmail ?? user.email,
      paymentStatus: order.paymentStatus ?? 'unpaid',
      history: order.history ?? [],
      qrUrl,
      bank: BANK_CONFIG
    }
  });
});

// 3. POST /api/orders/checkout - create order (authenticated users)
router.post('/checkout', authMiddleware, async (c) => {
  const user = c.get('user') as AuthUser;
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const { customerName, phone, address, paymentMethod, couponCode, district } = body;
  const db = await getDatabase();
  const dbProducts = await db.listProducts();
  const validation = validateCheckoutPayload(body, dbProducts);
  if (!validation.ok) {
    return c.json({ message: validation.message }, validation.status);
  }

  const cleanName = String(customerName ?? user.name).trim() || user.name;
  const cleanPhone = String(phone ?? '0900000000').trim();
  const cleanAddress = String(address ?? 'Địa chỉ giao hàng').trim();
  const method = String(paymentMethod ?? 'bank-transfer').trim() || 'bank-transfer';

  // Zone-based Shipping Fee
  let subtotal = validation.total;
  let shippingFee = 0;
  if (district) {
    const shipCalc = calculateShippingFee(String(district), subtotal);
    shippingFee = shipCalc.fee;
  }

  // Coupon discount
  let discountAmount = 0;
  let validCouponCode: string | undefined = undefined;
  if (couponCode) {
    const coupon = await db.getCoupon(String(couponCode));
    if (coupon && (!coupon.minOrderValue || subtotal >= coupon.minOrderValue)) {
      validCouponCode = coupon.code;
      if (coupon.type === 'percent') {
        discountAmount = Math.round((subtotal * coupon.value) / 100);
      } else {
        discountAmount = Math.min(subtotal, coupon.value);
      }
    }
  }

  const finalTotal = Math.max(0, subtotal + shippingFee - discountAmount);

  // Deduct stock in DB
  for (const item of validation.items) {
    const product = dbProducts.find((entry) => entry.id === item.productId);
    if (!product) {
      return c.json({ message: `Sản phẩm ${item.productId} không tồn tại.` }, 404);
    }

    const nextStock = product.stock - item.quantity;
    await db.updateProduct(product.id, { stock: nextStock });
    product.stock = nextStock;
  }

  const order = await db.createOrder({
    userEmail: user.email,
    customerName: cleanName,
    phone: cleanPhone,
    address: cleanAddress,
    paymentMethod: method,
    paymentStatus: 'unpaid',
    subtotal,
    shippingFee,
    discountAmount,
    couponCode: validCouponCode,
    total: finalTotal,
    status: 'pending',
    items: validation.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      price: item.price,
      name: item.name
    }))
  });

  const qrUrl = method === 'bank-transfer'
    ? generateVietQrUrl({ amount: order.total, orderId: order.id })
    : undefined;

  return c.json({
    message: 'Tạo đơn hàng thành công. Vui lòng thanh toán theo hướng dẫn.',
    payment: method,
    order: {
      ...order,
      customerEmail: order.userEmail ?? user.email,
      qrUrl
    },
    bank: {
      ...BANK_CONFIG,
      content: `CAFE ${order.id}`,
      qrUrl
    }
  }, 201);
});

// 4. POST /api/orders/webhook/payment - webhook for bank payment reconciliation (PayOS / SePay / Casso)
router.post('/webhook/payment', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const { orderId: rawOrderId, amount, content, transactionId } = body;
  const db = await getDatabase();

  // Extract orderId from rawOrderId or content (e.g., "CAFE ORD-12345")
  let targetOrderId = rawOrderId ? String(rawOrderId).trim() : '';
  if (!targetOrderId && content) {
    const match = String(content).match(/ORD-[\w-]+/i);
    if (match) targetOrderId = match[0];
  }

  if (!targetOrderId) {
    return c.json({ success: false, message: 'Thiếu mã đơn hàng trong dữ liệu đối soát.' }, 400);
  }

  const order = await db.getOrderById(targetOrderId);
  if (!order) {
    return c.json({ success: false, message: `Không tìm thấy đơn hàng ${targetOrderId}` }, 404);
  }

  const paidAmount = Number(amount ?? 0);
  if (paidAmount > 0 && paidAmount < order.total) {
    return c.json({
      success: false,
      message: `Số tiền thanh toán (${paidAmount}đ) không đủ so với tổng đơn (${order.total}đ).`
    }, 400);
  }

  // Update payment status to 'paid'
  const txnNote = transactionId ? ` (Mã GD: ${transactionId})` : '';
  await db.updatePaymentStatus(targetOrderId, 'paid', `Nhận chuyển khoản thành công ${order.total.toLocaleString('vi-VN')}đ${txnNote}`);

  // Automatically advance to 'confirmed' if currently pending
  if (order.status === 'pending') {
    await db.updateOrderStatus(targetOrderId, 'confirmed', 'Hệ thống tự động xác nhận đơn sau khi đối soát tiền về');
  }

  const updatedOrder = await db.getOrderById(targetOrderId);
  return c.json({
    success: true,
    message: `Đơn hàng ${targetOrderId} đã tự động chuyển sang trạng thái đã thanh toán (paid).`,
    order: updatedOrder
  });
});

// 5. POST /api/orders/:id/cancel - customer can cancel their pending order & restore stock
router.post('/:id/cancel', authMiddleware, async (c) => {
  const user = c.get('user') as AuthUser;
  const db = await getDatabase();
  const orderId = String(c.req.param('id') ?? '');
  const order = await db.getOrderById(orderId);

  if (!order) {
    return c.json({ message: 'Không tìm thấy đơn hàng.' }, 404);
  }

  // Authorization check
  if (user.role !== 'admin' && normalizeEmail(order.userEmail ?? user.email) !== normalizeEmail(user.email)) {
    return c.json({ message: 'Bạn không có quyền thao tác trên đơn hàng này.' }, 403);
  }

  if (order.status !== 'pending') {
    return c.json({
      message: `Không thể hủy đơn hàng đang ở trạng thái "${order.status}". Chỉ có thể hủy đơn khi còn chờ xác nhận (pending).`
    }, 400);
  }

  // Restore product stock in DB
  for (const item of order.items) {
    const product = await db.getProductById(item.productId);
    if (product) {
      await db.updateProduct(product.id, { stock: product.stock + item.quantity });
    }
  }

  // Transition to cancelled
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const reason = body?.reason ? String(body.reason).trim() : 'Khách hàng yêu cầu hủy đơn';
  const updatedOrder = await db.updateOrderStatus(orderId, 'cancelled', reason);

  return c.json({
    message: 'Hủy đơn hàng thành công và đã hoàn kho.',
    order: updatedOrder
  });
});

// 6. POST /api/orders/:id/confirm-payment - quick confirmation for demo / manual payment reconciliation
router.post('/:id/confirm-payment', authMiddleware, async (c) => {
  const user = c.get('user') as AuthUser;
  const db = await getDatabase();
  const orderId = String(c.req.param('id') ?? '');
  const order = await db.getOrderById(orderId);

  if (!order) {
    return c.json({ message: 'Không tìm thấy đơn hàng' }, 404);
  }

  if (user.role !== 'admin' && normalizeEmail(order.userEmail ?? user.email) !== normalizeEmail(user.email)) {
    return c.json({ message: 'Bạn không có quyền thao tác trên đơn hàng này.' }, 403);
  }

  await db.updatePaymentStatus(orderId, 'paid', `Xác nhận thanh toán thủ công bởi ${user.name}`);
  if (order.status === 'pending') {
    await db.updateOrderStatus(orderId, 'confirmed', 'Đã xác nhận đơn hàng sau khi thanh toán');
  }

  const updated = await db.getOrderById(orderId);
  return c.json({
    message: 'Xác nhận thanh toán thành công. Đơn hàng đã chuyển sang trạng thái đã thanh toán (paid).',
    order: updated
  });
});

// 7. PATCH /api/orders/:id/status - admin only with state transition enforcement
router.patch('/:id/status', authMiddleware, requireRole('admin'), async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const { status, note } = body;
  const db = await getDatabase();
  const orderId = String(c.req.param('id') ?? '');
  const order = await db.getOrderById(orderId);

  if (!order) {
    return c.json({ message: 'Không tìm thấy đơn hàng' }, 404);
  }

  const nextStatus = status as DbOrderStatus;
  const allowed = ALLOWED_STATUS_TRANSITIONS[order.status] ?? [];

  if (!allowed.includes(nextStatus)) {
    return c.json({
      message: `Chuyển trạng thái không hợp lệ: không thể chuyển từ "${order.status}" sang "${nextStatus}". Các trạng thái được phép: [${allowed.join(', ') || 'không có'}].`
    }, 400);
  }

  // If transition to cancelled, restore stock
  if (nextStatus === 'cancelled') {
    for (const item of order.items) {
      const product = await db.getProductById(item.productId);
      if (product) {
        await db.updateProduct(product.id, { stock: product.stock + item.quantity });
      }
    }
  }

  const updatedOrder = await db.updateOrderStatus(orderId, nextStatus, typeof note === 'string' ? note : undefined);

  return c.json({
    message: 'Cập nhật trạng thái đơn hàng thành công',
    order: {
      ...updatedOrder,
      customerEmail: updatedOrder?.userEmail ?? 'unknown@example.com'
    }
  });
});

export default router;

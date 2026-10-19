import { Router } from 'express';
import { getDatabase } from '../lib/database.js';

const router = Router();

const demoOrders = [
  {
    id: 'ORD-1001',
    customerName: 'Nguyễn Văn A',
    customerEmail: 'customer@example.com',
    phone: '0900000002',
    address: '123 Đường Lê Lợi, Quận 1',
    paymentMethod: 'bank-transfer',
    total: 145000,
    status: 'pending'
  },
  {
    id: 'ORD-1002',
    customerName: 'Nguyễn Văn A',
    customerEmail: 'customer@example.com',
    phone: '0900000002',
    address: '123 Đường Lê Lợi, Quận 1',
    paymentMethod: 'cod',
    total: 98000,
    status: 'shipping'
  },
  {
    id: 'ORD-1003',
    customerName: 'Admin Cửa hàng',
    customerEmail: 'admin@cafeshop.vn',
    phone: '0900000003',
    address: '99 Nguyễn Huệ, Quận 1',
    paymentMethod: 'bank-transfer',
    total: 185000,
    status: 'completed'
  }
];

const normalizeEmail = (value?: string) => String(value ?? '').trim().toLowerCase();

router.get('/', async (req, res) => {
  const role = String(req.query.role ?? 'guest');
  const userEmail = normalizeEmail(req.query.userEmail as string | undefined);

  if (role === 'admin') {
    return res.json({ message: 'Danh sách đơn hàng', orders: demoOrders });
  }

  if (!userEmail) {
    return res.json({ message: 'Danh sách đơn hàng của khách', orders: [] });
  }

  const userOrders = demoOrders.filter((item) => normalizeEmail(item.customerEmail) === userEmail);
  return res.json({ message: 'Danh sách đơn hàng của khách', orders: userOrders });
});

router.get('/:id', (req, res) => {
  const order = demoOrders.find((item) => item.id === req.params.id);

  if (!order) {
    return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
  }

  return res.json({ order });
});

router.post('/checkout', async (req, res) => {
  const { customerName, phone, address, paymentMethod, total, userEmail } = req.body;
  const db = await getDatabase();

  const order = await db.createOrder({
    customerName: customerName ?? 'Khách hàng',
    phone: phone ?? '0900000000',
    address: address ?? 'Địa chỉ giao hàng',
    paymentMethod: paymentMethod ?? 'bank-transfer',
    total: Number(total ?? 0),
    status: 'pending'
  });

  const nextOrder = {
    id: order.id,
    customerName: order.customerName,
    customerEmail: normalizeEmail(userEmail) || 'guest@example.com',
    phone: order.phone,
    address: order.address,
    paymentMethod: order.paymentMethod,
    total: order.total,
    status: order.status
  };

  demoOrders.unshift(nextOrder);

  res.json({
    message: 'Tạo đơn hàng thành công. Vui lòng chuyển khoản theo thông tin ngân hàng.',
    payment: paymentMethod,
    order: nextOrder,
    bank: {
      bankName: 'Vietcombank',
      accountName: 'Cafe Commerce Co., Ltd',
      accountNumber: '1023456789',
      content: `CAFE ${customerName ?? 'CUSTOMER'} ${order.total}`
    }
  });
});

router.patch('/:id/status', (req, res) => {
  const { status } = req.body;
  const orderIndex = demoOrders.findIndex((item) => item.id === req.params.id);

  if (orderIndex === -1) {
    return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
  }

  demoOrders[orderIndex].status = status;

  return res.json({
    message: 'Cập nhật trạng thái đơn hàng thành công',
    order: demoOrders[orderIndex]
  });
});

export default router;

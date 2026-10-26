import { Hono } from 'hono';
import { getDatabase } from '../lib/database.js';

const router = new Hono();

// GET /api/coupons (list active coupons)
router.get('/', async (c) => {
  const db = await getDatabase();
  const coupons = await db.listCoupons();
  return c.json({
    success: true,
    coupons
  });
});

// POST /api/coupons/apply (validate and calculate discount)
router.post('/apply', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { code, subtotal } = body ?? {};

  if (!code || typeof code !== 'string') {
    return c.json({
      success: false,
      message: 'Vui lòng cung cấp mã voucher giảm giá.'
    }, 400);
  }

  const orderSubtotal = Math.max(0, Number(subtotal) || 0);
  const db = await getDatabase();
  const coupon = await db.getCoupon(code);

  if (!coupon) {
    return c.json({
      success: false,
      message: 'Mã giảm giá không tồn tại hoặc đã hết hạn.'
    }, 404);
  }

  if (coupon.minOrderValue && orderSubtotal < coupon.minOrderValue) {
    return c.json({
      success: false,
      message: `Mã "${coupon.code}" chỉ áp dụng cho đơn hàng từ ${coupon.minOrderValue.toLocaleString('vi-VN')}đ trở lên.`
    }, 400);
  }

  let discountAmount = 0;
  if (coupon.type === 'percent') {
    discountAmount = Math.round((orderSubtotal * coupon.value) / 100);
  } else {
    discountAmount = Math.min(orderSubtotal, coupon.value);
  }

  return c.json({
    success: true,
    message: `Áp dụng thành công mã "${coupon.code}": Giảm ${discountAmount.toLocaleString('vi-VN')}đ!`,
    coupon: {
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      description: coupon.description
    },
    discountAmount,
    finalTotal: Math.max(0, orderSubtotal - discountAmount)
  });
});

export default router;

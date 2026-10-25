import { Router } from 'express';
import { getDatabase } from '../lib/database.js';

const couponsRouter = Router();

// GET /api/coupons (list active coupons)
couponsRouter.get('/', async (_req, res) => {
  const db = await getDatabase();
  const coupons = await db.listCoupons();
  res.json({
    success: true,
    coupons
  });
});

// POST /api/coupons/apply (validate and calculate discount)
couponsRouter.post('/apply', async (req, res) => {
  const { code, subtotal } = req.body ?? {};

  if (!code || typeof code !== 'string') {
    res.status(400).json({
      success: false,
      message: 'Vui lòng cung cấp mã voucher giảm giá.'
    });
    return;
  }

  const orderSubtotal = Math.max(0, Number(subtotal) || 0);
  const db = await getDatabase();
  const coupon = await db.getCoupon(code);

  if (!coupon) {
    res.status(404).json({
      success: false,
      message: 'Mã giảm giá không tồn tại hoặc đã hết hạn.'
    });
    return;
  }

  if (coupon.minOrderValue && orderSubtotal < coupon.minOrderValue) {
    res.status(400).json({
      success: false,
      message: `Mã "${coupon.code}" chỉ áp dụng cho đơn hàng từ ${coupon.minOrderValue.toLocaleString('vi-VN')}đ trở lên.`
    });
    return;
  }

  let discountAmount = 0;
  if (coupon.type === 'percent') {
    discountAmount = Math.round((orderSubtotal * coupon.value) / 100);
  } else {
    discountAmount = Math.min(orderSubtotal, coupon.value);
  }

  res.json({
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

export default couponsRouter;


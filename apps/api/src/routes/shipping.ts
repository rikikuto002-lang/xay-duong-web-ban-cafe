import { Router } from 'express';
import { SHIPPING_ZONES, calculateShippingFee } from '../lib/database.js';

const shippingRouter = Router();

// GET /api/shipping/zones (list shipping zones)
shippingRouter.get('/zones', (_req, res) => {
  res.json({
    success: true,
    zones: SHIPPING_ZONES
  });
});

// POST /api/shipping/calculate (calculate fee by district and subtotal)
shippingRouter.post('/calculate', (req, res) => {
  const { district, subtotal } = req.body ?? {};

  if (!district || typeof district !== 'string') {
    res.status(400).json({
      success: false,
      message: 'Vui lòng cung cấp quận / huyện giao hàng.'
    });
    return;
  }

  const orderSubtotal = Math.max(0, Number(subtotal) || 0);
  const calculation = calculateShippingFee(district, orderSubtotal);

  res.json({
    success: true,
    calculation
  });
});

export default shippingRouter;


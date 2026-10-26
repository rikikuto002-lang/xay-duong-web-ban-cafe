import { Hono } from 'hono';
import { SHIPPING_ZONES, calculateShippingFee } from '../lib/database.js';

const shippingRouter = new Hono();

// GET /api/shipping/zones (list shipping zones)
shippingRouter.get('/zones', (c) => {
  return c.json({
    success: true,
    zones: SHIPPING_ZONES
  });
});

// POST /api/shipping/calculate (calculate fee by district and subtotal)
shippingRouter.post('/calculate', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const { district, subtotal } = body;

  if (!district || typeof district !== 'string') {
    return c.json({
      success: false,
      message: 'Vui lòng cung cấp quận / huyện giao hàng.'
    }, 400);
  }

  const orderSubtotal = Math.max(0, Number(subtotal) || 0);
  const calculation = calculateShippingFee(district, orderSubtotal);

  return c.json({
    success: true,
    calculation
  });
});

export default shippingRouter;

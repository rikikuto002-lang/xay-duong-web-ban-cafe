import { Hono } from 'hono';
import { getDatabase } from '../lib/database.js';

const router = new Hono();

// GET /api/reservations (list all reservations)
router.get('/', async (c) => {
  const db = await getDatabase();
  const reservations = await db.listReservations();
  return c.json({
    success: true,
    reservations
  });
});

// POST /api/reservations (create a table reservation)
router.post('/', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { customerName, phone, date, time, guestCount, area, notes } = body ?? {};

  if (!customerName || !phone || !date || !time) {
    return c.json({
      success: false,
      message: 'Vui lòng điền đầy đủ tên, số điện thoại, ngày và giờ đặt bàn.'
    }, 400);
  }

  const count = Math.max(1, Number(guestCount) || 1);
  const selectedArea = area === 'outdoor' || area === 'vip' ? area : 'indoor';

  const db = await getDatabase();
  const reservation = await db.createReservation({
    customerName: String(customerName).trim(),
    phone: String(phone).trim(),
    date: String(date),
    time: String(time),
    guestCount: count,
    area: selectedArea,
    notes: notes ? String(notes).trim() : undefined
  });

  return c.json({
    success: true,
    message: 'Đặt bàn thành công! Quán sẽ liên hệ sớm để xác nhận.',
    reservation
  }, 201);
});

// PATCH /api/reservations/:id/status (admin confirm/cancel)
router.patch('/:id/status', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const { status } = body ?? {};

  if (status !== 'confirmed' && status !== 'cancelled') {
    return c.json({
      success: false,
      message: 'Trạng thái không hợp lệ (chỉ chấp nhận "confirmed" hoặc "cancelled").'
    }, 400);
  }

  const db = await getDatabase();
  const updated = await db.updateReservationStatus(id, status);
  if (!updated) {
    return c.json({
      success: false,
      message: 'Không tìm thấy thông tin đặt bàn.'
    }, 404);
  }

  return c.json({
    success: true,
    message: `Đã cập nhật trạng thái đặt bàn sang: ${status}`,
    reservation: updated
  });
});

export default router;

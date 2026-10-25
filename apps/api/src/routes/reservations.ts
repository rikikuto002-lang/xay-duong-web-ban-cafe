import { Router } from 'express';
import { getDatabase } from '../lib/database.js';

const reservationsRouter = Router();

// GET /api/reservations (list all reservations)
reservationsRouter.get('/', async (_req, res) => {
  const db = await getDatabase();
  const reservations = await db.listReservations();
  res.json({
    success: true,
    reservations
  });
});

// POST /api/reservations (create a table reservation)
reservationsRouter.post('/', async (req, res) => {
  const { customerName, phone, date, time, guestCount, area, notes } = req.body ?? {};

  if (!customerName || !phone || !date || !time) {
    res.status(400).json({
      success: false,
      message: 'Vui lòng điền đầy đủ tên, số điện thoại, ngày và giờ đặt bàn.'
    });
    return;
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

  res.status(201).json({
    success: true,
    message: 'Đặt bàn thành công! Quán sẽ liên hệ sớm để xác nhận.',
    reservation
  });
});

// PATCH /api/reservations/:id/status (admin confirm/cancel)
reservationsRouter.patch('/:id/status', async (req, res) => {
  const { status } = req.body ?? {};
  if (status !== 'confirmed' && status !== 'cancelled') {
    res.status(400).json({
      success: false,
      message: 'Trạng thái không hợp lệ (chỉ chấp nhận "confirmed" hoặc "cancelled").'
    });
    return;
  }

  const db = await getDatabase();
  const updated = await db.updateReservationStatus(req.params.id, status);
  if (!updated) {
    res.status(404).json({
      success: false,
      message: 'Không tìm thấy thông tin đặt bàn.'
    });
    return;
  }

  res.json({
    success: true,
    message: `Đã cập nhật trạng thái đặt bàn sang: ${status}`,
    reservation: updated
  });
});

export default reservationsRouter;


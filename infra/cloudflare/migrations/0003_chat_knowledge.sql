CREATE TABLE IF NOT EXISTS faq_items (
  id TEXT PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS menu_knowledge (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  price INTEGER NOT NULL DEFAULT 0,
  is_featured INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO faq_items (id, question, answer, category, created_at)
VALUES
  ('faq_hours', 'Giờ mở cửa của quán là mấy giờ?', 'CafeZone mở cửa Thứ Hai - Thứ Sáu từ 07:00 đến 21:00 và Thứ Bảy - Chủ Nhật từ 08:00 đến 22:30.', 'hours', CURRENT_TIMESTAMP),
  ('faq_reservation', 'Làm sao để đặt bàn?', 'Bạn có thể đặt bàn trực tuyến trên website hoặc gọi hotline +84 28 555 7788 để xác nhận thời gian, số lượng khách và khu vực muốn ngồi.', 'reservation', CURRENT_TIMESTAMP),
  ('faq_menu', 'Món nào phù hợp cho người mới?', 'Nếu bạn mới uống cà phê, nên thử cappuccino hoặc latte vì vị dễ uống và rất cân bằng.', 'menu', CURRENT_TIMESTAMP)
ON CONFLICT(id) DO NOTHING;

INSERT INTO menu_knowledge (id, name, description, category, price, is_featured, active, created_at)
VALUES
  ('menu_cappuccino', 'Cappuccino', 'Espresso với bọt sữa mịn, vị đậm nhưng dễ uống.', 'Cà phê máy', 59000, 1, 1, CURRENT_TIMESTAMP),
  ('menu_latte', 'Latte', 'Espresso kết hợp sữa tươi, vị nhẹ và ngọt dịu.', 'Cà phê máy', 69000, 1, 1, CURRENT_TIMESTAMP),
  ('menu_croissant', 'Croissant', 'Bánh sữa giòn xốp, ăn kèm cà phê rất hợp.', 'Bánh ngọt', 39000, 0, 1, CURRENT_TIMESTAMP)
ON CONFLICT(id) DO NOTHING;

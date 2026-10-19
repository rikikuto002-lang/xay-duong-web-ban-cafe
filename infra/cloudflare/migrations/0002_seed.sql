INSERT INTO categories (id, name, slug) VALUES
  ('cat_coffee_1', 'Cà phê rang xay', 'ca-phe-rang-xay'),
  ('cat_coffee_2', 'Cà phê máy', 'ca-phe-may'),
  ('cat_tea_1', 'Trà sữa', 'tra-sua'),
  ('cat_bread_1', 'Bánh ngọt', 'banh-ngot'),
  ('cat_combo_1', 'Combo', 'combo');

INSERT INTO products (id, name, slug, description, price, category_id, image_url, stock) VALUES
  ('prod_001', 'Cà phê đen nóng', 'ca-phe-den-nong', 'Cà phê đậm đà, thơm và phù hợp cho buổi sáng.', 45000, 'cat_coffee_1', 'https://images.unsplash.com/photo-1497636577773-f1231844a043?auto=format&fit=crop&w=800&q=80', 20),
  ('prod_002', 'Cappuccino', 'cappuccino', 'Hương cà phê espresso kết hợp với sữa tươi và bọt sữa mịn.', 59000, 'cat_coffee_2', 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=800&q=80', 15),
  ('prod_003', 'Trà sữa Matcha', 'tra-sua-matcha', 'Matcha nguyên chất, vị ngọt nhẹ và thơm thanh.', 65000, 'cat_tea_1', 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=800&q=80', 18),
  ('prod_004', 'Bánh Croissant', 'banh-croissant', 'Bánh lớp sữa, giòn ngoài, mềm trong.', 35000, 'cat_bread_1', 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80', 12),
  ('prod_005', 'Combo Cafe Sáng', 'combo-cafe-sang', 'Combo 2 ly cà phê và 1 bánh ngọt cho buổi sáng sảng khoái.', 99000, 'cat_combo_1', 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=800&q=80', 10);

INSERT INTO users (id, role, name, email, phone) VALUES
  ('user_guest_1', 'guest', 'Khách vãng lai', 'guest@example.com', '0900000001'),
  ('user_customer_1', 'customer', 'Nguyễn Văn A', 'customer@example.com', '0900000002'),
  ('user_admin_1', 'admin', 'Admin Cửa hàng', 'admin@cafeshop.vn', '0900000003');

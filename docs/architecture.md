# Kiến trúc dự án Cafe Commerce

## 1. Frontend
- Svelte + Vite
- Mobile-first UI
- Hiển thị sản phẩm theo danh mục
- Thêm vào giỏ hàng
- Quản lý trạng thái đơn giản trên client

## 2. Backend
- Node.js + Express
- Các API chính: products, cart, orders
- Tích hợp cổng thanh toán ngân hàng ở tầng service

## 3. Data layer
- Cloudflare D1: lưu thông tin sản phẩm, users, orders
- Cloudflare R2: lưu ảnh sản phẩm

## 4. Vai trò người dùng
- Guest: xem menu, thêm giỏ hàng
- Customer: đặt hàng, thanh toán
- Admin: quản lý sản phẩm, đơn hàng

## 5. Kế hoạch mở rộng
- JWT auth
- Role-based access control
- Payment integration (VietQR / bank transfer)
- Admin dashboard
- Order tracking

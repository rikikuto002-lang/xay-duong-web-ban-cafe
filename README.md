# Cafe Commerce Starter

## Mục tiêu
Dự án này là khởi đầu cho hệ thống bán café với:
- Frontend: Svelte + Vite
- Backend: Node.js + Express
- Database: Cloudflare D1
- Lưu trữ ảnh: Cloudflare R2
- Kiến trúc mobile-first cho người dùng mua hàng và quản trị

## Vai trò người dùng
- Guest: xem sản phẩm, thêm vào giỏ, xem danh mục
- Customer: đăng nhập, đặt hàng, thanh toán
- Admin: quản lý sản phẩm, danh mục, đơn hàng, thống kê

## Cấu trúc dự án
- `apps/web`: giao diện web Svelte
- `apps/api`: API backend cho quản lý sản phẩm, giỏ hàng, đơn hàng
- `packages/shared`: type và constant dùng chung
- `infra/cloudflare`: cấu hình D1, R2, worker

## Cách chạy
1. `npm install`
2. `npm run dev`

## Lưu ý
Cấu trúc này là nền tảng khởi đầu. Bạn có thể mở rộng thêm:
- đăng nhập bằng JWT / session
- tích hợp ngân hàng qua cổng thanh toán
- upload ảnh lên R2
- migration schema cho D1

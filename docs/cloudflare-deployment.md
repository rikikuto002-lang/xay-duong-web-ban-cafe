# Hướng Dẫn Triển Khai Lên Cloudflare (Cho Phép Mọi Người Truy Cập)

Dự án gồm 2 phần được thiết kế để chạy 100% trên nền tảng Cloudflare Serverless:
- **Backend API (Hono)**: Chạy trên **Cloudflare Workers** + **Cloudflare D1** (Database SQLite toàn cầu) + **Cloudflare R2** (Lưu trữ ảnh).
- **Frontend (SvelteKit)**: Chạy trên **Cloudflare Pages** (CDN Edge toàn cầu, miễn phí băng thông & SSL).

---

## Cách 1: Triển khai qua lệnh dòng lệnh (Wrangler CLI) - Nhanh nhất

### Bước 1: Đăng nhập vào Cloudflare
Mở PowerShell hoặc Command Prompt tại thư mục dự án và chạy:
```bash
npx wrangler login
```
*(Trình duyệt sẽ mở ra, bạn chỉ cần bấm **Allow** để cấp quyền cho Wrangler).*

---

### Bước 2: Tạo Cơ sở dữ liệu Cloudflare D1
Chạy lệnh tạo database trên Cloudflare:
```bash
npx wrangler d1 create cafe-db
```
Lệnh sẽ trả về thông tin dạng:
```
[[d1_databases]]
binding = "DB"
database_name = "cafe-db"
database_id = "xxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

👉 Hãy sao chép chuỗi `database_id` này và dán vào tệp `infra/cloudflare/wrangler.jsonc` (thay thế cho `"cafe-db-production-id"`):
```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "cafe-db",
    "database_id": "DÁN_DATABASE_ID_CỦA_BẠN_VÀO_ĐÂY",
    "migrations_dir": "migrations"
  }
]
```

---

### Bước 3: Áp dụng bảng và dữ liệu mẫu lên D1 (Migrations)
```bash
npx wrangler d1 migrations apply cafe-db --remote --config infra/cloudflare/wrangler.jsonc
```
*(Bấm `y` để xác nhận chạy migration tạo bảng và nạp thực đơn café mẫu).*

---

### Bước 4: Tạo R2 Bucket lưu trữ ảnh sản phẩm
```bash
npx wrangler r2 bucket create cafe-product-images
```

---

### Bước 5: Triển khai Backend API (Cloudflare Workers)
Chạy lệnh deploy backend:
```bash
npx wrangler deploy --config infra/cloudflare/wrangler.jsonc
```
Sau khi hoàn tất, terminal sẽ in ra URL công khai của bạn, ví dụ:
```
Published cafe-commerce (0.85 sec)
  https://cafe-commerce.<your-subdomain>.workers.dev
```
*(Lưu lại đường dẫn này để cấu hình cho Frontend).*

---

### Bước 6: Build & Triển khai Frontend (Cloudflare Pages)
1. Build frontend với URL API vừa nhận được:
```bash
npm run build:web
```

2. Đẩy lên Cloudflare Pages:
```bash
npx wrangler pages deploy apps/web/.svelte-kit/output/client --project-name cafe-commerce
```

Sau vài giây, bạn sẽ nhận được đường dẫn trang web công khai toàn cầu:
👉 **`https://cafe-commerce.pages.dev`**

Bất kỳ ai trên thế giới đều có thể truy cập, xem menu, đặt hàng và chuyển khoản VietQR tự động!

---

## Cách 2: Triển khai tự động qua GitHub (Tự động cập nhật mỗi khi push code)

1. Đẩy code lên GitHub repository:
   ```bash
   git add .
   git commit -m "feat: deploy to cloudflare"
   git push origin main
   ```

2. Đăng nhập [dash.cloudflare.com](https://dash.cloudflare.com)
3. Chọn mục **Compute (Workers & Pages)** -> **Create** -> tab **Pages** -> **Connect to Git**:
   - Chọn kho lưu trữ `xay-duong-web-ban-cafe`.
   - **Framework preset**: `SvelteKit`.
   - **Build command**: `npm run build:web`.
   - **Build output directory**: `apps/web/.svelte-kit/output/client`.
   - **Environment variables**: Thêm biến `PUBLIC_API_URL` trỏ tới URL Worker API của bạn (ví dụ: `https://cafe-commerce.workers.dev`).
4. Bấm **Save and Deploy**. Cloudflare sẽ tự động build và cấp domain miễn phí `*.pages.dev` có sẵn chứng chỉ HTTPS bảo mật.


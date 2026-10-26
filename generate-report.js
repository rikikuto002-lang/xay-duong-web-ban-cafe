const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle, Numbering, BulletStyleType, TabStopType, TabStopPosition, PageOrientation, Indent, LineSpacing } = require('docx');
const fs = require('fs');
const path = require('path');

// Helper functions
const heading = (text, level = HeadingLevel.HEADING_1) => new Paragraph({
  text,
  heading: level,
  spacing: { before: 240, after: 120 },
});

const subheading = (text) => new Paragraph({
  text,
  heading: HeadingLevel.HEADING_2,
  spacing: { before: 200, after: 100 },
});

const subsubheading = (text) => new Paragraph({
  text,
  heading: HeadingLevel.HEADING_3,
  spacing: { before: 160, after: 80 },
});

const paragraph = (text, bold = false, size = 24, alignment = AlignmentType.LEFT) => new Paragraph({
  alignment,
  children: [new TextRun({ text, bold, size })],
  spacing: { after: 120, line: 276 },
});

const bullet = (text, level = 0) => new Paragraph({
  text,
  bullet: { level },
  indent: { left: 720 + level * 360 },
  spacing: { after: 60, line: 276 },
});

const codeBlock = (text) => new Paragraph({
  children: [new TextRun({ text, font: 'Courier New', size: 20, color: '333333' })],
  spacing: { before: 120, after: 120 },
  shading: { fill: 'F5F5F5' },
  indent: { left: 720 },
});

const table = (headers, rows) => {
  const headerRow = new TableRow({
    children: headers.map(h => new TableCell({
      children: [new TextRun({ text: h, bold: true, size: 22 })],
      shading: { fill: '2E74B5' },
      borders: { top: { style: BorderStyle.SINGLE, size: 4, color: 'FFFFFF' }, bottom: { style: BorderStyle.SINGLE, size: 4, color: 'FFFFFF' }, left: { style: BorderStyle.SINGLE, size: 4, color: 'FFFFFF' }, right: { style: BorderStyle.SINGLE, size: 4, color: 'FFFFFF' } },
    })),
  });

  const dataRows = rows.map(row => new TableRow({
    children: row.map(cell => new TableCell({
      children: [new TextRun({ text: String(cell), size: 20 })],
      borders: { top: { style: BorderStyle.SINGLE, size: 4, color: 'D9E2F3' }, bottom: { style: BorderStyle.SINGLE, size: 4, color: 'D9E2F3' }, left: { style: BorderStyle.SINGLE, size: 4, color: 'D9E2F3' }, right: { style: BorderStyle.SINGLE, size: 4, color: 'D9E2F3' } },
    })),
  }));

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...dataRows],
  });
};

const pageBreak = () => new Paragraph({ text: '', pageBreakBefore: true });

// Build document content
const doc = new Document({
  sections: [{
    properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    children: [
      // Title Page
      new Paragraph({ text: '', spacing: { after: 720 } }),
      heading('BÁO CÁO XÂY DỰNG HỆ THỐNG', HeadingLevel.TITLE),
      heading('CAFE COMMERCE STARTER', HeadingLevel.TITLE),
      new Paragraph({ text: '', spacing: { after: 360 } }),
      paragraph('Dự án: Hệ thống thương mại điện tử bán cà phê', false, 28, AlignmentType.CENTER),
      paragraph('Phiên bản: 1.0', false, 24, AlignmentType.CENTER),
      paragraph('Ngày: 20/10/2026', false, 24, AlignmentType.CENTER),
      paragraph('Người chuẩn bị: Claude Code Assistant', false, 24, AlignmentType.CENTER),
      pageBreak(),

      // Table of Contents placeholder
      heading('MỤC LỤC', HeadingLevel.HEADING_1),
      bullet('1. Tổng Quan Dự Án', 0),
      bullet('2. Kiến Trúc Hệ Thống', 0),
      bullet('3. Công Nghệ & Công Cụ', 0),
      bullet('4. Thiết Kế Chi Tiết Các Module', 0),
      bullet('5. Quy Trình Phát Triển', 0),
      bullet('6. Các Quy Trình Nghiệp Vụ', 0),
      bullet('7. Các Vấn Đề & Giải Pháp', 0),
      bullet('8. Hướng Dẫn Triển Khai', 0),
      bullet('9. Kết Luận & Đánh Giá', 0),
      bullet('10. Phụ Lục', 0),
      pageBreak(),

      // 1. Tổng Quan Dự Án
      heading('1. TỔNG QUAN DỰ ÁN'),

      subheading('1.1 Mục Tiêu'),
      paragraph('Xây dựng một hệ thống thương mại điện tử bán cà phê (Cafe Commerce) với kiến trúc hiện đại, tách biệt rõ ràng frontend/backend, sẵn sàng triển khai lên Cloudflare (D1 Database, R2 Storage, Workers).'),

      subheading('1.2 Phạm Vi'),
      bullet('Frontend: Giao diện người dùng mobile-first (SvelteKit)'),
      bullet('Backend: REST API quản lý sản phẩm, giỏ hàng, đơn hàng, xác thực (Express + TypeScript)'),
      bullet('Shared: Các type TypeScript dùng chung giữa FE/BE'),
      bullet('Infrastructure: Schema Cloudflare D1, cấu hình deployment'),

      subheading('1.3 Vai Trò Người Dùng'),
      table(
        ['Vai trò', 'Quyền hạn'],
        [
          ['Guest', 'Xem sản phẩm, thêm giỏ hàng, xem danh mục'],
          ['Customer', 'Đăng nhập, đặt hàng, thanh toán, xem lịch sử đơn'],
          ['Admin', 'Quản lý sản phẩm (CRUD), quản lý đơn hàng, thống kê dashboard'],
        ]
      ),
      pageBreak(),

      // 2. Kiến Trúc Hệ Thống
      heading('2. KIẾN TRÚC HỆ THỐNG'),

      subheading('2.1 Sơ Đồ Kiến Trúc Tổng Thể'),
      paragraph('Hệ thống bao gồm 4 layer chính: Frontend (SvelteKit), Backend (Express), Shared Package (Types), và Data Layer (Mock/D1 Adapter). Giao tiếp giữa FE và BE qua REST API qua HTTP/JSON.'),

      subheading('2.2 Cấu Trúc Monorepo (npm Workspaces)'),
      codeBlock(`cafe-commerce/
├── package.json                 # Root workspace config
├── apps/
│   ├── api/                     # Backend workspace
│   │   ├── src/
│   │   │   ├── index.ts         # Entry point
│   │   │   ├── config/env.ts    # Environment variables
│   │   │   ├── lib/database.ts  # Database adapter pattern
│   │   │   ├── data/mockData.ts # Mock data for dev
│   │   │   └── routes/          # API route modules
│   │   └── package.json
│   └── web/                     # Frontend workspace
│       ├── src/
│       │   ├── routes/          # SvelteKit pages
│       │   └── lib/             # Auth, mock data
│       └── package.json
├── packages/
│   └── shared/                  # Shared types workspace
│       └── src/index.ts
├── docs/architecture.md
└── infra/cloudflare/migrations/0001_init.sql`),
      pageBreak(),

      // 3. Công Nghệ & Công Cụ
      heading('3. CÔNG NGHỆ & CÔNG CỤ'),

      subheading('3.1 Stack Chi Tiết'),
      table(
        ['Layer', 'Technology', 'Version', 'Lý Do Chọn'],
        [
          ['Frontend Framework', 'Svelte', '4.2.18', 'Compiler-based, bundle nhỏ, DX tốt'],
          ['Meta Framework', 'SvelteKit', '2.5.18', 'File-based routing, SSR/SSG, adapter-auto'],
          ['Build Tool', 'Vite', '5.3.0', 'HMR nhanh, ESM native'],
          ['Backend Runtime', 'Node.js', '20+ (ESM)', 'Native ES modules, performance'],
          ['Web Framework', 'Express', '4.21.2', 'Mature, middleware ecosystem'],
          ['Validation', 'Zod', '3.24.1', 'Type-safe schema validation'],
          ['Database', 'Cloudflare D1', '-', 'Serverless SQLite, edge deployment'],
          ['Storage', 'Cloudflare R2', '-', 'S3-compatible, zero egress fees'],
          ['Language', 'TypeScript', '5.4+', 'Type safety xuyên suốt FE/BE'],
          ['Package Manager', 'npm Workspaces', '9+', 'Monorepo management native'],
          ['Dev Tools', 'tsx, concurrently', '-', 'TypeScript execution, parallel dev'],
        ]
      ),

      subheading('3.2 Dependency Graph'),
      codeBlock(`@cafe/web (apps/web)
    │
    ├── @sveltejs/kit, @sveltejs/vite-plugin-svelte
    ├── svelte, svelte-check
    ├── typescript, vite
    │
    └── @cafe/shared (packages/shared) ◄──────┐
                                               │
@cafe/api (apps/api)                          │
    │                                          │
    ├── express, cors, dotenv, zod            │
    ├── @types/express, @types/cors, @types/node
    ├── tsx, typescript                       │
    │                                          │
    └── @cafe/shared (packages/shared) ───────┘`),
      pageBreak(),

      // 4. Thiết Kế Chi Tiết Các Module
      heading('4. THIẾT KẾ CHI TIẾT CÁC MODULE'),

      subheading('4.1 Backend - Express API'),

      subsubheading('4.1.1 Entry Point (apps/api/src/index.ts)'),
      paragraph('Cấu trúc middleware chain với CORS, JSON parsing, health check, public endpoints và protected endpoints phân theo role.'),

      subsubheading('4.1.2 Database Adapter Pattern (apps/api/src/lib/database.ts)'),
      paragraph('Thiết kế Strategy Pattern cho phép chuyển đổi linh hoạt giữa Mock và D1 thông qua interface DatabaseAdapter.'),
      codeBlock(`interface DatabaseAdapter {
  listCategories(): Promise<DbCategory[]>
  listProducts(category?: string): Promise<DbProduct[]>
  getProductById(id: number): Promise<DbProduct | null>
  createProduct(input: Partial<DbProduct>): Promise<DbProduct>
  updateProduct(id: number, input: Partial<DbProduct>): Promise<DbProduct | null>
  deleteProduct(id: number): Promise<boolean>
  createOrder(input: Omit<DbOrder, 'id' | 'createdAt'>): Promise<DbOrder>
}

// Factory function - auto-detect environment
export async function getDatabase(): Promise<DatabaseAdapter> {
  const dbBinding = (globalThis as { DB?: unknown }).DB ?? process.env.D1_DATABASE
  if (dbBinding && typeof (dbBinding as any).prepare === 'function') {
    return new D1DatabaseAdapter(dbBinding)
  }
  return new MockDatabaseAdapter()  // Default cho development
}`),
      paragraph('Lợi ích: Zero-config development, Production-ready cho Cloudflare Workers, Testable dễ dàng.'),

      subsubheading('4.1.3 Authentication (apps/api/src/routes/auth.ts)'),
      paragraph('Cơ chế: Simple token-based (base64 encoded) - chỉ dành cho demo/prototype. In-memory session store (dev only). Endpoints: POST /register, POST /login, GET /me.'),
      paragraph('⚠️ Lưu ý bảo mật: Production cần JWT với RSA256, HttpOnly cookies, refresh token rotation.', true, 24),

      subsubheading('4.1.4 Products CRUD (apps/api/src/routes/products.ts)'),
      paragraph('Validation: Zod schema cho input. Sync: Cập nhật cả mock data array để FE dev thấy thay đổi ngay. Error handling: 404 khi không tìm thấy, 400 cho validation error.'),

      subsubheading('4.1.5 Orders & Checkout (apps/api/src/routes/orders.ts)'),
      paragraph('Checkout flow trả về thông tin chuyển khoản ngân hàng (Vietcombank) kèm QR code. Admin có thể cập nhật trạng thái đơn hàng qua PATCH /api/orders/:id/status.'),

      subheading('4.2 Frontend - SvelteKit'),

      subsubheading('4.2.1 Routing & Layout'),
      codeBlock(`src/routes/
├── +layout.svelte        # Top navigation (role-based)
├── +page.svelte          # Home: Hero, Menu, Features, Story, Testimonials
├── login/+page.svelte    # Auth: Login/Register + Role selector
├── cart/+page.svelte     # Cart + Checkout form + Bank QR
├── orders/+page.svelte   # Order history (role-based filtering)
├── account/+page.svelte  # User profile
└── admin/+page.svelte    # Admin Dashboard (protected)`),

      subsubheading('4.2.2 State Management (apps/web/src/lib/auth.ts)'),
      paragraph('LocalStorage-based session (không dùng Svelte stores để persist across reloads). Cart key phân biệt theo user/guest. Role detection reactive.'),

      subsubheading('4.2.3 API Integration Pattern'),
      paragraph('Tất cả API calls dùng fetch trực tiếp (không dùng axios). Có fallback về localStorage khi API недоступ.'),

      subsubheading('4.2.4 Admin Dashboard Visualizations'),
      paragraph('Tự xây dựng charts bằng CSS/Svelte (không dùng thư viện charting): Bar Chart (doanh thu 7 ngày), Donut Chart (phân loại sản phẩm với conic-gradient), Pipeline (trạng thái đơn hàng).'),

      subheading('4.3 Shared Types (packages/shared/src/index.ts)'),
      paragraph('Single Source of Truth cho type definitions: UserRole, Category, Product, CartItem, Order. Dùng npm workspace dependency @cafe/shared.'),

      subheading('4.4 Database Schema (Cloudflare D1)'),
      codeBlock(`-- Categories
CREATE TABLE categories (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE
);

-- Products
CREATE TABLE products (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE,
  description TEXT, price INTEGER NOT NULL, category_id TEXT NOT NULL,
  image_url TEXT, stock INTEGER DEFAULT 0,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- Users
CREATE TABLE users (
  id TEXT PRIMARY KEY, role TEXT NOT NULL DEFAULT 'guest',
  name TEXT, email TEXT UNIQUE, phone TEXT
);

-- Orders
CREATE TABLE orders (
  id TEXT PRIMARY KEY, user_id TEXT, status TEXT NOT NULL DEFAULT 'pending',
  total INTEGER NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);`),
      paragraph('Design Decisions: TEXT cho ID (UUID/nanoid), INTEGER cho price (VNĐ), created_at dạng TEXT (ISO 8601). Chưa có order_items table (TODO: normalize).'),
      pageBreak(),

      // 5. Quy Trình Phát Triển
      heading('5. QUY TRÌNH PHÁT TRIỂN'),

      subheading('5.1 Khởi Tạo Dự Án'),
      codeBlock(`# 1. Tạo monorepo structure
mkdir cafe-commerce && cd cafe-commerce
npm init -w apps/api -w apps/web -w packages/shared

# 2. Setup TypeScript configs (base + extends)
# 3. Install dependencies per workspace
# 4. Configure concurrently cho dev script`),

      subheading('5.2 Development Workflow'),
      codeBlock(`# Chạy cả 2 server cùng lúc
npm run dev
# → concurrently "npm run dev:api" "npm run dev:web"

# API: tsx watch src/index.ts (port 4000)
# Web: vite dev (port 5173)

# Build production
npm run build:web    # vite build → apps/web/build
# npm run build:api  # tsc → apps/api/dist`),

      subheading('5.3 Environment Configuration'),
      table(
        ['File', 'Purpose'],
        [
          ['apps/api/.env', 'PORT=4000, JWT_SECRET=..., PAYMENT_GATEWAY=bank-transfer'],
          ['apps/web/.env', 'PUBLIC_API_URL=https://ban-cafe-api.rikikuto002.workers.dev'],
          ['Cloudflare wrangler.toml', 'Binding D1, R2, KV cho production'],
        ]
      ),
      pageBreak(),

      // 6. Các Quy Trình Nghiệp Vụ
      heading('6. CÁC QUY TRÌNH NGHIỆP VỤ'),

      subheading('6.1 User Journey: Mua Hàng'),
      paragraph('Guest truy cập trang chủ → Xem menu → Thêm vào giỏ (localStorage) → Vào /cart → Điền thông tin → Đặt hàng → API tạo order + trả về bank info + QR → Khách chuyển khoản → Admin xác nhận đơn hàng.'),

      subheading('6.2 Admin Flow: Quản Lý Sản Phẩm'),
      paragraph('Admin đăng nhập → Truy cập /admin → Xem danh sách sản phẩm → Thêm/Sửa/Xoá sản phẩm qua API → Reload danh sách. Dashboard hiển thị stats cards, bar chart, donut chart, pipeline.'),
      pageBreak(),

      // 7. Các Vấn Đề & Giải Pháp
      heading('7. CÁC VẤN ĐỀ & GIẢI PHÁP'),

      subheading('7.1 Vấn Đề Đã Giải Quyết'),
      table(
        ['Vấn đề', 'Giải pháp'],
        [
          ['Type sharing FE/BE', 'Tạo @cafe/shared package, npm workspace dependency'],
          ['Dev vs Prod database', 'Adapter pattern + auto-detect globalThis.DB'],
          ['Cart persistence', 'localStorage với key phân biệt theo user/guest'],
          ['Role-based UI', '+layout.svelte reactive $: navItems based on getRole()'],
          ['Admin protection', '{#if !isAdmin()} denied {:else} dashboard {/if} guard'],
          ['API fallback', 'Try fetch → catch → fallback to localStorage'],
        ]
      ),

      subheading('7.2 Technical Debt / TODO'),
      table(
        ['Mức độ', 'Item', 'Mô tả'],
        [
          ['🔴 Critical', 'JWT Auth', 'Thay base64 token bằng JWT RS256, HttpOnly cookies'],
          ['🔴 Critical', 'Password Hashing', 'Bcrypt/Argon2 thay vì plaintext'],
          ['🟡 High', 'Order Items Table', 'Tách order_items ra bảng riêng (normalize)'],
          ['🟡 High', 'Input Validation', 'Zod schema cho tất cả endpoints'],
          ['🟡 High', 'Error Handling', 'Global error middleware, structured logging'],
          ['🟢 Medium', 'Image Upload', 'Cloudflare R2 integration cho product images'],
          ['🟢 Medium', 'Payment Gateway', 'VietQR / MoMo / VNPay integration'],
          ['🟢 Medium', 'Tests', 'Unit (Vitest), E2E (Playwright)'],
          ['🔵 Low', 'i18n', 'Hỗ trợ đa ngôn ngữ (VI/EN)'],
          ['🔵 Low', 'PWA', 'Service worker, offline support'],
        ]
      ),
      pageBreak(),

      // 8. Hướng Dẫn Triển Khai
      heading('8. HƯỚNG DẪN TRIỂN KHAI'),

      subheading('8.1 Development'),
      codeBlock(`# Terminal 1: API
cd apps/api && npm run dev

# Terminal 2: Web
cd apps/web && npm run dev`),

      subheading('8.2 Production Build'),
      codeBlock(`# Build web (static adapter cho Cloudflare Pages)
cd apps/web && npm run build
# Output: apps/web/build/

# Build API (cho Cloudflare Workers)
cd apps/api && npm run build
# Output: apps/api/dist/index.js`),

      subheading('8.3 Cloudflare Deployment'),
      codeBlock(`# wrangler.toml (API Worker)
name = "cafe-api"
main = "dist/index.js"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "cafe-commerce"
database_id = "xxx"

[[r2_buckets]]
binding = "R2"
bucket_name = "cafe-images"

# Deploy D1 migrations
wrangler d1 migrations apply cafe-commerce --remote

# Deploy Worker
wrangler deploy

# Deploy Pages (Frontend)
wrangler pages deploy apps/web/build --project-name=cafe-web`),
      pageBreak(),

      // 9. Kết Luận & Đánh Giá
      heading('9. KẾT LUẬN & ĐÁNH GIÁ'),

      subheading('9.1 Điểm Mạnh'),
      bullet('✅ Kiến trúc sạch: Tách biệt FE/BE/Shared, dễ maintain'),
      bullet('✅ Type-safe xuyên suốt: TypeScript từ database → API → UI'),
      bullet('✅ Zero-config dev: Chạy ngay không cần Docker/cloud setup'),
      bullet('✅ Cloudflare-ready: D1 adapter, R2-ready, Worker-compatible'),
      bullet('✅ Mobile-first UI: Responsive, accessible, modern design'),
      bullet('✅ Admin dashboard: Charts, CRUD, order management built-in'),

      subheading('9.2 Điểm Cần Cải Thiện'),
      bullet('❌ Auth chưa production-ready'),
      bullet('❌ Chưa có test coverage'),
      bullet('❌ Order items chưa normalized'),
      bullet('❌ Validation chưa đầy đủ'),
      bullet('❌ Chưa có CI/CD pipeline'),

      subheading('9.3 Khuyến Nghị Tiếp Theo'),
      bullet('Phase 1 (Security): JWT + bcrypt + rate limiting + helmet'),
      bullet('Phase 2 (Data): Order items table, migrations, seed scripts'),
      bullet('Phase 3 (Features): Payment gateway, image upload, email notifications'),
      bullet('Phase 4 (Quality): Tests, CI/CD, monitoring, logging'),
      bullet('Phase 5 (Scale): Caching, search, analytics, multi-tenant'),
      pageBreak(),

      // 10. Phụ Lục
      heading('10. PHỤ LỤC'),

      subheading('10.1 File Tree Chi Tiết'),
      codeBlock(`apps/api/src/
├── index.ts                 # Express app setup
├── config/env.ts            # Env validation
├── lib/database.ts          # Adapter pattern (Mock + D1)
├── data/mockData.ts         # Seed data
└── routes/
    ├── auth.ts              # Register/Login/Me
    ├── products.ts          # CRUD products
    ├── cart.ts              # Cart operations
    └── orders.ts            # Orders + Checkout

apps/web/src/
├── routes/
│   ├── +layout.svelte       # Nav + slot
│   ├── +page.svelte         # Home page
│   ├── login/+page.svelte   # Auth page
│   ├── cart/+page.svelte    # Cart + Checkout
│   ├── orders/+page.svelte  # Order history
│   ├── account/+page.svelte # Profile
│   └── admin/+page.svelte   # Dashboard
├── lib/
│   ├── auth.ts              # Session management
│   └── mockData.ts          # Frontend seed data
└── app.html                 # HTML template

packages/shared/src/
└── index.ts                 # Shared TypeScript interfaces`),

      subheading('10.2 Scripts Hữu Ích'),
      codeBlock(`// Root package.json
{
  "scripts": {
    "dev": "concurrently \"npm run dev:api\" \"npm run dev:web\"",
    "dev:api": "npm run dev --workspace apps/api",
    "dev:web": "npm run dev --workspace apps/web",
    "build:web": "npm run build --workspace apps/web",
    "check:web": "npm run check --workspace apps/web"
  }
}`),

      new Paragraph({ text: '', spacing: { after: 360 } }),
      paragraph('Báo cáo này được tạo dựa trên phân tích codebase tại commit hiện tại.', false, 20, AlignmentType.CENTER),
      paragraph('Cập nhật lần cuối: 20/10/2026', false, 20, AlignmentType.CENTER),
    ],
  }],
});

// Write to file
Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync(path.join(__dirname, 'Bao_Cao_Cafe_Commerce.docx'), buffer);
  console.log('✅ Word document generated: Bao_Cao_Cafe_Commerce.docx');
}).catch(err => {
  console.error('❌ Error generating docx:', err);
});
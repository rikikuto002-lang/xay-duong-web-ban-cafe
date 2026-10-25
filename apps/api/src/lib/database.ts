import { categories as initialCategories, products as initialProducts } from '../data/mockData.js';

export type DbCategory = {
  id: number;
  name: string;
};

export type DbProduct = {
  id: number;
  name: string;
  category: string;
  price: number;
  stock: number;
  image: string;
  description: string;
};

export type DbOrderItem = {
  productId: number;
  quantity: number;
  price: number;
  name: string;
};

export type DbOrderStatus = 'pending' | 'confirmed' | 'shipping' | 'completed' | 'cancelled';
export type DbPaymentStatus = 'unpaid' | 'paid';

export type DbOrderHistory = {
  status: string;
  note: string;
  timestamp: string;
};

export type DbOrder = {
  id: string;
  userEmail?: string;
  customerName: string;
  phone: string;
  address: string;
  paymentMethod: string;
  paymentStatus: DbPaymentStatus;
  subtotal?: number;
  shippingFee?: number;
  discountAmount?: number;
  couponCode?: string;
  total: number;
  status: DbOrderStatus;
  createdAt: string;
  items: DbOrderItem[];
  history: DbOrderHistory[];
};

export interface DbReservation {
  id: string;
  customerName: string;
  phone: string;
  date: string;
  time: string;
  guestCount: number;
  area: 'indoor' | 'outdoor' | 'vip';
  notes?: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: string;
}

export interface DbReview {
  id: string;
  productId: number;
  customerName: string;
  rating: number; // 1 to 5
  comment: string;
  createdAt: string;
}

export interface DbCoupon {
  code: string;
  type: 'percent' | 'fixed';
  value: number; // e.g. 20 for 20%, 30000 for 30,000đ
  minOrderValue?: number;
  description: string;
  active: boolean;
}

export interface ShippingCalculation {
  zone: string;
  district: string;
  fee: number;
  isFree: boolean;
  minForFree: number;
}

export const SHIPPING_ZONES = [
  {
    id: 'zone1',
    name: 'Nội thành gần (Giao 20-30 phút)',
    fee: 15000,
    freeThreshold: 150000,
    districts: ['Quận 1', 'Quận 3', 'Quận 4', 'Quận 5', 'Quận Bình Thạnh', 'Quận Phú Nhuận']
  },
  {
    id: 'zone2',
    name: 'Nội thành mở rộng (Giao 30-45 phút)',
    fee: 25000,
    freeThreshold: 250000,
    districts: ['Quận 2', 'Quận 7', 'Quận 10', 'Quận 11', 'Quận Tân Bình', 'Quận Tân Phú', 'Quận Gò Vấp']
  },
  {
    id: 'zone3',
    name: 'Ngoại thành & TP. Thủ Đức (Giao 45-60 phút)',
    fee: 35000,
    freeThreshold: 350000,
    districts: ['TP. Thủ Đức', 'Quận 8', 'Quận 9', 'Quận 12', 'Quận Bình Tân', 'Huyện Bình Chánh', 'Huyện Nhà Bè']
  }
];

export function calculateShippingFee(district: string, subtotal: number): ShippingCalculation {
  const normalized = district.trim().toLowerCase();
  for (const zone of SHIPPING_ZONES) {
    if (zone.districts.some(d => d.toLowerCase() === normalized || normalized.includes(d.toLowerCase()))) {
      const isFree = subtotal >= zone.freeThreshold;
      return {
        zone: zone.name,
        district,
        fee: isFree ? 0 : zone.fee,
        isFree,
        minForFree: zone.freeThreshold
      };
    }
  }

  const isFree = subtotal >= 250000;
  return {
    zone: 'Khu vực lân cận',
    district,
    fee: isFree ? 0 : 25000,
    isFree,
    minForFree: 250000
  };
}

export interface DatabaseAdapter {
  listCategories(): Promise<DbCategory[]>;
  createCategory(input: { name: string }): Promise<DbCategory>;
  updateCategory(id: number, input: { name: string }): Promise<DbCategory | null>;
  deleteCategory(id: number): Promise<boolean>;

  listProducts(category?: string): Promise<DbProduct[]>;
  getProductById(id: number): Promise<DbProduct | null>;
  createProduct(input: Partial<DbProduct>): Promise<DbProduct>;
  updateProduct(id: number, input: Partial<DbProduct>): Promise<DbProduct | null>;
  deleteProduct(id: number): Promise<boolean>;

  listOrders(userEmail?: string): Promise<DbOrder[]>;
  getOrderById(id: string): Promise<DbOrder | null>;
  createOrder(input: Omit<DbOrder, 'id' | 'createdAt' | 'history' | 'paymentStatus'> & { history?: DbOrderHistory[]; paymentStatus?: DbPaymentStatus }): Promise<DbOrder>;
  updateOrderStatus(id: string, status: DbOrderStatus, note?: string): Promise<DbOrder | null>;
  updatePaymentStatus(id: string, paymentStatus: DbPaymentStatus, note?: string): Promise<DbOrder | null>;

  // Extensions (P2)
  listReservations(): Promise<DbReservation[]>;
  createReservation(input: Omit<DbReservation, 'id' | 'createdAt' | 'status'>): Promise<DbReservation>;
  updateReservationStatus(id: string, status: 'confirmed' | 'cancelled'): Promise<DbReservation | null>;

  listReviews(productId?: number): Promise<DbReview[]>;
  createReview(input: Omit<DbReview, 'id' | 'createdAt'>): Promise<DbReview>;

  listCoupons(): Promise<DbCoupon[]>;
  getCoupon(code: string): Promise<DbCoupon | null>;
}

class MockDatabaseAdapter implements DatabaseAdapter {
  private categories = [...initialCategories];
  private products = [...initialProducts];
  private orders: DbOrder[] = [];

  private reservations: DbReservation[] = [
    {
      id: 'RES-101',
      customerName: 'Nguyễn Văn Minh',
      phone: '0901234567',
      date: '2026-10-25',
      time: '09:00',
      guestCount: 2,
      area: 'outdoor',
      notes: 'Bàn view vườn nhiều ánh sáng',
      status: 'confirmed',
      createdAt: new Date().toISOString()
    },
    {
      id: 'RES-102',
      customerName: 'Trần Thị Thu',
      phone: '0988776655',
      date: '2026-10-25',
      time: '14:30',
      guestCount: 4,
      area: 'indoor',
      notes: 'Gặp gỡ khách hàng trao đổi dự án',
      status: 'pending',
      createdAt: new Date().toISOString()
    }
  ];

  private reviews: DbReview[] = [
    {
      id: 'REV-1',
      productId: 1,
      customerName: 'Phương Lan',
      rating: 5,
      comment: 'Cà phê rang mộc chuẩn vị, thơm nồng đượm, hậu vị ngọt sâu rất ưng ý!',
      createdAt: new Date().toISOString()
    },
    {
      id: 'REV-2',
      productId: 2,
      customerName: 'Quốc Bảo',
      rating: 5,
      comment: 'Cappuccino bọt sữa đánh chuẩn mịn màng, nhiệt độ vừa vặn khi giao đến tận nơi.',
      createdAt: new Date().toISOString()
    },
    {
      id: 'REV-3',
      productId: 3,
      customerName: 'Thanh Trúc',
      rating: 4,
      comment: 'Trà sữa matcha nguyên chất đậm đà, vị béo thanh mát tuyệt hảo.',
      createdAt: new Date().toISOString()
    }
  ];

  private coupons: DbCoupon[] = [
    {
      code: 'CAFE20',
      type: 'percent',
      value: 20,
      description: 'Giảm 20% tổng giá trị đơn hàng',
      active: true
    },
    {
      code: 'CHAOBAN',
      type: 'fixed',
      value: 30000,
      minOrderValue: 80000,
      description: 'Giảm 30.000đ cho đơn hàng từ 80.000đ',
      active: true
    },
    {
      code: 'VIP50',
      type: 'fixed',
      value: 50000,
      minOrderValue: 150000,
      description: 'Giảm 50.000đ cho đơn hàng từ 150.000đ',
      active: true
    },
    {
      code: 'FREESHIP',
      type: 'fixed',
      value: 25000,
      minOrderValue: 100000,
      description: 'Miễn phí vận chuyển (tối đa 25.000đ)',
      active: true
    }
  ];

  async listCategories(): Promise<DbCategory[]> {
    return [...this.categories];
  }

  async createCategory(input: { name: string }): Promise<DbCategory> {
    const nextCategory: DbCategory = {
      id: Date.now(),
      name: String(input.name).trim()
    };
    this.categories.push(nextCategory);
    return nextCategory;
  }

  async updateCategory(id: number, input: { name: string }): Promise<DbCategory | null> {
    const cat = this.categories.find(c => c.id === id);
    if (!cat) return null;
    cat.name = String(input.name).trim();
    return cat;
  }

  async deleteCategory(id: number): Promise<boolean> {
    const before = this.categories.length;
    this.categories = this.categories.filter(c => c.id !== id);
    return this.categories.length !== before;
  }

  async listProducts(category?: string): Promise<DbProduct[]> {
    if (!category) return [...this.products];
    return this.products.filter((product) => product.category === category);
  }

  async getProductById(id: number): Promise<DbProduct | null> {
    return this.products.find((product) => product.id === id) ?? null;
  }

  async createProduct(input: Partial<DbProduct>): Promise<DbProduct> {
    const nextProduct: DbProduct = {
      id: Number(input.id ?? Date.now()),
      name: String(input.name ?? 'New product'),
      category: String(input.category ?? 'Cà phê rang xay'),
      price: Number(input.price ?? 0),
      stock: Number(input.stock ?? 0),
      image: String(input.image ?? 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=800&q=80'),
      description: String(input.description ?? 'Product description')
    };

    this.products.unshift(nextProduct);
    return nextProduct;
  }

  async updateProduct(id: number, input: Partial<DbProduct>): Promise<DbProduct | null> {
    const index = this.products.findIndex((product) => product.id === id);
    if (index === -1) return null;

    this.products[index] = {
      ...this.products[index],
      ...input,
      id,
      price: Number(input.price ?? this.products[index].price),
      stock: Number(input.stock ?? this.products[index].stock)
    };

    return this.products[index];
  }

  async deleteProduct(id: number): Promise<boolean> {
    const before = this.products.length;
    this.products = this.products.filter((product) => product.id !== id);
    return this.products.length !== before;
  }

  async listOrders(userEmail?: string): Promise<DbOrder[]> {
    if (!userEmail) return [...this.orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return this.orders
      .filter((order) => (order.userEmail ?? '').toLowerCase() === userEmail.toLowerCase())
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getOrderById(id: string): Promise<DbOrder | null> {
    return this.orders.find((order) => order.id === id) ?? null;
  }

  async createOrder(input: Omit<DbOrder, 'id' | 'createdAt' | 'history' | 'paymentStatus'> & { history?: DbOrderHistory[]; paymentStatus?: DbPaymentStatus }): Promise<DbOrder> {
    const now = new Date().toISOString();
    const status: DbOrderStatus = input.status ?? 'pending';
    const paymentStatus: DbPaymentStatus = input.paymentStatus ?? 'unpaid';
    const order: DbOrder = {
      id: `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: now,
      ...input,
      status,
      paymentStatus,
      items: input.items ?? [],
      history: input.history ?? [
        {
          status,
          note: 'Đơn hàng được khởi tạo thành công',
          timestamp: now
        }
      ]
    };

    this.orders.unshift(order);
    return order;
  }

  async updateOrderStatus(id: string, status: DbOrderStatus, note?: string): Promise<DbOrder | null> {
    const order = this.orders.find((entry) => entry.id === id);
    if (!order) return null;

    order.status = status;
    if (!order.history) order.history = [];
    order.history.push({
      status,
      note: note || `Chuyển trạng thái đơn sang: ${status}`,
      timestamp: new Date().toISOString()
    });
    return order;
  }

  async updatePaymentStatus(id: string, paymentStatus: DbPaymentStatus, note?: string): Promise<DbOrder | null> {
    const order = this.orders.find((entry) => entry.id === id);
    if (!order) return null;

    order.paymentStatus = paymentStatus;
    if (!order.history) order.history = [];
    order.history.push({
      status: `payment_${paymentStatus}`,
      note: note || (paymentStatus === 'paid' ? 'Đã nhận thanh toán thành công' : 'Chưa thanh toán'),
      timestamp: new Date().toISOString()
    });
    return order;
  }

  // Reservations
  async listReservations(): Promise<DbReservation[]> {
    return [...this.reservations].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async createReservation(input: Omit<DbReservation, 'id' | 'createdAt' | 'status'>): Promise<DbReservation> {
    const reservation: DbReservation = {
      id: `RES-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
      status: 'pending',
      ...input
    };
    this.reservations.unshift(reservation);
    return reservation;
  }

  async updateReservationStatus(id: string, status: 'confirmed' | 'cancelled'): Promise<DbReservation | null> {
    const found = this.reservations.find(r => r.id === id);
    if (!found) return null;
    found.status = status;
    return found;
  }

  // Reviews
  async listReviews(productId?: number): Promise<DbReview[]> {
    if (productId !== undefined) {
      return this.reviews.filter(r => r.productId === productId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    return [...this.reviews].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async createReview(input: Omit<DbReview, 'id' | 'createdAt'>): Promise<DbReview> {
    const review: DbReview = {
      id: `REV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
      ...input
    };
    this.reviews.unshift(review);
    return review;
  }

  // Coupons
  async listCoupons(): Promise<DbCoupon[]> {
    return this.coupons.filter(c => c.active);
  }

  async getCoupon(code: string): Promise<DbCoupon | null> {
    const normalized = code.trim().toUpperCase();
    return this.coupons.find(c => c.code.toUpperCase() === normalized && c.active) ?? null;
  }
}

class D1DatabaseAdapter implements DatabaseAdapter {
  constructor(
    private readonly db: {
      prepare: (sql: string) => {
        bind: (...args: unknown[]) => { all: () => Promise<{ results?: Record<string, unknown>[] }> };
      };
    }
  ) {}

  async listCategories(): Promise<DbCategory[]> {
    const result = await this.db.prepare('SELECT * FROM categories ORDER BY id').bind().all();
    return (result.results ?? []) as DbCategory[];
  }

  async createCategory(input: { name: string }): Promise<DbCategory> {
    const id = Date.now();
    const name = String(input.name).trim();
    await this.db.prepare('INSERT INTO categories (id, name, slug) VALUES (?, ?, ?)')
      .bind(id, name, name.toLowerCase().replace(/\s+/g, '-'))
      .all();
    return { id, name };
  }

  async updateCategory(id: number, input: { name: string }): Promise<DbCategory | null> {
    const name = String(input.name).trim();
    await this.db.prepare('UPDATE categories SET name = ? WHERE id = ?')
      .bind(name, id)
      .all();
    return { id, name };
  }

  async deleteCategory(id: number): Promise<boolean> {
    await this.db.prepare('DELETE FROM categories WHERE id = ?').bind(id).all();
    return true;
  }

  async listProducts(category?: string): Promise<DbProduct[]> {
    if (category) {
      const result = await this.db
        .prepare('SELECT * FROM products WHERE category = ? ORDER BY id')
        .bind(category)
        .all();
      return (result.results ?? []) as DbProduct[];
    }

    const result = await this.db.prepare('SELECT * FROM products ORDER BY id').bind().all();
    return (result.results ?? []) as DbProduct[];
  }

  async getProductById(id: number): Promise<DbProduct | null> {
    const result = await this.db.prepare('SELECT * FROM products WHERE id = ?').bind(id).all();
    const rows = (result.results ?? []) as DbProduct[];
    return rows[0] ?? null;
  }

  async createProduct(input: Partial<DbProduct>): Promise<DbProduct> {
    const product = {
      id: Number(input.id ?? Date.now()),
      name: String(input.name ?? 'New product'),
      category: String(input.category ?? 'Cà phê rang xay'),
      price: Number(input.price ?? 0),
      stock: Number(input.stock ?? 0),
      image: String(input.image ?? 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=800&q=80'),
      description: String(input.description ?? 'Product description')
    };

    await this.db
      .prepare('INSERT INTO products (id, name, category, price, stock, image, description) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(product.id, product.name, product.category, product.price, product.stock, product.image, product.description)
      .all();

    return product;
  }

  async updateProduct(id: number, input: Partial<DbProduct>): Promise<DbProduct | null> {
    const existing = await this.getProductById(id);
    if (!existing) return null;

    const updated = {
      ...existing,
      ...input,
      id,
      price: Number(input.price ?? existing.price),
      stock: Number(input.stock ?? existing.stock)
    };

    await this.db
      .prepare('UPDATE products SET name = ?, category = ?, price = ?, stock = ?, image = ?, description = ? WHERE id = ?')
      .bind(updated.name, updated.category, updated.price, updated.stock, updated.image, updated.description, id)
      .all();

    return updated;
  }

  async deleteProduct(id: number): Promise<boolean> {
    const existing = await this.getProductById(id);
    if (!existing) return false;

    await this.db.prepare('DELETE FROM products WHERE id = ?').bind(id).all();
    return true;
  }

  async listOrders(userEmail?: string): Promise<DbOrder[]> {
    const rowsResult = await this.db
      .prepare(userEmail ? 'SELECT * FROM orders WHERE user_email = ? ORDER BY created_at DESC' : 'SELECT * FROM orders ORDER BY created_at DESC')
      .bind(userEmail ?? undefined)
      .all();

    const rows = (rowsResult.results ?? []) as Array<Record<string, unknown>>;
    const orders = await Promise.all(
      rows.map(async (row) => {
        const itemResult = await this.db.prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY id').bind(row.id).all();
        const items = ((itemResult.results ?? []) as Array<Record<string, unknown>>).map((item) => ({
          productId: Number(item.product_id ?? item.productId ?? 0),
          quantity: Number(item.quantity ?? 0),
          price: Number(item.price ?? 0),
          name: String(item.name ?? '')
        }));

        let history: DbOrderHistory[] = [];
        try {
          if (typeof row.history_json === 'string') {
            history = JSON.parse(row.history_json);
          }
        } catch {}

        return {
          id: String(row.id ?? ''),
          userEmail: typeof row.user_email === 'string' ? row.user_email : undefined,
          customerName: String(row.customer_name ?? 'Khách hàng'),
          phone: String(row.phone ?? ''),
          address: String(row.address ?? ''),
          paymentMethod: String(row.payment_method ?? 'bank-transfer'),
          paymentStatus: (String(row.payment_status ?? 'unpaid') as DbPaymentStatus),
          subtotal: Number(row.subtotal ?? row.total ?? 0),
          shippingFee: Number(row.shipping_fee ?? 0),
          discountAmount: Number(row.discount_amount ?? 0),
          couponCode: typeof row.coupon_code === 'string' ? row.coupon_code : undefined,
          total: Number(row.total ?? 0),
          status: (String(row.status ?? 'pending') as DbOrderStatus),
          createdAt: String(row.created_at ?? new Date().toISOString()),
          items,
          history
        } satisfies DbOrder;
      })
    );

    return orders;
  }

  async getOrderById(id: string): Promise<DbOrder | null> {
    const result = await this.db.prepare('SELECT * FROM orders WHERE id = ?').bind(id).all();
    const rows = (result.results ?? []) as Array<Record<string, unknown>>;
    const row = rows[0];
    if (!row) return null;

    const itemsResult = await this.db.prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY id').bind(id).all();
    const items = ((itemsResult.results ?? []) as Array<Record<string, unknown>>).map((item) => ({
      productId: Number(item.product_id ?? item.productId ?? 0),
      quantity: Number(item.quantity ?? 0),
      price: Number(item.price ?? 0),
      name: String(item.name ?? '')
    }));

    let history: DbOrderHistory[] = [];
    try {
      if (typeof row.history_json === 'string') {
        history = JSON.parse(row.history_json);
      }
    } catch {}

    return {
      id: String(row.id ?? ''),
      userEmail: typeof row.user_email === 'string' ? row.user_email : undefined,
      customerName: String(row.customer_name ?? 'Khách hàng'),
      phone: String(row.phone ?? ''),
      address: String(row.address ?? ''),
      paymentMethod: String(row.payment_method ?? 'bank-transfer'),
      paymentStatus: (String(row.payment_status ?? 'unpaid') as DbPaymentStatus),
      subtotal: Number(row.subtotal ?? row.total ?? 0),
      shippingFee: Number(row.shipping_fee ?? 0),
      discountAmount: Number(row.discount_amount ?? 0),
      couponCode: typeof row.coupon_code === 'string' ? row.coupon_code : undefined,
      total: Number(row.total ?? 0),
      status: (String(row.status ?? 'pending') as DbOrderStatus),
      createdAt: String(row.created_at ?? new Date().toISOString()),
      items,
      history
    };
  }

  async createOrder(input: Omit<DbOrder, 'id' | 'createdAt' | 'history' | 'paymentStatus'> & { history?: DbOrderHistory[]; paymentStatus?: DbPaymentStatus }): Promise<DbOrder> {
    const now = new Date().toISOString();
    const status: DbOrderStatus = input.status ?? 'pending';
    const paymentStatus: DbPaymentStatus = input.paymentStatus ?? 'unpaid';
    const history: DbOrderHistory[] = input.history ?? [{ status, note: 'Đơn hàng được khởi tạo', timestamp: now }];

    const order: DbOrder = {
      id: `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: now,
      ...input,
      status,
      paymentStatus,
      items: input.items ?? [],
      history
    };

    await this.db
      .prepare(
        'INSERT INTO orders (id, user_email, customer_name, phone, address, payment_method, payment_status, total, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      )
      .bind(
        order.id,
        order.userEmail ?? null,
        order.customerName,
        order.phone,
        order.address,
        order.paymentMethod,
        order.paymentStatus,
        order.total,
        order.status,
        order.createdAt
      )
      .all();

    for (const item of order.items) {
      await this.db
        .prepare('INSERT INTO order_items (order_id, product_id, quantity, price, name) VALUES (?, ?, ?, ?, ?)')
        .bind(order.id, item.productId, item.quantity, item.price, item.name)
        .all();
    }

    return order;
  }

  async updateOrderStatus(id: string, status: DbOrderStatus, note?: string): Promise<DbOrder | null> {
    const existing = await this.getOrderById(id);
    if (!existing) return null;

    await this.db.prepare('UPDATE orders SET status = ? WHERE id = ?').bind(status, id).all();
    const updatedHistory = [...(existing.history ?? []), { status, note: note || `Chuyển trạng thái: ${status}`, timestamp: new Date().toISOString() }];
    return { ...existing, status, history: updatedHistory };
  }

  async updatePaymentStatus(id: string, paymentStatus: DbPaymentStatus, note?: string): Promise<DbOrder | null> {
    const existing = await this.getOrderById(id);
    if (!existing) return null;

    await this.db.prepare('UPDATE orders SET payment_status = ? WHERE id = ?').bind(paymentStatus, id).all();
    const updatedHistory = [...(existing.history ?? []), { status: `payment_${paymentStatus}`, note: note || (paymentStatus === 'paid' ? 'Đã nhận thanh toán thành công' : 'Chưa thanh toán'), timestamp: new Date().toISOString() }];
    return { ...existing, paymentStatus, history: updatedHistory };
  }

  // Fallbacks for D1
  async listReservations(): Promise<DbReservation[]> {
    return [];
  }
  async createReservation(input: Omit<DbReservation, 'id' | 'createdAt' | 'status'>): Promise<DbReservation> {
    return { id: `RES-${Date.now()}`, createdAt: new Date().toISOString(), status: 'pending', ...input };
  }
  async updateReservationStatus(_id: string, _status: 'confirmed' | 'cancelled'): Promise<DbReservation | null> {
    return null;
  }
  async listReviews(): Promise<DbReview[]> {
    return [];
  }
  async createReview(input: Omit<DbReview, 'id' | 'createdAt'>): Promise<DbReview> {
    return { id: `REV-${Date.now()}`, createdAt: new Date().toISOString(), ...input };
  }
  async listCoupons(): Promise<DbCoupon[]> {
    return [];
  }
  async getCoupon(_code: string): Promise<DbCoupon | null> {
    return null;
  }
}

export async function getDatabase(): Promise<DatabaseAdapter> {
  const dbBinding = (globalThis as { DB?: unknown }).DB ?? process.env.D1_DATABASE;

  if (dbBinding && typeof (dbBinding as { prepare?: unknown }).prepare === 'function') {
    return new D1DatabaseAdapter(dbBinding as {
      prepare: (sql: string) => {
        bind: (...args: unknown[]) => { all: () => Promise<{ results?: Record<string, unknown>[] }> };
      };
    });
  }

  const g = globalThis as { __mockDb?: MockDatabaseAdapter };
  if (!g.__mockDb) {
    g.__mockDb = new MockDatabaseAdapter();
  }
  return g.__mockDb;
}

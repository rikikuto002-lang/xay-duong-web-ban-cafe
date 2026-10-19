import { categories as initialCategories, products as initialProducts, cartItems as initialCartItems } from '../data/mockData.js';

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

export type DbOrder = {
  id: string;
  customerName: string;
  phone: string;
  address: string;
  paymentMethod: string;
  total: number;
  status: string;
  createdAt: string;
};

export interface DatabaseAdapter {
  listCategories(): Promise<DbCategory[]>;
  listProducts(category?: string): Promise<DbProduct[]>;
  getProductById(id: number): Promise<DbProduct | null>;
  createProduct(input: Partial<DbProduct>): Promise<DbProduct>;
  updateProduct(id: number, input: Partial<DbProduct>): Promise<DbProduct | null>;
  deleteProduct(id: number): Promise<boolean>;
  createOrder(input: Omit<DbOrder, 'id' | 'createdAt'>): Promise<DbOrder>;
}

class MockDatabaseAdapter implements DatabaseAdapter {
  private categories = [...initialCategories];
  private products = [...initialProducts];
  private orders: DbOrder[] = [];

  async listCategories(): Promise<DbCategory[]> {
    return [...this.categories];
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

  async createOrder(input: Omit<DbOrder, 'id' | 'createdAt'>): Promise<DbOrder> {
    const order: DbOrder = {
      id: `ORD-${Date.now()}`,
      createdAt: new Date().toISOString(),
      ...input
    };

    this.orders.push(order);
    return order;
  }
}

class D1DatabaseAdapter implements DatabaseAdapter {
  constructor(private readonly db: { prepare: (sql: string) => { bind: (...args: unknown[]) => { all: () => Promise<{ results?: Record<string, unknown>[] }> } } }) {}

  async listCategories(): Promise<DbCategory[]> {
    const result = await this.db.prepare('SELECT * FROM categories ORDER BY id').bind().all();
    return (result.results ?? []) as DbCategory[];
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
      .prepare(
        'INSERT INTO products (id, name, category, price, stock, image, description) VALUES (?, ?, ?, ?, ?, ?, ?)'
      )
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
      .prepare(
        'UPDATE products SET name = ?, category = ?, price = ?, stock = ?, image = ?, description = ? WHERE id = ?'
      )
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

  async createOrder(input: Omit<DbOrder, 'id' | 'createdAt'>): Promise<DbOrder> {
    const order: DbOrder = {
      id: `ORD-${Date.now()}`,
      createdAt: new Date().toISOString(),
      ...input
    };

    await this.db
      .prepare(
        'INSERT INTO orders (id, customer_name, phone, address, payment_method, total, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      )
      .bind(
        order.id,
        order.customerName,
        order.phone,
        order.address,
        order.paymentMethod,
        order.total,
        order.status,
        order.createdAt
      )
      .all();

    return order;
  }
}

export async function getDatabase(): Promise<DatabaseAdapter> {
  const dbBinding = (globalThis as { DB?: unknown }).DB ?? process.env.D1_DATABASE;

  if (dbBinding && typeof (dbBinding as { prepare?: unknown }).prepare === 'function') {
    return new D1DatabaseAdapter(dbBinding as { prepare: (sql: string) => { bind: (...args: unknown[]) => { all: () => Promise<{ results?: Record<string, unknown>[] }> } } });
  }

  return new MockDatabaseAdapter();
}

import { categories as initialCategories, products as initialProducts } from '../data/mockData.js';
class MockDatabaseAdapter {
    categories = [...initialCategories];
    products = [...initialProducts];
    orders = [];
    async listCategories() {
        return [...this.categories];
    }
    async listProducts(category) {
        if (!category)
            return [...this.products];
        return this.products.filter((product) => product.category === category);
    }
    async getProductById(id) {
        return this.products.find((product) => product.id === id) ?? null;
    }
    async createProduct(input) {
        const nextProduct = {
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
    async updateProduct(id, input) {
        const index = this.products.findIndex((product) => product.id === id);
        if (index === -1)
            return null;
        this.products[index] = {
            ...this.products[index],
            ...input,
            id,
            price: Number(input.price ?? this.products[index].price),
            stock: Number(input.stock ?? this.products[index].stock)
        };
        return this.products[index];
    }
    async deleteProduct(id) {
        const before = this.products.length;
        this.products = this.products.filter((product) => product.id !== id);
        return this.products.length !== before;
    }
    async createOrder(input) {
        const order = {
            id: `ORD-${Date.now()}`,
            createdAt: new Date().toISOString(),
            ...input
        };
        this.orders.push(order);
        return order;
    }
}
class D1DatabaseAdapter {
    db;
    constructor(db) {
        this.db = db;
    }
    async listCategories() {
        const result = await this.db.prepare('SELECT * FROM categories ORDER BY id').bind().all();
        return (result.results ?? []);
    }
    async listProducts(category) {
        if (category) {
            const result = await this.db
                .prepare('SELECT * FROM products WHERE category = ? ORDER BY id')
                .bind(category)
                .all();
            return (result.results ?? []);
        }
        const result = await this.db.prepare('SELECT * FROM products ORDER BY id').bind().all();
        return (result.results ?? []);
    }
    async getProductById(id) {
        const result = await this.db.prepare('SELECT * FROM products WHERE id = ?').bind(id).all();
        const rows = (result.results ?? []);
        return rows[0] ?? null;
    }
    async createProduct(input) {
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
    async updateProduct(id, input) {
        const existing = await this.getProductById(id);
        if (!existing)
            return null;
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
    async deleteProduct(id) {
        const existing = await this.getProductById(id);
        if (!existing)
            return false;
        await this.db.prepare('DELETE FROM products WHERE id = ?').bind(id).all();
        return true;
    }
    async createOrder(input) {
        const order = {
            id: `ORD-${Date.now()}`,
            createdAt: new Date().toISOString(),
            ...input
        };
        await this.db
            .prepare('INSERT INTO orders (id, customer_name, phone, address, payment_method, total, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
            .bind(order.id, order.customerName, order.phone, order.address, order.paymentMethod, order.total, order.status, order.createdAt)
            .all();
        return order;
    }
}
export async function getDatabase() {
    const dbBinding = globalThis.DB ?? process.env.D1_DATABASE;
    if (dbBinding && typeof dbBinding.prepare === 'function') {
        return new D1DatabaseAdapter(dbBinding);
    }
    return new MockDatabaseAdapter();
}

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDatabase } from '../apps/api/src/lib/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKUP_DIR = path.resolve(__dirname, '../backups');

async function runBackup() {
  console.log('🔄 Starting automated Cafe Database backup...');

  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const db = await getDatabase();
  const [categories, products, orders] = await Promise.all([
    db.listCategories(),
    db.listProducts(),
    db.listOrders()
  ]);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupData = {
    metadata: {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      recordCounts: {
        categories: categories.length,
        products: products.length,
        orders: orders.length
      }
    },
    tables: {
      categories,
      products,
      orders
    }
  };

  // 1. Save JSON Dump
  const jsonPath = path.join(BACKUP_DIR, `backup-${timestamp}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(backupData, null, 2), 'utf-8');
  console.log(`✅ Saved JSON backup: ${jsonPath}`);

  // 2. Save SQL statements dump
  const sqlLines = [
    `-- Cafe Commerce Database Backup: ${new Date().toISOString()}`,
    'BEGIN TRANSACTION;'
  ];

  for (const cat of categories) {
    const slug = cat.name.toLowerCase().replace(/\s+/g, '-');
    sqlLines.push(
      `INSERT OR REPLACE INTO categories (id, name, slug) VALUES ('${cat.id}', '${cat.name.replace(/'/g, "''")}', '${slug}');`
    );
  }

  for (const prod of products) {
    sqlLines.push(
      `INSERT OR REPLACE INTO products (id, name, price, stock, category_id, image_url, description) VALUES (${prod.id}, '${prod.name.replace(/'/g, "''")}', ${prod.price}, ${prod.stock}, '${prod.category}', '${prod.image}', '${prod.description.replace(/'/g, "''")}');`
    );
  }

  for (const ord of orders) {
    sqlLines.push(
      `INSERT OR REPLACE INTO orders (id, customer_name, phone, address, payment_method, payment_status, status, total, created_at) VALUES ('${ord.id}', '${ord.customerName.replace(/'/g, "''")}', '${ord.phone}', '${ord.address.replace(/'/g, "''")}', '${ord.paymentMethod}', '${ord.paymentStatus}', '${ord.status}', ${ord.total}, '${ord.createdAt}');`
    );
  }

  sqlLines.push('COMMIT;');

  const sqlPath = path.join(BACKUP_DIR, `backup-${timestamp}.sql`);
  fs.writeFileSync(sqlPath, sqlLines.join('\n'), 'utf-8');
  console.log(`✅ Saved SQL backup: ${sqlPath}`);

  // 3. Retention policy: Remove backups older than 7 days
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const files = fs.readdirSync(BACKUP_DIR);
  let removedCount = 0;

  for (const file of files) {
    const fullPath = path.join(BACKUP_DIR, file);
    const stats = fs.statSync(fullPath);
    if (stats.mtimeMs < sevenDaysAgo) {
      fs.unlinkSync(fullPath);
      removedCount++;
    }
  }

  if (removedCount > 0) {
    console.log(`🧹 Cleaned up ${removedCount} outdated backup file(s).`);
  }
  console.log(`🎉 Backup completed successfully! (Categories: ${categories.length}, Products: ${products.length}, Orders: ${orders.length})`);
}

runBackup().catch((err) => {
  console.error('❌ Database Backup Failed:', err);
  process.exit(1);
});

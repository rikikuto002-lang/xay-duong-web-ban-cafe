import { Router } from 'express';
import { getDatabase } from '../lib/database.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/stats', authMiddleware, requireRole('admin'), async (_req, res) => {
  const db = await getDatabase();
  const orders = await db.listOrders();
  const products = await db.listProducts();
  const categories = await db.listCategories();

  // 1. Revenue calculation (only non-cancelled orders count towards revenue)
  const validOrders = orders.filter((o) => o.status !== 'cancelled');
  const revenue = validOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
  const paidRevenue = orders
    .filter((o) => o.paymentStatus === 'paid' && o.status !== 'cancelled')
    .reduce((sum, o) => sum + Number(o.total || 0), 0);

  // 2. Status counts
  const pendingCount = orders.filter((o) => o.status === 'pending').length;
  const confirmedCount = orders.filter((o) => o.status === 'confirmed').length;
  const shippingCount = orders.filter((o) => o.status === 'shipping').length;
  const completedCount = orders.filter((o) => o.status === 'completed').length;
  const cancelledCount = orders.filter((o) => o.status === 'cancelled').length;

  // 3. Real 7-day sales trend based on order creation timestamps
  const now = new Date();
  const salesTrend7Days: Array<{ date: string; dayLabel: string; revenue: number; orderCount: number }> = [];

  for (let i = 6; i >= 0; i--) {
    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() - i);
    const dateStr = targetDate.toISOString().slice(0, 10);
    const dayLabel = targetDate.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' });

    const dayOrders = validOrders.filter((o) => o.createdAt && o.createdAt.slice(0, 10) === dateStr);
    const dayRevenue = dayOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);

    salesTrend7Days.push({
      date: dateStr,
      dayLabel,
      revenue: dayRevenue,
      orderCount: dayOrders.length
    });
  }

  // 4. Real Category breakdown
  const categoryMap = new Map<string, number>();
  for (const cat of categories) {
    categoryMap.set(cat.name, 0);
  }

  // Count products per category
  for (const prod of products) {
    const current = categoryMap.get(prod.category) ?? 0;
    categoryMap.set(prod.category, current + 1);
  }

  const categoryBreakdown = Array.from(categoryMap.entries()).map(([label, count]) => ({
    label,
    count
  }));

  return res.json({
    revenue,
    paidRevenue,
    ordersCount: orders.length,
    pendingCount,
    confirmedCount,
    shippingCount,
    completedCount,
    cancelledCount,
    salesTrend7Days,
    categoryBreakdown,
    productsCount: products.length,
    categoriesCount: categories.length
  });
});

export default router;


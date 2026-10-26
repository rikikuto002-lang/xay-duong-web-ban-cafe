import { Hono } from 'hono';
import { getDatabase } from '../lib/database.js';

const reviewsRouter = new Hono();

// GET /api/reviews/product/:productId (get reviews for a product)
reviewsRouter.get('/product/:productId', async (c) => {
  const productId = Number(c.req.param('productId'));
  const db = await getDatabase();
  const reviews = await db.listReviews(productId);

  const averageRating = reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : '5.0';

  return c.json({
    success: true,
    reviews,
    count: reviews.length,
    averageRating: Number(averageRating)
  });
});

// POST /api/reviews/product/:productId (submit review for a product)
reviewsRouter.post('/product/:productId', async (c) => {
  const productId = Number(c.req.param('productId'));
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const { customerName, rating, comment } = body;

  if (!customerName || !comment) {
    return c.json({
      success: false,
      message: 'Vui lòng nhập tên của bạn và nội dung nhận xét.'
    }, 400);
  }

  const numericRating = Math.min(5, Math.max(1, Number(rating) || 5));

  const db = await getDatabase();
  const review = await db.createReview({
    productId,
    customerName: String(customerName).trim(),
    rating: numericRating,
    comment: String(comment).trim()
  });

  return c.json({
    success: true,
    message: 'Cảm ơn bạn đã gửi đánh giá trải nghiệm!',
    review
  }, 201);
});

export default reviewsRouter;

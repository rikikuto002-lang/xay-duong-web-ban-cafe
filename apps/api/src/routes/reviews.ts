import { Router } from 'express';
import { getDatabase } from '../lib/database.js';

const reviewsRouter = Router();

// GET /api/reviews/product/:productId (get reviews for a product)
reviewsRouter.get('/product/:productId', async (req, res) => {
  const productId = Number(req.params.productId);
  const db = await getDatabase();
  const reviews = await db.listReviews(productId);

  const averageRating = reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : '5.0';

  res.json({
    success: true,
    reviews,
    count: reviews.length,
    averageRating: Number(averageRating)
  });
});

// POST /api/reviews/product/:productId (submit review for a product)
reviewsRouter.post('/product/:productId', async (req, res) => {
  const productId = Number(req.params.productId);
  const { customerName, rating, comment } = req.body ?? {};

  if (!customerName || !comment) {
    res.status(400).json({
      success: false,
      message: 'Vui lòng nhập tên của bạn và nội dung nhận xét.'
    });
    return;
  }

  const numericRating = Math.min(5, Math.max(1, Number(rating) || 5));

  const db = await getDatabase();
  const review = await db.createReview({
    productId,
    customerName: String(customerName).trim(),
    rating: numericRating,
    comment: String(comment).trim()
  });

  res.status(201).json({
    success: true,
    message: 'Cảm ơn bạn đã gửi đánh giá trải nghiệm!',
    review
  });
});

export default reviewsRouter;


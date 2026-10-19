import { Router } from 'express';
import { cartItems, products } from '../data/mockData.js';
const router = Router();
router.get('/', (req, res) => {
    const items = cartItems.map((entry) => {
        const product = products.find((item) => item.id === entry.productId);
        return {
            productId: entry.productId,
            quantity: entry.quantity,
            name: product?.name,
            price: product?.price,
            total: (product?.price ?? 0) * entry.quantity
        };
    });
    res.json({
        message: 'Giỏ hàng hiện tại',
        items,
        total: items.reduce((sum, item) => sum + (item.total ?? 0), 0)
    });
});
router.post('/add', (req, res) => {
    const { productId, quantity = 1 } = req.body;
    cartItems.push({ productId, quantity });
    res.status(200).json({
        message: 'Đã thêm sản phẩm vào giỏ hàng',
        item: { productId, quantity }
    });
});
export default router;

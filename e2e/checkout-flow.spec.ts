import { test, expect } from '@playwright/test';

test.describe('E2E Purchase Flow - Cafe Commerce', () => {
  test('User can browse menu, view product modal, add to cart, and proceed to checkout', async ({ page }) => {
    // 1. Visit Home Page
    await page.goto('/');
    await expect(page).toHaveTitle(/CafeZone/);

    // 2. Search for a product
    const searchInput = page.getByPlaceholder(/Tìm theo tên/);
    await expect(searchInput).toBeVisible();
    await searchInput.fill('cappuccino');

    // 3. Open product detail modal
    const productCard = page.locator('.product-card').first();
    await expect(productCard).toBeVisible();
    await productCard.getByRole('button', { name: /Chi tiết/i }).click();

    // Verify modal elements
    const modal = page.locator('.detail-modal');
    await expect(modal).toBeVisible();
    await expect(modal.getByRole('heading', { level: 2 })).toContainText(/Cappuccino/i);

    // 4. Add product to cart from modal
    const addToCartBtn = modal.getByRole('button', { name: /Thêm vào giỏ hàng/i });
    await addToCartBtn.click();

    // Verify toast confirmation
    await expect(page.locator('.toast-popup')).toBeVisible();

    // 5. Navigate to Cart page
    await page.goto('/cart');
    await expect(page.locator('h1')).toContainText(/Giỏ hàng/i);

    // Verify item in cart table
    const cartItem = page.locator('.cart-item');
    await expect(cartItem).toBeVisible();

    // 6. Fill customer delivery form
    await page.fill('#customer-name', 'Nguyễn Văn Test');
    await page.fill('#customer-phone', '0912345678');
    await page.fill('#customer-address', '123 Phố Cà Phê, Quận 1, TP.HCM');

    // Choose bank transfer
    await page.check('input[value="bank-transfer"]');

    // 7. Click Place Order
    await page.click('.checkout-btn');

    // 8. Order success & receipt view
    await expect(page.locator('.order-receipt')).toBeVisible();
    await expect(page.locator('.order-receipt')).toContainText(/Đặt hàng thành công/i);
    await expect(page.locator('.vietqr-image')).toBeVisible();
  });
});

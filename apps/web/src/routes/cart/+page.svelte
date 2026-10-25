<script lang="ts">
  import { onMount } from 'svelte';
  import { getCartStorageKey, getSession, notifyCartUpdated } from '$lib/auth';
  import { initialProducts, type Product } from '$lib/mockData';

  export let data: Record<string, unknown> = {};
  export let params: Record<string, string> = {};

  const routeState = { data, params };
  void routeState;

  const API_URL = import.meta.env.PUBLIC_API_URL ?? 'http://localhost:4000';

  type CartEntry = {
    id: number;
    name: string;
    quantity: number;
    price: number;
    image: string;
    stock: number;
  };

  let items: CartEntry[] = [];
  let customerName = '';
  let phone = '';
  let address = '';
  let selectedDistrict = 'Quận 1';
  let paymentMethod = 'bank-transfer';
  let message = '';
  let isError = false;
  let isLoading = false;
  let isFetchingCart = true;
  let createdOrder: any = null;
  let bankDetails: any = null;
  let isLoggedIn = false;

  // Coupon state
  let couponInput = '';
  let appliedCoupon: { code: string; type: string; value: number; description: string } | null = null;
  let couponDiscount = 0;
  let couponMessage = '';
  let couponError = false;

  const DISTRICT_OPTIONS = [
    { name: 'Quận 1 (Nội thành gần - 15.000đ)', value: 'Quận 1' },
    { name: 'Quận 3 (Nội thành gần - 15.000đ)', value: 'Quận 3' },
    { name: 'Quận 4 (Nội thành gần - 15.000đ)', value: 'Quận 4' },
    { name: 'Quận 5 (Nội thành gần - 15.000đ)', value: 'Quận 5' },
    { name: 'Quận Bình Thạnh (Nội thành gần - 15.000đ)', value: 'Quận Bình Thạnh' },
    { name: 'Quận Phú Nhuận (Nội thành gần - 15.000đ)', value: 'Quận Phú Nhuận' },
    { name: 'Quận 2 (Nội thành xa - 25.000đ)', value: 'Quận 2' },
    { name: 'Quận 7 (Nội thành xa - 25.000đ)', value: 'Quận 7' },
    { name: 'Quận 10 (Nội thành xa - 25.000đ)', value: 'Quận 10' },
    { name: 'Quận Tân Bình (Nội thành xa - 25.000đ)', value: 'Quận Tân Bình' },
    { name: 'Quận Gò Vấp (Nội thành xa - 25.000đ)', value: 'Quận Gò Vấp' },
    { name: 'TP. Thủ Đức (Ngoại thành - 35.000đ)', value: 'TP. Thủ Đức' },
    { name: 'Quận 8 (Ngoại thành - 35.000đ)', value: 'Quận 8' },
    { name: 'Quận 12 (Ngoại thành - 35.000đ)', value: 'Quận 12' }
  ];

  async function fetchLiveProducts(): Promise<Map<number, Product>> {
    try {
      const response = await fetch(`${API_URL}/api/products`);
      if (response.ok) {
        const resData = await response.json();
        if (Array.isArray(resData.products) && resData.products.length > 0) {
          localStorage.setItem('cafeProducts', JSON.stringify(resData.products));
          return new Map(resData.products.map((p: Product) => [p.id, p]));
        }
      }
    } catch {}

    const saved = localStorage.getItem('cafeProducts');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return new Map(parsed.map((p: Product) => [p.id, p]));
      } catch {}
    }
    return new Map(initialProducts.map((p) => [p.id, p]));
  }

  async function loadCart() {
    isFetchingCart = true;
    const cartKey = getCartStorageKey();
    const raw = localStorage.getItem(cartKey);
    const cart = raw ? JSON.parse(raw) : [];

    const productMap = await fetchLiveProducts();

    items = cart
      .map((entry: { productId: number; quantity: number }) => {
        const product = productMap.get(entry.productId);
        if (!product) return null;
        return {
          id: product.id,
          name: product.name,
          quantity: Math.max(1, entry.quantity),
          price: product.price,
          image: product.image,
          stock: product.stock
        };
      })
      .filter(Boolean) as CartEntry[];

    saveCartState();
    isFetchingCart = false;
  }

  function saveCartState() {
    const cartKey = getCartStorageKey();
    const serialized = items.map((i) => ({ productId: i.id, quantity: i.quantity }));
    localStorage.setItem(cartKey, JSON.stringify(serialized));
    notifyCartUpdated();
  }

  function increaseQuantity(id: number) {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    if (item.quantity >= item.stock) {
      message = `Sản phẩm "${item.name}" chỉ còn ${item.stock} trong kho.`;
      isError = true;
      return;
    }
    item.quantity += 1;
    items = [...items];
    saveCartState();
    message = '';
  }

  function decreaseQuantity(id: number) {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    if (item.quantity > 1) {
      item.quantity -= 1;
      items = [...items];
      saveCartState();
    } else {
      removeItem(id);
    }
    message = '';
  }

  function removeItem(id: number) {
    items = items.filter((i) => i.id !== id);
    saveCartState();
    message = '';
  }

  onMount(async () => {
    const session = getSession();
    isLoggedIn = Boolean(session?.token);
    if (session?.user) {
      customerName = session.user.name ?? '';
    }
    await loadCart();
  });

  // Calculate pricing
  $: subtotal = items.reduce((sum, item) => sum + item.quantity * item.price, 0);

  // Dynamic Shipping by district
  $: shippingFee = (() => {
    if (subtotal === 0) return 0;
    const dist = selectedDistrict.toLowerCase();
    if (dist.includes('quận 1') || dist.includes('quận 3') || dist.includes('quận 4') || dist.includes('quận 5') || dist.includes('bình thạnh') || dist.includes('phú nhuận')) {
      return subtotal >= 150000 ? 0 : 15000;
    }
    if (dist.includes('quận 2') || dist.includes('quận 7') || dist.includes('quận 10') || dist.includes('tân bình') || dist.includes('gò vấp')) {
      return subtotal >= 250000 ? 0 : 25000;
    }
    return subtotal >= 350000 ? 0 : 35000;
  })();

  $: total = Math.max(0, subtotal + shippingFee - couponDiscount);

  // Apply Coupon
  async function handleApplyCoupon() {
    if (!couponInput.trim()) {
      couponError = true;
      couponMessage = 'Vui lòng nhập mã giảm giá (ví dụ: CAFE20, CHAOBAN).';
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/coupons/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponInput.trim(), subtotal })
      });
      const data = await res.json();

      if (!res.ok) {
        couponError = true;
        couponMessage = data.message || 'Mã giảm giá không hợp lệ.';
        appliedCoupon = null;
        couponDiscount = 0;
        return;
      }

      appliedCoupon = data.coupon;
      couponDiscount = data.discountAmount;
      couponError = false;
      couponMessage = data.message;
    } catch {
      couponError = true;
      couponMessage = 'Lỗi kết nối khi kiểm tra mã voucher.';
    }
  }

  function removeCoupon() {
    appliedCoupon = null;
    couponDiscount = 0;
    couponMessage = '';
    couponInput = '';
  }

  async function handleCheckout() {
    const sessionUser = getSession();

    if (!sessionUser?.token) {
      isError = true;
      message = 'Vui lòng đăng nhập tài khoản để đặt hàng.';
      return;
    }

    if (!items.length) {
      isError = true;
      message = 'Giỏ hàng đang trống. Vui lòng chọn sản phẩm.';
      return;
    }

    if (!customerName.trim() || !phone.trim() || !address.trim()) {
      isError = true;
      message = 'Vui lòng điền đầy đủ họ tên, số điện thoại và địa chỉ giao hàng.';
      return;
    }

    for (const item of items) {
      if (item.quantity > item.stock) {
        isError = true;
        message = `Sản phẩm "${item.name}" không đủ số lượng trong kho (chỉ còn ${item.stock}).`;
        return;
      }
    }

    const payload = {
      customerName: customerName.trim(),
      phone: phone.trim(),
      address: `${address.trim()}, ${selectedDistrict}`,
      paymentMethod,
      district: selectedDistrict,
      couponCode: appliedCoupon?.code,
      items: items.map((item) => ({ productId: item.id, quantity: item.quantity }))
    };

    isLoading = true;
    message = '';
    isError = false;

    try {
      const response = await fetch(`${API_URL}/api/orders/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionUser.token}`
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok) {
        isError = true;
        message = result.message ?? 'Đặt hàng thất bại. Vui lòng kiểm tra lại.';
        return;
      }

      isError = false;
      message = result.message ?? 'Đặt hàng thành công!';
      createdOrder = result.order;
      bankDetails = result.bank;

      // Clear cart
      localStorage.removeItem(getCartStorageKey());
      items = [];
      notifyCartUpdated();
    } catch {
      isError = true;
      message = 'Lỗi kết nối máy chủ. Không thể tạo đơn hàng. Vui lòng thử lại sau.';
    } finally {
      isLoading = false;
    }
  }
</script>

<svelte:head>
  <title>Giỏ hàng & Đặt hàng | CafeZone</title>
</svelte:head>

<section class="page-shell">
  <div class="cart-header">
    <h1>Giỏ hàng của bạn</h1>
    {#if !createdOrder && items.length > 0}
      <span class="badge">{items.length} món</span>
    {/if}
  </div>

  {#if createdOrder}
    <div class="success-box">
      <div class="success-icon">✓</div>
      <h2>Đặt hàng thành công!</h2>
      <p class="order-id">Mã đơn hàng: <strong>#{createdOrder.id}</strong></p>
      <p class="order-desc">Cảm ơn bạn đã đặt hàng tại CafeZone. Đơn hàng đang ở trạng thái <em>Chờ xác nhận</em>.</p>

      <div class="order-summary-card">
        <h3>Chi tiết hóa đơn</h3>
        <p><strong>Người nhận:</strong> {createdOrder.customerName} ({createdOrder.phone})</p>
        <p><strong>Địa chỉ:</strong> {createdOrder.address}</p>
        <p><strong>Phương thức:</strong> {createdOrder.paymentMethod === 'bank-transfer' ? 'Chuyển khoản VietQR' : 'Thanh toán COD'}</p>

        <div class="order-items-mini">
          {#each createdOrder.items as it}
            <div class="mini-item">
              <span>{it.name} x {it.quantity}</span>
              <strong>{(it.price * it.quantity).toLocaleString('vi-VN')}đ</strong>
            </div>
          {/each}
        </div>

        {#if createdOrder.discountAmount > 0}
          <div class="mini-row discount-row">
            <span>Giảm giá Voucher ({createdOrder.couponCode}):</span>
            <strong>-{createdOrder.discountAmount.toLocaleString('vi-VN')}đ</strong>
          </div>
        {/if}

        {#if createdOrder.shippingFee !== undefined}
          <div class="mini-row">
            <span>Phí vận chuyển:</span>
            <strong>{createdOrder.shippingFee === 0 ? 'Miễn phí' : `${createdOrder.shippingFee.toLocaleString('vi-VN')}đ`}</strong>
          </div>
        {/if}

        <div class="mini-total">
          <span>Tổng thanh toán:</span>
          <strong>{Number(createdOrder.total).toLocaleString('vi-VN')}đ</strong>
        </div>
      </div>

      {#if createdOrder.paymentMethod === 'bank-transfer' && bankDetails}
        <div class="bank-box">
          <h3>Quét mã VietQR để thanh toán</h3>
          {#if createdOrder.qrUrl}
            <div class="qr-preview-box">
              <img src={createdOrder.qrUrl} alt="VietQR Thanh Toán" class="vietqr-image" />
            </div>
          {/if}
          <div class="bank-info-grid">
            <p><strong>Ngân hàng:</strong> {bankDetails.bankName}</p>
            <p><strong>Chủ tài khoản:</strong> {bankDetails.accountName}</p>
            <p><strong>Số tài khoản:</strong> <code>{bankDetails.accountNumber}</code></p>
            <p><strong>Nội dung:</strong> <code>{bankDetails.content}</code></p>
          </div>
          <p class="bank-note">Sau khi chuyển khoản đúng cú pháp, đơn hàng sẽ tự động chuyển sang <strong>Đã thanh toán (paid)</strong>.</p>
        </div>
      {/if}

      <div class="actions">
        <a href="/orders" class="btn primary">Xem lịch sử đơn hàng</a>
        <a href="/" class="btn secondary">Tiếp tục mua sắm</a>
      </div>
    </div>
  {:else if isFetchingCart}
    <div class="empty-state">
      <p>Đang kiểm tra thực đơn giỏ hàng...</p>
    </div>
  {:else if items.length === 0}
    <div class="empty-state">
      <span class="empty-icon">☕</span>
      <h2>Giỏ hàng của bạn đang trống</h2>
      <p>Hãy chọn những món thức uống và bánh thơm ngon từ CafeZone nhé!</p>
      <a href="/" class="btn primary">Khám phá thực đơn ngay</a>
    </div>
  {:else}
    <div class="cart-layout">
      <!-- Left Column: Cart Items -->
      <div class="cart-items">
        {#each items as item}
          <article class="item-card">
            <img src={item.image} alt={item.name} />
            <div class="item-info">
              <h3>{item.name}</h3>
              <p class="unit-price">{item.price.toLocaleString('vi-VN')}đ / ly</p>
              {#if item.stock <= 5}
                <span class="stock-warning">Chỉ còn {item.stock} trong kho</span>
              {/if}
            </div>

            <div class="quantity-controls">
              <button class="qty-btn" on:click={() => decreaseQuantity(item.id)} title="Giảm">−</button>
              <span class="qty-number">{item.quantity}</span>
              <button
                class="qty-btn"
                on:click={() => increaseQuantity(item.id)}
                disabled={item.quantity >= item.stock}
                title="Tăng"
              >+</button>
            </div>

            <div class="item-total">
              <strong>{(item.quantity * item.price).toLocaleString('vi-VN')}đ</strong>
              <button class="remove-btn" on:click={() => removeItem(item.id)} title="Xóa món">✕</button>
            </div>
          </article>
        {/each}

        <!-- Voucher Code Box -->
        <div class="voucher-box">
          <div class="voucher-header">
            <span class="voucher-icon">🎟️</span>
            <strong>Mã giảm giá (Voucher)</strong>
          </div>
          <p class="voucher-hint">Nhập mã ưu đãi: <code>CAFE20</code> (giảm 20%), <code>CHAOBAN</code> (giảm 30k), hoặc <code>FREESHIP</code>.</p>

          {#if appliedCoupon}
            <div class="applied-chip">
              <span>Đã áp dụng: <strong>{appliedCoupon.code}</strong> (-{couponDiscount.toLocaleString('vi-VN')}đ)</span>
              <button type="button" class="remove-coupon-btn" on:click={removeCoupon}>Gỡ bỏ</button>
            </div>
          {:else}
            <div class="voucher-input-group">
              <input
                type="text"
                placeholder="Nhập mã ưu đãi..."
                bind:value={couponInput}
              />
              <button type="button" class="btn-apply" on:click={handleApplyCoupon}>Áp dụng</button>
            </div>
          {/if}

          {#if couponMessage}
            <p class="coupon-feedback {couponError ? 'err' : 'ok'}">{couponMessage}</p>
          {/if}
        </div>
      </div>

      <!-- Right Column: Checkout Info & Shipping -->
      <div class="checkout-box">
        <h2>Thông tin giao hàng</h2>

        {#if !isLoggedIn}
          <div class="auth-warning">
            ⚠️ Bạn chưa đăng nhập. <a href="/login">Đăng nhập ngay</a> để hoàn tất đặt hàng.
          </div>
        {/if}

        <label>
          Họ và tên người nhận <span class="req">*</span>
          <input bind:value={customerName} placeholder="Nguyễn Văn A" required />
        </label>

        <label>
          Số điện thoại liên hệ <span class="req">*</span>
          <input bind:value={phone} placeholder="0901234567" required />
        </label>

        <label>
          Khu vực nhận hàng (Tính phí ship theo vùng) <span class="req">*</span>
          <select bind:value={selectedDistrict}>
            {#each DISTRICT_OPTIONS as opt}
              <option value={opt.value}>{opt.name}</option>
            {/each}
          </select>
        </label>

        <label>
          Địa chỉ chi tiết (Số nhà, tên đường, phường...) <span class="req">*</span>
          <textarea bind:value={address} rows="2" placeholder="Ví dụ: 123 Phố Cà Phê, Phường Bến Nghé" required />
        </label>

        <label>
          Phương thức thanh toán
          <select bind:value={paymentMethod}>
            <option value="bank-transfer">Chuyển khoản VietQR tự động</option>
            <option value="cod">Thanh toán tiền mặt khi nhận (COD)</option>
          </select>
        </label>

        <!-- Summary breakdown -->
        <div class="summary-breakdown">
          <div class="summary-row">
            <span>Tạm tính ({items.reduce((s, i) => s + i.quantity, 0)} món)</span>
            <strong>{subtotal.toLocaleString('vi-VN')}đ</strong>
          </div>

          <div class="summary-row">
            <span>Phí vận chuyển ({selectedDistrict})</span>
            <strong>{shippingFee === 0 ? 'Miễn phí ship 🎉' : `${shippingFee.toLocaleString('vi-VN')}đ`}</strong>
          </div>

          {#if couponDiscount > 0}
            <div class="summary-row discount">
              <span>Voucher giảm giá ({appliedCoupon?.code})</span>
              <strong>-{couponDiscount.toLocaleString('vi-VN')}đ</strong>
            </div>
          {/if}

          <div class="summary-row total">
            <span>Tổng thanh toán</span>
            <strong class="total-amount">{total.toLocaleString('vi-VN')}đ</strong>
          </div>
        </div>

        {#if message}
          <div class="message {isError ? 'error' : 'success'}">
            {message}
          </div>
        {/if}

        <button class="primary checkout-btn" on:click={handleCheckout} disabled={isLoading || !isLoggedIn}>
          {#if isLoading}
            Đang xử lý đơn hàng...
          {:else if !isLoggedIn}
            Đăng nhập để đặt hàng
          {:else}
            Xác nhận đặt hàng ({total.toLocaleString('vi-VN')}đ)
          {/if}
        </button>
      </div>
    </div>
  {/if}
</section>

<style>
  .page-shell {
    max-width: 1160px;
    margin: 0 auto;
    padding: 28px 20px 60px;
  }

  .cart-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 24px;
  }

  h1 {
    font-size: 26px;
    color: var(--cafe-primary);
    margin: 0;
    font-weight: 800;
  }

  .badge {
    background: #e8ded4;
    color: var(--cafe-primary);
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 13px;
    font-weight: 700;
  }

  .cart-layout {
    display: grid;
    gap: 28px;
    grid-template-columns: 1.4fr 1fr;
    align-items: start;
  }

  .cart-items {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .item-card {
    display: grid;
    grid-template-columns: 80px 1fr auto auto;
    gap: 16px;
    align-items: center;
    background: #ffffff;
    border: 1px solid var(--cafe-border);
    padding: 16px;
    border-radius: 16px;
  }

  .item-card img {
    width: 80px;
    height: 80px;
    object-fit: cover;
    border-radius: 12px;
  }

  .item-info h3 {
    margin: 0 0 4px;
    font-size: 16px;
    color: var(--cafe-primary);
  }

  .unit-price {
    font-size: 13px;
    color: var(--cafe-text-muted);
    margin: 0;
  }

  .stock-warning {
    font-size: 11px;
    color: #c53030;
    font-weight: 700;
  }

  .quantity-controls {
    display: flex;
    align-items: center;
    border: 1px solid var(--cafe-border);
    border-radius: 8px;
    overflow: hidden;
  }

  .qty-btn {
    background: #f7f3ef;
    border: none;
    width: 28px;
    height: 28px;
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
  }

  .qty-number {
    padding: 0 10px;
    font-size: 14px;
    font-weight: 700;
  }

  .item-total {
    text-align: right;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .item-total strong {
    font-size: 15px;
    color: var(--cafe-primary);
  }

  .remove-btn {
    background: #fdf2f2;
    border: 1px solid #fed7d7;
    color: #c53030;
    border-radius: 50%;
    width: 26px;
    height: 26px;
    cursor: pointer;
    font-size: 12px;
  }

  /* Voucher Box */
  .voucher-box {
    background: #ffffff;
    border: 1px solid var(--cafe-border);
    padding: 18px;
    border-radius: 16px;
  }

  .voucher-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
    color: var(--cafe-primary);
  }

  .voucher-hint {
    font-size: 12px;
    color: var(--cafe-text-muted);
    margin: 0 0 12px;
  }

  .voucher-hint code {
    background: #f4ece4;
    padding: 2px 6px;
    border-radius: 4px;
    color: var(--cafe-primary);
    font-weight: 700;
  }

  .voucher-input-group {
    display: flex;
    gap: 8px;
  }

  .voucher-input-group input {
    flex: 1;
    padding: 9px 12px;
    border-radius: 8px;
    border: 1px solid var(--cafe-border);
    font-size: 13px;
  }

  .btn-apply {
    background: var(--cafe-accent);
    color: white;
    border: none;
    padding: 9px 18px;
    border-radius: 8px;
    font-weight: 700;
    cursor: pointer;
  }

  .applied-chip {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    padding: 10px 14px;
    border-radius: 8px;
    color: #166534;
    font-size: 13px;
  }

  .remove-coupon-btn {
    background: transparent;
    border: none;
    color: #c53030;
    font-weight: 700;
    cursor: pointer;
  }

  .coupon-feedback {
    font-size: 12px;
    margin: 8px 0 0;
    font-weight: 600;
  }
  .coupon-feedback.ok { color: #15803d; }
  .coupon-feedback.err { color: #c53030; }

  /* Checkout Box */
  .checkout-box {
    background: #ffffff;
    border: 1px solid var(--cafe-border);
    padding: 24px;
    border-radius: 18px;
  }

  .checkout-box h2 {
    font-size: 1.3rem;
    color: var(--cafe-primary);
    margin: 0 0 16px;
  }

  .auth-warning {
    background: #fffaf0;
    border: 1px solid #feebc8;
    color: #9c4221;
    padding: 12px;
    border-radius: 10px;
    font-size: 13px;
    margin-bottom: 16px;
  }

  .auth-warning a {
    color: var(--cafe-accent);
    font-weight: 700;
  }

  label {
    display: block;
    font-size: 13px;
    font-weight: 600;
    color: var(--cafe-text);
    margin-bottom: 12px;
  }

  .req { color: #c53030; }

  input, textarea, select {
    width: 100%;
    margin-top: 4px;
    padding: 10px 12px;
    border-radius: 8px;
    border: 1px solid var(--cafe-border);
    font-size: 14px;
    font-family: inherit;
  }

  .summary-breakdown {
    border-top: 1px solid var(--cafe-border);
    padding-top: 14px;
    margin: 18px 0;
  }

  .summary-row {
    display: flex;
    justify-content: space-between;
    font-size: 14px;
    margin-bottom: 8px;
    color: var(--cafe-text-muted);
  }

  .summary-row.discount {
    color: #15803d;
    font-weight: 700;
  }

  .summary-row.total {
    border-top: 1px dashed var(--cafe-border);
    padding-top: 12px;
    font-size: 16px;
    color: var(--cafe-primary);
  }

  .total-amount {
    font-size: 20px;
    color: var(--cafe-primary);
    font-weight: 800;
  }

  .checkout-btn {
    width: 100%;
    padding: 14px;
    background: var(--cafe-primary);
    color: white;
    border: none;
    border-radius: 12px;
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
  }

  .checkout-btn:disabled {
    background: #c2b5ad;
    cursor: not-allowed;
  }

  .message {
    padding: 10px;
    border-radius: 8px;
    font-size: 13px;
    margin-bottom: 12px;
  }
  .message.error { background: #fee2e2; color: #991b1b; }
  .message.success { background: #dcfce7; color: #166534; }

  /* Success box & QR */
  .success-box {
    background: #ffffff;
    border: 1px solid var(--cafe-border);
    border-radius: 20px;
    padding: 40px;
    text-align: center;
    max-width: 650px;
    margin: 0 auto;
  }

  .success-icon {
    width: 50px;
    height: 50px;
    background: #dcfce7;
    color: #15803d;
    font-size: 26px;
    font-weight: 800;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 16px;
  }

  .order-id { font-size: 16px; margin: 4px 0 14px; color: var(--cafe-primary); }
  .order-summary-card {
    text-align: left;
    background: #fbf8f5;
    padding: 18px;
    border-radius: 14px;
    border: 1px solid var(--cafe-border);
    margin: 20px 0;
  }

  .bank-box {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    padding: 20px;
    border-radius: 14px;
    margin: 20px 0;
    text-align: left;
  }

  .qr-preview-box {
    text-align: center;
    margin-bottom: 16px;
  }

  .vietqr-image {
    max-width: 250px;
    height: auto;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .actions {
    display: flex;
    gap: 12px;
    justify-content: center;
    margin-top: 20px;
  }

  .btn {
    padding: 12px 20px;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 700;
    text-decoration: none;
  }
  .btn.primary { background: var(--cafe-primary); color: white; }
  .btn.secondary { background: #f3ece6; color: var(--cafe-primary); }

  .empty-state {
    text-align: center;
    padding: 60px 20px;
    background: #ffffff;
    border-radius: 20px;
    border: 1px dashed var(--cafe-border);
  }
  .empty-icon { font-size: 40px; display: block; margin-bottom: 12px; }

  @media (max-width: 850px) {
    .cart-layout { grid-template-columns: 1fr; }
  }
</style>

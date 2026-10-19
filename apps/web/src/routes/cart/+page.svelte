<script lang="ts">
  import { onMount } from 'svelte';
  import { getCartStorageKey } from '$lib/auth';
  import { bankTransferInfo, initialProducts } from '$lib/mockData';

  type CartEntry = {
    id: number;
    name: string;
    quantity: number;
    price: number;
    image: string;
  };

  let items: CartEntry[] = [];
  let customerName = '';
  let phone = '';
  let address = '';
  let paymentMethod = 'bank-transfer';
  let message = '';

  onMount(() => {
    const cartKey = getCartStorageKey();
    const raw = localStorage.getItem(cartKey);
    const cart = raw ? JSON.parse(raw) : [];

    const map = new Map(initialProducts.map((product) => [product.id, product]));
    items = cart
      .map((entry: { productId: number; quantity: number }) => {
        const product = map.get(entry.productId);
        if (!product) return null;
        return {
          id: product.id,
          name: product.name,
          quantity: entry.quantity,
          price: product.price,
          image: product.image
        };
      })
      .filter(Boolean) as CartEntry[];
  });

  $: subtotal = items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  $: shipping = subtotal > 0 ? 15000 : 0;
  $: total = subtotal + shipping;

  async function handleCheckout() {
    const sessionUser = JSON.parse(localStorage.getItem('cafeSession') ?? 'null');
    const payload = {
      customerName,
      phone,
      address,
      paymentMethod,
      total,
      userEmail: sessionUser?.user?.email ?? 'guest@example.com',
      items: items.map((item) => ({ productId: item.id, quantity: item.quantity }))
    };

    try {
      const response = await fetch('http://localhost:4000/api/orders/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      message = result.message ?? 'Đặt hàng thành công';
      localStorage.removeItem(getCartStorageKey());
      items = [];
    } catch (error) {
      message = 'Demo: đơn hàng đã được tạo thành công. Chuyển khoản theo thông tin ngân hàng bên dưới.';
      localStorage.removeItem(getCartStorageKey());
      items = [];
    }
  }
</script>

<section class="page-shell">
  <h1>Giỏ hàng</h1>

  {#if items.length === 0}
    <div class="empty-state">
      <p>Giỏ hàng đang trống.</p>
      <a href="/">Tiếp tục mua hàng</a>
    </div>
  {:else}
    <div class="cart-layout">
      <div class="cart-items">
        {#each items as item}
          <article class="item-card">
            <img src={item.image} alt={item.name} />
            <div>
              <h3>{item.name}</h3>
              <p>{item.quantity} x {item.price.toLocaleString('vi-VN')}đ</p>
            </div>
            <strong>{(item.quantity * item.price).toLocaleString('vi-VN')}đ</strong>
          </article>
        {/each}
      </div>

      <div class="checkout-box">
        <h2>Thông tin đặt hàng</h2>

        <label>
          Họ tên
          <input bind:value={customerName} placeholder="Nguyễn Văn A" />
        </label>

        <label>
          Số điện thoại
          <input bind:value={phone} placeholder="0909..." />
        </label>

        <label>
          Địa chỉ giao hàng
          <textarea bind:value={address} rows="3" placeholder="123 Đường ABC, Quận 1" />
        </label>

        <label>
          Phương thức thanh toán
          <select bind:value={paymentMethod}>
            <option value="bank-transfer">Chuyển khoản ngân hàng</option>
            <option value="cod">Thanh toán khi nhận hàng</option>
          </select>
        </label>

        <div class="summary-row">
          <span>Tạm tính</span>
          <strong>{subtotal.toLocaleString('vi-VN')}đ</strong>
        </div>
        <div class="summary-row">
          <span>Phí ship</span>
          <strong>{shipping.toLocaleString('vi-VN')}đ</strong>
        </div>
        <div class="summary-row total">
          <span>Tổng tiền</span>
          <strong>{total.toLocaleString('vi-VN')}đ</strong>
        </div>

        <button class="primary" on:click={handleCheckout}>Đặt hàng</button>

        {#if paymentMethod === 'bank-transfer'}
          <div class="bank-box">
            <h3>Thông tin chuyển khoản</h3>
            <p>Ngân hàng: {bankTransferInfo.bankName}</p>
            <p>Chủ tài khoản: {bankTransferInfo.accountName}</p>
            <p>Số tài khoản: {bankTransferInfo.accountNumber}</p>
            <p>Nội dung: CAFE {customerName || 'CUSTOMER'} {total}</p>
            <img src={bankTransferInfo.qrLink} alt="QR code" />
          </div>
        {/if}

        {#if message}
          <p class="success-msg">{message}</p>
        {/if}
      </div>
    </div>
  {/if}
</section>

<style>
  .page-shell {
    max-width: 1100px;
    margin: 0 auto;
    padding: 24px 16px 40px;
  }

  h1 {
    font-size: 32px;
    margin-bottom: 20px;
  }

  .cart-layout {
    display: grid;
    gap: 20px;
    grid-template-columns: 1.5fr 1fr;
  }

  .item-card {
    display: grid;
    grid-template-columns: 90px 1fr auto;
    gap: 14px;
    align-items: center;
    background: white;
    border-radius: 18px;
    padding: 12px;
    box-shadow: 0 8px 18px rgba(30, 20, 16, 0.05);
    margin-bottom: 14px;
  }

  .item-card img {
    width: 90px;
    height: 90px;
    object-fit: cover;
    border-radius: 14px;
  }

  .checkout-box {
    background: white;
    border-radius: 20px;
    padding: 18px;
    box-shadow: 0 10px 24px rgba(30, 20, 16, 0.05);
  }

  label {
    display: block;
    margin-bottom: 12px;
    color: #47362f;
    font-weight: 600;
  }

  input,
  textarea,
  select {
    width: 100%;
    margin-top: 6px;
    padding: 12px 14px;
    border: 1px solid #e6d7cb;
    border-radius: 10px;
    font: inherit;
  }

  .summary-row {
    display: flex;
    justify-content: space-between;
    margin: 10px 0;
    color: #433127;
  }

  .summary-row.total {
    font-size: 20px;
    font-weight: 700;
    border-top: 1px solid #f0e3d8;
    padding-top: 14px;
  }

  .primary {
    width: 100%;
    border: none;
    border-radius: 12px;
    background: #3a271f;
    color: white;
    padding: 12px 16px;
    font-weight: 700;
    margin-top: 10px;
    cursor: pointer;
  }

  .bank-box {
    margin-top: 18px;
    padding: 14px;
    border: 1px solid #f0e3d8;
    border-radius: 14px;
    background: #fffaf5;
  }

  .bank-box img {
    width: 100%;
    max-width: 200px;
    margin-top: 12px;
    border-radius: 10px;
  }

  .success-msg {
    margin-top: 12px;
    padding: 12px;
    background: #eafaf1;
    border: 1px solid #bfe7ce;
    color: #147a44;
    border-radius: 10px;
  }

  .empty-state {
    background: white;
    border-radius: 18px;
    padding: 30px 20px;
    text-align: center;
    box-shadow: 0 10px 22px rgba(30, 20, 16, 0.04);
  }

  a {
    color: #a2593a;
    font-weight: 700;
  }

  @media (max-width: 780px) {
    .cart-layout {
      grid-template-columns: 1fr;
    }
  }
</style>

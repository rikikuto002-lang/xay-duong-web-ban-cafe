<script lang="ts">
  import { onMount } from 'svelte';
  import { categories, initialProducts, type Product } from '$lib/mockData';
  import { getSession, isAdmin } from '$lib/auth';

  type OrderSummary = {
    id: string;
    customerName: string;
    total: number;
    status: string;
  };

  let role: 'guest' | 'customer' | 'admin' = 'guest';
  let products: Product[] = initialProducts;
  let editingId: number | null = null;
  let message = '';
  let orders: OrderSummary[] = [];
  let form = {
    name: '',
    category: 'Cà phê rang xay',
    price: '0',
    stock: '0',
    image: '',
    description: ''
  };

  const API_URL = 'http://localhost:4000/api/products';
  const salesTrend = [42, 58, 49, 76, 92, 118, 134];
  const chartColors = ['#d9955d', '#b9734e', '#e5be82', '#9a6d52', '#f1d7ab', '#7a4d36'];

  $: revenue = orders.reduce((sum, order) => sum + Number(order.total ?? 0), 0);
  $: pendingCount = orders.filter((order) => order.status === 'pending').length;
  $: completedCount = orders.filter((order) => order.status === 'completed').length;
  $: categoryBreakdown = categories
    .filter((item) => item !== 'Tất cả')
    .map((category, index) => {
      const total = products.filter((product) => product.category === category).length;
      return {
        label: category,
        count: total,
        color: chartColors[index % chartColors.length],
        value: Math.max(12, total * 18 + index * 6)
      };
    });
  $: statusPipeline = [
    { label: 'Chờ xác nhận', value: pendingCount, tone: 'pending' },
    { label: 'Đã xác nhận', value: orders.filter((order) => order.status === 'confirmed').length, tone: 'confirmed' },
    { label: 'Đang giao', value: orders.filter((order) => order.status === 'shipping').length, tone: 'shipping' },
    { label: 'Hoàn tất', value: completedCount, tone: 'completed' }
  ];
  $: donutGradient = categoryBreakdown.length
    ? `conic-gradient(${categoryBreakdown
        .map((item, index) => {
          const start = categoryBreakdown.slice(0, index).reduce((sum, entry) => sum + entry.value, 0);
          const end = start + item.value;
          return `${item.color} ${start}% ${end}%`;
        })
        .join(', ')})`
    : 'conic-gradient(#d9c4ab 0 100%)';

  onMount(async () => {
    const session = getSession();
    role = session?.user.role ?? 'guest';
    await loadProducts();
    await loadOrders();
  });

  async function loadProducts() {
    try {
      const response = await fetch(API_URL);
      const result = await response.json();
      if (result.products?.length) {
        products = result.products;
        localStorage.setItem('cafeProducts', JSON.stringify(products));
      }
    } catch {
      const stored = localStorage.getItem('cafeProducts');
      if (stored) {
        products = JSON.parse(stored);
      }
    }
  }

  async function loadOrders() {
    try {
      const session = getSession();
      const params = new URLSearchParams({
        role: session?.user.role ?? 'guest',
        userEmail: session?.user.email ?? ''
      });
      const response = await fetch(`http://localhost:4000/api/orders?${params.toString()}`);
      const result = await response.json();
      orders = (result.orders ?? []).map((order: { id: string; customerName: string; total: number; status: string }) => ({
        id: order.id,
        customerName: order.customerName,
        total: order.total,
        status: order.status
      }));
    } catch {
      orders = [];
    }
  }

  function resetForm() {
    editingId = null;
    form = {
      name: '',
      category: 'Cà phê rang xay',
      price: '0',
      stock: '0',
      image: '',
      description: ''
    };
  }

  function fillForm(product: Product) {
    editingId = product.id;
    form = {
      name: product.name,
      category: product.category,
      price: String(product.price),
      stock: String(product.stock),
      image: product.image,
      description: product.description
    };
  }

  async function saveProduct() {
    const payload = {
      name: form.name,
      category: form.category,
      price: Number(form.price),
      stock: Number(form.stock),
      image: form.image || 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=800&q=80',
      description: form.description || 'Mô tả sản phẩm'
    };

    try {
      const url = editingId ? `${API_URL}/${editingId}` : API_URL;
      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? 'Lỗi lưu sản phẩm');

      message = editingId ? 'Cập nhật sản phẩm thành công' : 'Thêm sản phẩm thành công';
      await loadProducts();
      resetForm();
    } catch (error) {
      message = error instanceof Error ? error.message : 'Lỗi lưu sản phẩm';
      const tempProduct: Product = {
        id: editingId ?? Date.now(),
        ...payload,
        price: Number(payload.price),
        stock: Number(payload.stock)
      };
      if (editingId) {
        products = products.map((item) => (item.id === editingId ? tempProduct : item));
      } else {
        products = [tempProduct, ...products];
      }
      localStorage.setItem('cafeProducts', JSON.stringify(products));
      resetForm();
    }
  }

  async function removeProduct(id: number) {
    try {
      const response = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? 'Xoá thất bại');
      message = 'Xoá sản phẩm thành công';
      products = products.filter((product) => product.id !== id);
      localStorage.setItem('cafeProducts', JSON.stringify(products));
    } catch (error) {
      message = error instanceof Error ? error.message : 'Xoá thất bại';
      products = products.filter((product) => product.id !== id);
      localStorage.setItem('cafeProducts', JSON.stringify(products));
    }
  }
</script>

{#if !isAdmin()}
  <section class="page-shell">
    <div class="denied-box">
      <p class="eyebrow">Truy cập bị từ chối</p>
      <h1>Bạn cần quyền Admin để vào trang quản trị</h1>
      <a href="/login">Đăng nhập với tài khoản admin</a>
    </div>
  </section>
{:else}
  <section class="page-shell">
    <div class="header-row">
      <div>
        <p class="eyebrow">Dashboard</p>
        <h1>Admin - Quản lý cửa hàng</h1>
      </div>
      <span class="badge">Vai trò: {role}</span>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <span class="label">Tổng sản phẩm</span>
        <strong>{products.length}</strong>
      </div>
      <div class="stat-card">
        <span class="label">Đơn chờ xác nhận</span>
        <strong>{pendingCount}</strong>
      </div>
      <div class="stat-card">
        <span class="label">Đã hoàn tất</span>
        <strong>{completedCount}</strong>
      </div>
      <div class="stat-card accent">
        <span class="label">Doanh thu</span>
        <strong>{revenue.toLocaleString('vi-VN')}đ</strong>
      </div>
    </div>

    <div class="visual-grid">
      <div class="panel chart-panel">
        <div class="panel-head">
          <h2>Doanh thu 7 ngày</h2>
          <span>+18.4%</span>
        </div>
        <div class="chart-wrap">
          {#each salesTrend as value, index}
            <div class="bar-col">
              <span class="bar" style={`height: ${Math.min(value, 140)}px;`}></span>
              <small>{['M','T','W','T','F','S','S'][index]}</small>
            </div>
          {/each}
        </div>
      </div>

      <div class="panel ring-panel">
        <div class="panel-head">
          <h2>Nhóm sản phẩm</h2>
          <span>{products.length} mục</span>
        </div>
        <div class="ring-layout">
          <div class="donut-ring" style={`background: ${donutGradient};`}>
            <div class="ring-center">
              <strong>{Math.max(1, categoryBreakdown.reduce((sum, item) => sum + item.count, 0))}</strong>
              <span>items</span>
            </div>
          </div>
          <ul class="legend-list">
            {#each categoryBreakdown as item}
              <li>
                <span class="dot" style={`background:${item.color};`}></span>
                <span>{item.label}</span>
                <strong>{item.count}</strong>
              </li>
            {/each}
          </ul>
        </div>
      </div>

      <div class="panel pipeline-panel">
        <div class="panel-head">
          <h2>Luồng đơn hàng</h2>
          <span>{orders.length} đơn</span>
        </div>
        <div class="pipeline-list">
          {#each statusPipeline as item}
            <div class="pipeline-item">
              <div class={`status-dot ${item.tone}`}></div>
              <div class="label-stack">
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>

    <div class="admin-grid">
      <div class="panel form-panel">
        <h2>{editingId ? 'Cập nhật sản phẩm' : 'Thêm sản phẩm mới'}</h2>
        <label>
          Tên sản phẩm
          <input bind:value={form.name} placeholder="Ví dụ: Cold Brew" />
        </label>

        <label>
          Nhóm sản phẩm
          <select bind:value={form.category}>
            {#each categories.filter((item) => item !== 'Tất cả') as category}
              <option value={category}>{category}</option>
            {/each}
          </select>
        </label>

        <div class="two-col">
          <label>
            Giá
            <input type="number" bind:value={form.price} />
          </label>
          <label>
            Tồn kho
            <input type="number" bind:value={form.stock} />
          </label>
        </div>

        <label>
          Link ảnh
          <input bind:value={form.image} placeholder="https://..." />
        </label>

        <label>
          Mô tả
          <textarea bind:value={form.description} rows="4" placeholder="Mô tả chi tiết" />
        </label>

        <div class="action-row">
          <button class="primary" on:click={saveProduct}>{editingId ? 'Cập nhật' : 'Lưu sản phẩm'}</button>
          {#if editingId}
            <button class="ghost" on:click={resetForm}>Huỷ</button>
          {/if}
        </div>

        {#if message}
          <p class="message">{message}</p>
        {/if}
      </div>

      <div class="panel list-panel">
        <h2>Danh sách sản phẩm</h2>
        {#each products as product}
          <article class="product-item">
            <img src={product.image} alt={product.name} />
            <div class="product-info">
              <h3>{product.name}</h3>
              <p>{product.category}</p>
              <strong>{product.price.toLocaleString('vi-VN')}đ</strong>
              <span>Tồn kho: {product.stock}</span>
              <div class="mini-actions">
                <button class="small-btn edit" on:click={() => fillForm(product)}>Sửa</button>
                <button class="small-btn delete" on:click={() => removeProduct(product.id)}>Xoá</button>
              </div>
            </div>
          </article>
        {/each}
      </div>
    </div>

    <div class="panel order-panel">
      <h2>Đơn hàng gần đây</h2>
      {#if orders.length === 0}
        <p class="muted">Chưa có đơn hàng nào.</p>
      {:else}
        <div class="order-table">
          <div class="order-row header-row-table">
            <span>Mã đơn</span>
            <span>Khách</span>
            <span>Trạng thái</span>
            <span>Tổng</span>
          </div>
          {#each orders.slice(0, 5) as order}
            <div class="order-row">
              <span>{order.id}</span>
              <span>{order.customerName}</span>
              <span class={`status-badge ${order.status}`}>{order.status}</span>
              <strong>{Number(order.total).toLocaleString('vi-VN')}đ</strong>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </section>
{/if}

<style>
  :global(body) {
    background: linear-gradient(180deg, #f8f1ea 0%, #f1e7de 100%);
    color: #2a1c17;
  }

  * {
    box-sizing: border-box;
  }

  .page-shell {
    max-width: 1280px;
    margin: 0 auto;
    padding: 28px 18px 50px;
  }

  .header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 28px;
    gap: 12px;
    padding: 20px 24px;
    border-radius: 26px;
    background: rgba(42, 27, 21, 0.95);
    color: white;
    box-shadow: 0 22px 40px rgba(31, 20, 15, 0.12);
  }

  .eyebrow {
    margin: 0;
    text-transform: uppercase;
    color: #f1d2a9;
    font-weight: 700;
    letter-spacing: 0.12em;
    font-size: 0.72rem;
  }

  h1 {
    margin: 8px 0 0;
    font-size: clamp(28px, 4vw, 42px);
    letter-spacing: -0.05em;
  }

  .badge {
    background: rgba(255,255,255,0.08);
    color: #f5d9b2;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 999px;
    padding: 10px 14px;
    font-weight: 700;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 18px;
    margin-bottom: 24px;
  }

  .visual-grid {
    display: grid;
    grid-template-columns: 1.3fr 1fr 0.9fr;
    gap: 18px;
    margin-bottom: 24px;
  }

  .stat-card {
    background: rgba(255,255,255,0.8);
    border: 1px solid rgba(90, 57, 45, 0.06);
    border-radius: 22px;
    padding: 20px 18px;
    box-shadow: 0 16px 28px rgba(34, 22, 17, 0.04);
  }

  .stat-card.accent {
    background: linear-gradient(135deg, #4d2f21, #b67b4d);
    color: white;
    box-shadow: 0 20px 36px rgba(103, 68, 46, 0.18);
  }

  .label {
    display: block;
    color: #735f57;
    font-size: 0.72rem;
    text-transform: uppercase;
    font-weight: 700;
    letter-spacing: 0.08em;
  }

  .stat-card.accent .label {
    color: rgba(255,255,255,0.8);
  }

  .stat-card strong {
    display: block;
    margin-top: 12px;
    font-size: clamp(22px, 4vw, 30px);
    letter-spacing: -0.05em;
  }

  .admin-grid {
    display: grid;
    grid-template-columns: 1.05fr 1.35fr;
    gap: 20px;
  }

  .panel {
    background: rgba(255,255,255,0.8);
    border: 1px solid rgba(90, 57, 45, 0.06);
    border-radius: 26px;
    padding: 22px;
    box-shadow: 0 18px 30px rgba(34, 22, 17, 0.04);
  }

  .panel-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    margin-bottom: 18px;
  }

  .panel-head h2 {
    margin: 0;
    font-size: 1.5rem;
    letter-spacing: -0.05em;
  }

  .panel-head span {
    font-size: 0.72rem;
    font-weight: 700;
    color: #8b695d;
    background: #f7ebdf;
    border-radius: 999px;
    padding: 6px 10px;
  }

  .chart-wrap {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 12px;
    height: 170px;
    padding-top: 10px;
  }

  .bar-col {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    height: 100%;
    justify-content: end;
  }

  .bar {
    display: block;
    width: 100%;
    max-width: 30px;
    min-height: 18px;
    border-radius: 12px 12px 6px 6px;
    background: linear-gradient(180deg, #e8b686, #c57a4a);
    box-shadow: 0 12px 18px rgba(168, 102, 62, 0.18);
  }

  .bar-col small {
    color: #6d564f;
    font-size: 0.72rem;
  }

  .ring-layout {
    display: grid;
    grid-template-columns: 160px 1fr;
    gap: 16px;
    align-items: center;
  }

  .donut-ring {
    width: 140px;
    height: 140px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    margin: 0 auto;
  }

  .ring-center {
    width: 78px;
    height: 78px;
    border-radius: 50%;
    background: white;
    display: grid;
    place-items: center;
    text-align: center;
    box-shadow: inset 0 0 0 1px rgba(90, 57, 45, 0.06);
  }

  .ring-center strong {
    font-size: 1.2rem;
    margin: 0;
  }

  .ring-center span {
    font-size: 0.7rem;
    color: #7b615a;
  }

  .legend-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 10px;
  }

  .legend-list li {
    display: grid;
    grid-template-columns: 10px 1fr auto;
    gap: 8px;
    align-items: center;
    color: #55453f;
    font-size: 0.8rem;
  }

  .dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    display: inline-block;
  }

  .pipeline-list {
    display: grid;
    gap: 14px;
  }

  .pipeline-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    border-radius: 14px;
    background: #faf2ea;
  }

  .status-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
  }

  .status-dot.pending { background: #f3b24a; }
  .status-dot.confirmed { background: #7db0e5; }
  .status-dot.shipping { background: #63b98d; }
  .status-dot.completed { background: #79b264; }

  .label-stack {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    gap: 12px;
  }

  .label-stack span {
    color: #56453e;
    font-weight: 600;
  }

  .label-stack strong {
    margin: 0;
    color: #2c1d18;
    font-size: 1.05rem;
  }

  label {
    display: block;
    margin-bottom: 14px;
    font-weight: 600;
    color: #433127;
  }

  input,
  textarea,
  select {
    width: 100%;
    margin-top: 8px;
    padding: 12px 14px;
    border: 1px solid #ead7c6;
    border-radius: 12px;
    font: inherit;
    background: #fff;
    color: #2e211d;
  }

  input:focus,
  textarea:focus,
  select:focus {
    border-color: #c7845f;
    outline: none;
    box-shadow: 0 0 0 3px rgba(199, 132, 95, 0.12);
  }

  .two-col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .action-row {
    display: flex;
    gap: 12px;
    margin-top: 10px;
  }

  .primary,
  .ghost,
  .small-btn {
    border: none;
    border-radius: 12px;
    padding: 12px 16px;
    font-weight: 700;
    cursor: pointer;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }

  .primary:hover,
  .ghost:hover,
  .small-btn:hover {
    transform: translateY(-1px);
  }

  .primary {
    background: linear-gradient(135deg, #422a1d, #2c1d18);
    color: white;
    flex: 1;
    box-shadow: 0 14px 24px rgba(61, 35, 28, 0.12);
  }

  .ghost {
    background: #f4e6dc;
    color: #4a352f;
    flex: 0.6;
  }

  .product-item {
    display: grid;
    grid-template-columns: 90px 1fr;
    gap: 14px;
    padding: 14px 0;
    border-bottom: 1px solid #f0e6df;
  }

  .product-item:last-child {
    border-bottom: none;
  }

  .product-item img {
    width: 90px;
    height: 90px;
    object-fit: cover;
    border-radius: 16px;
  }

  .product-info h3 {
    margin: 0 0 6px;
    font-size: 1.2rem;
    letter-spacing: -0.04em;
  }

  .product-info p,
  .product-info span {
    margin: 4px 0;
    color: #6b5248;
  }

  strong {
    display: block;
    margin-top: 6px;
    font-size: 1.05rem;
  }

  .mini-actions {
    display: flex;
    gap: 8px;
    margin-top: 10px;
  }

  .small-btn {
    padding: 8px 12px;
    font-size: 0.74rem;
  }

  .small-btn.edit {
    background: #f6e2c9;
    color: #734b2d;
  }

  .small-btn.delete {
    background: #f9d9d2;
    color: #8a4037;
  }

  .order-panel {
    margin-top: 20px;
  }

  .order-table {
    display: grid;
    gap: 10px;
  }

  .order-row {
    display: grid;
    grid-template-columns: 1.2fr 1.2fr 1fr 1fr;
    gap: 8px;
    align-items: center;
    padding: 12px 10px;
    border-radius: 14px;
    background: #faf5f1;
  }

  .header-row-table {
    font-size: 0.72rem;
    text-transform: uppercase;
    color: #7b5e52;
    font-weight: 700;
    letter-spacing: 0.08em;
  }

  .status-badge {
    display: inline-flex;
    justify-content: center;
    padding: 6px 10px;
    border-radius: 999px;
    font-size: 0.72rem;
    text-transform: uppercase;
    font-weight: 700;
  }

  .status-badge.pending { background: #fff0cf; color: #8f5d00; }
  .status-badge.confirmed { background: #dfeeff; color: #1f5ca8; }
  .status-badge.shipping { background: #dff8ea; color: #0e7a4a; }
  .status-badge.completed { background: #e6f6e6; color: #206f3b; }
  .status-badge.cancelled { background: #fde7e7; color: #a03a39; }

  .denied-box {
    max-width: 640px;
    margin: 40px auto 0;
    background: rgba(255,255,255,0.85);
    border: 1px solid rgba(90, 57, 45, 0.06);
    border-radius: 24px;
    padding: 34px 22px;
    text-align: center;
    box-shadow: 0 16px 30px rgba(30, 20, 16, 0.06);
  }

  .denied-box a {
    display: inline-block;
    margin-top: 18px;
    color: #a2593a;
    font-weight: 700;
  }

  .message {
    margin-top: 16px;
    padding: 10px 12px;
    border-radius: 12px;
    background: #edf9f1;
    color: #147a44;
    border: 1px solid #bfe7ce;
  }

  .muted {
    color: #6d5248;
  }

  @media (max-width: 980px) {
    .visual-grid,
    .admin-grid,
    .stats-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 640px) {
    .page-shell {
      padding-left: 12px;
      padding-right: 12px;
    }

    .header-row {
      flex-direction: column;
      align-items: flex-start;
      padding: 18px 18px;
    }

    .ring-layout {
      grid-template-columns: 1fr;
    }

    .order-row {
      grid-template-columns: 1fr 1fr;
    }
  }
</style>

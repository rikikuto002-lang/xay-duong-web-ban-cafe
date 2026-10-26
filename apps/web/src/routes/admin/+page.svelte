<script lang="ts">
  import { onMount } from 'svelte';
  import { initialProducts, type Product } from '$lib/mockData';
  import { getSession, isAdmin } from '$lib/auth';

  export let data: Record<string, unknown> = {};
  export let params: Record<string, string> = {};

  const routeState = { data, params };
  void routeState;

  const API_URL = import.meta.env.PUBLIC_API_URL || 'https://ban-cafe-api.rikikuto002.workers.dev';

  type OrderSummary = {
    id: string;
    customerName: string;
    phone?: string;
    total: number;
    status: string;
    paymentStatus?: string;
    createdAt?: string;
    items?: Array<{ name: string; quantity: number; price: number }>;
  };

  type Category = {
    id: number;
    name: string;
  };

  type UserItem = {
    id: string;
    name: string;
    email: string;
    role: string;
  };

  type DaySales = {
    date: string;
    dayLabel: string;
    revenue: number;
    orderCount: number;
  };

  type ReservationItem = {
    id: string;
    customerName: string;
    phone: string;
    date: string;
    time: string;
    guestCount: number;
    area: string;
    notes?: string;
    status: string;
    createdAt: string;
  };

  let activeTab: 'dashboard' | 'products' | 'categories' | 'orders' | 'users' | 'reservations' = 'dashboard';
  let role: 'guest' | 'customer' | 'admin' = 'guest';
  let products: Product[] = [];
  let categories: Category[] = [];
  let orders: OrderSummary[] = [];
  let users: UserItem[] = [];
  let reservations: ReservationItem[] = [];

  let editingId: number | null = null;
  let message = '';
  let isMessageError = false;
  let isUploading = false;

  // New Category Form
  let newCategoryName = '';
  let editingCategoryId: number | null = null;
  let editingCategoryName = '';

  // Product Form
  let form = {
    name: '',
    category: 'Cà phê rang xay',
    price: '0',
    stock: '0',
    image: '',
    description: ''
  };

  // Order Filters & Pagination
  let orderSearchQuery = '';
  let orderStatusFilter = 'all';
  let orderPaymentFilter = 'all';
  let orderPage = 1;
  const ordersPerPage = 5;

  // Real Stats from Database
  let revenue = 0;
  let paidRevenue = 0;
  let pendingCount = 0;
  let confirmedCount = 0;
  let shippingCount = 0;
  let completedCount = 0;
  let cancelledCount = 0;
  let salesTrend7Days: DaySales[] = [];

  const chartColors = ['#d9955d', '#b9734e', '#e5be82', '#9a6d52', '#f1d7ab', '#7a4d36'];

  $: categoryBreakdown = categories.map((cat, index) => {
    const total = products.filter((p) => p.category === cat.name).length;
    return {
      label: cat.name,
      count: total,
      color: chartColors[index % chartColors.length],
      value: total
    };
  });

  $: maxTrendRevenue = Math.max(1, ...salesTrend7Days.map((d) => d.revenue));

  $: donutGradient = categoryBreakdown.some((c) => c.value > 0)
    ? `conic-gradient(${(() => {
        const total = categoryBreakdown.reduce((s, c) => s + c.value, 0) || 1;
        let currentPct = 0;
        return categoryBreakdown
          .map((item) => {
            const start = currentPct;
            const pct = (item.value / total) * 100;
            currentPct += pct;
            return `${item.color} ${start}% ${currentPct}%`;
          })
          .join(', ');
      })()})`
    : 'conic-gradient(#d9c4ab 0 100%)';

  $: statusPipeline = [
    { label: 'Chờ xác nhận', value: pendingCount, tone: 'pending' },
    { label: 'Đã xác nhận', value: confirmedCount, tone: 'confirmed' },
    { label: 'Đang giao', value: shippingCount, tone: 'shipping' },
    { label: 'Hoàn tất', value: completedCount, tone: 'completed' },
    { label: 'Đã hủy', value: cancelledCount, tone: 'cancelled' }
  ];

  // Filtered Orders
  $: filteredOrders = orders.filter((o) => {
    const matchSearch =
      !orderSearchQuery ||
      o.id.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
      o.customerName.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
      (o.phone && o.phone.includes(orderSearchQuery));

    const matchStatus = orderStatusFilter === 'all' || o.status === orderStatusFilter;
    const matchPayment = orderPaymentFilter === 'all' || (o.paymentStatus ?? 'unpaid') === orderPaymentFilter;

    return matchSearch && matchStatus && matchPayment;
  });

  $: totalOrderPages = Math.max(1, Math.ceil(filteredOrders.length / ordersPerPage));
  $: paginatedOrders = filteredOrders.slice((orderPage - 1) * ordersPerPage, orderPage * ordersPerPage);

  onMount(async () => {
    const session = getSession();
    role = session?.user.role ?? 'guest';
    if (isAdmin()) {
      await loadCategories();
      await loadProducts();
      await loadOrders();
      await loadStats();
      await loadUsers();
      await loadReservations();
    }
  });

  async function loadCategories() {
    try {
      const res = await fetch(`${API_URL}/api/categories`);
      if (res.ok) {
        const data = await res.json();
        categories = data.categories ?? [];
        if (categories.length > 0 && !form.category) {
          form.category = categories[0].name;
        }
      }
    } catch {
      categories = [
        { id: 1, name: 'Cà phê rang xay' },
        { id: 2, name: 'Cà phê máy' },
        { id: 3, name: 'Trà sữa' },
        { id: 4, name: 'Bánh ngọt' },
        { id: 5, name: 'Combo' }
      ];
    }
  }

  async function loadProducts() {
    try {
      const session = getSession();
      const response = await fetch(`${API_URL}/api/products`, {
        headers: session?.token ? { Authorization: `Bearer ${session.token}` } : {}
      });
      if (response.ok) {
        const data = await response.json();
        products = data.products ?? [];
      }
    } catch {
      products = initialProducts;
    }
  }

  async function loadOrders() {
    try {
      const session = getSession();
      const response = await fetch(`${API_URL}/api/orders`, {
        headers: session?.token ? { Authorization: `Bearer ${session.token}` } : {}
      });
      if (response.ok) {
        const data = await response.json();
        orders = data.orders ?? [];
      }
    } catch {
      orders = [];
    }
  }

  async function loadStats() {
    try {
      const session = getSession();
      const response = await fetch(`${API_URL}/api/admin/stats`, {
        headers: session?.token ? { Authorization: `Bearer ${session.token}` } : {}
      });
      if (response.ok) {
        const s = await response.json();
        revenue = s.revenue ?? 0;
        paidRevenue = s.paidRevenue ?? 0;
        pendingCount = s.pendingCount ?? 0;
        confirmedCount = s.confirmedCount ?? 0;
        shippingCount = s.shippingCount ?? 0;
        completedCount = s.completedCount ?? 0;
        cancelledCount = s.cancelledCount ?? 0;
        salesTrend7Days = s.salesTrend7Days ?? [];
      }
    } catch {
      // Fallback calculation from orders array directly
      const valid = orders.filter((o) => o.status !== 'cancelled');
      revenue = valid.reduce((sum, o) => sum + Number(o.total || 0), 0);
      pendingCount = orders.filter((o) => o.status === 'pending').length;
      completedCount = orders.filter((o) => o.status === 'completed').length;
    }
  }

  async function loadUsers() {
    try {
      const session = getSession();
      const response = await fetch(`${API_URL}/api/auth/users`, {
        headers: session?.token ? { Authorization: `Bearer ${session.token}` } : {}
      });
      if (response.ok) {
        const data = await response.json();
        users = data.users ?? [];
      }
    } catch {
      users = [];
    }
  }

  // --- Image Upload Handler ---
  async function handleImageFile(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Vui lòng chọn một tệp hình ảnh hợp lệ.');
      return;
    }

    isUploading = true;
    message = 'Đang tải ảnh lên...';
    isMessageError = false;

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;
        const session = getSession();
        const response = await fetch(`${API_URL}/api/upload`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {})
          },
          body: JSON.stringify({
            imageBase64: base64Data,
            fileName: file.name
          })
        });

        const result = await response.json();
        if (response.ok && result.url) {
          form.image = result.url;
          message = 'Tải ảnh lên thành công!';
          isMessageError = false;
        } else {
          message = result.message ?? 'Lỗi khi tải ảnh lên.';
          isMessageError = true;
        }
        isUploading = false;
      };
      reader.readAsDataURL(file);
    } catch {
      message = 'Không thể kết nối đến API tải ảnh.';
      isMessageError = true;
      isUploading = false;
    }
  }

  // --- Category Handlers ---
  async function createCategory() {
    if (!newCategoryName.trim()) return;
    try {
      const session = getSession();
      const res = await fetch(`${API_URL}/api/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {})
        },
        body: JSON.stringify({ name: newCategoryName.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        newCategoryName = '';
        message = 'Thêm danh mục mới thành công!';
        isMessageError = false;
        await loadCategories();
      } else {
        alert(data.message ?? 'Không thể thêm danh mục');
      }
    } catch {
      alert('Lỗi kết nối khi thêm danh mục.');
    }
  }

  async function updateCategory(id: number) {
    if (!editingCategoryName.trim()) return;
    try {
      const session = getSession();
      const res = await fetch(`${API_URL}/api/categories/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {})
        },
        body: JSON.stringify({ name: editingCategoryName.trim() })
      });
      if (res.ok) {
        editingCategoryId = null;
        editingCategoryName = '';
        message = 'Cập nhật danh mục thành công!';
        isMessageError = false;
        await loadCategories();
      }
    } catch {
      alert('Lỗi kết nối khi cập nhật danh mục.');
    }
  }

  async function deleteCategory(id: number) {
    if (!confirm('Bạn có chắc muốn xóa danh mục này không?')) return;
    try {
      const session = getSession();
      const res = await fetch(`${API_URL}/api/categories/${id}`, {
        method: 'DELETE',
        headers: session?.token ? { Authorization: `Bearer ${session.token}` } : {}
      });
      if (res.ok) {
        message = 'Đã xóa danh mục thành công!';
        isMessageError = false;
        await loadCategories();
      }
    } catch {
      alert('Lỗi kết nối khi xóa danh mục.');
    }
  }

  // --- Product Form Handlers ---
  function resetForm() {
    editingId = null;
    form = {
      name: '',
      category: categories[0]?.name ?? 'Cà phê rang xay',
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
    activeTab = 'products';
  }

  async function saveProduct() {
    const payload = {
      name: form.name.trim(),
      category: form.category,
      price: Number(form.price),
      stock: Number(form.stock),
      image: form.image.trim() || 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=800&q=80',
      description: form.description.trim() || 'Mô tả sản phẩm'
    };

    if (!payload.name) {
      alert('Tên sản phẩm không được để trống.');
      return;
    }

    try {
      const session = getSession();
      const url = editingId ? `${API_URL}/api/products/${editingId}` : `${API_URL}/api/products`;
      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? 'Lỗi lưu sản phẩm');

      message = editingId ? 'Cập nhật sản phẩm thành công!' : 'Thêm sản phẩm thành công!';
      isMessageError = false;
      await loadProducts();
      await loadStats();
      resetForm();
    } catch (error: any) {
      message = error.message ?? 'Lỗi lưu sản phẩm';
      isMessageError = true;
    }
  }

  async function removeProduct(id: number) {
    if (!confirm('Bạn có chắc muốn xóa sản phẩm này?')) return;
    try {
      const session = getSession();
      const response = await fetch(`${API_URL}/api/products/${id}`, {
        method: 'DELETE',
        headers: session?.token ? { Authorization: `Bearer ${session.token}` } : {}
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? 'Xóa thất bại');
      message = 'Xóa sản phẩm thành công!';
      isMessageError = false;
      await loadProducts();
      await loadStats();
    } catch (error: any) {
      message = error.message ?? 'Xóa thất bại';
      isMessageError = true;
    }
  }

  // --- Order Status Change ---
  async function updateOrderStatus(orderId: string, nextStatus: string) {
    try {
      const session = getSession();
      const response = await fetch(`${API_URL}/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {})
        },
        body: JSON.stringify({ status: nextStatus })
      });
      const result = await response.json();
      if (response.ok) {
        message = `Cập nhật đơn #${orderId} sang "${nextStatus}" thành công!`;
        isMessageError = false;
        await loadOrders();
        await loadStats();
      } else {
        alert(result.message ?? 'Không thể cập nhật trạng thái đơn.');
        await loadOrders();
      }
    } catch {
      alert('Lỗi kết nối khi cập nhật đơn hàng.');
    }
  }

  // --- Reservations Management ---
  async function loadReservations() {
    try {
      const res = await fetch(`${API_URL}/api/reservations`);
      if (res.ok) {
        const data = await res.json();
        reservations = data.reservations ?? [];
      }
    } catch {
      reservations = [];
    }
  }

  async function handleUpdateReservationStatus(id: string, status: 'confirmed' | 'cancelled') {
    try {
      const res = await fetch(`${API_URL}/api/reservations/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (res.ok) {
        message = `Cập nhật bàn #${id} sang "${status}" thành công!`;
        isMessageError = false;
        await loadReservations();
      } else {
        alert(data.message || 'Không thể cập nhật bàn.');
      }
    } catch {
      alert('Lỗi kết nối khi cập nhật trạng thái bàn.');
    }
  }
</script>

<svelte:head>
  <title>Admin Dashboard | CafeZone</title>
</svelte:head>

{#if !isAdmin()}
  <section class="page-shell">
    <div class="denied-box">
      <p class="eyebrow">Truy cập bị từ chối</p>
      <h1>Bạn cần quyền Quản trị viên (Admin) để vào trang này</h1>
      <a href="/login" class="btn primary">Đăng nhập với tài khoản Admin</a>
    </div>
  </section>
{:else}
  <section class="page-shell">
    <!-- Header -->
    <div class="header-row">
      <div>
        <p class="eyebrow">Trang quản trị hệ thống</p>
        <h1>Admin Control Panel</h1>
      </div>
      <div class="user-pill">
        <span>Admin: <strong>{getSession()?.user.name}</strong></span>
      </div>
    </div>

    <!-- Navigation Tabs -->
    <nav class="admin-tabs">
      <button class:active={activeTab === 'dashboard'} on:click={() => (activeTab = 'dashboard')}>
        📊 Tổng quan & Thống kê
      </button>
      <button class:active={activeTab === 'products'} on:click={() => (activeTab = 'products')}>
        ☕ Quản lý Sản phẩm ({products.length})
      </button>
      <button class:active={activeTab === 'categories'} on:click={() => (activeTab = 'categories')}>
        🏷️ Danh mục ({categories.length})
      </button>
      <button class:active={activeTab === 'orders'} on:click={() => (activeTab = 'orders')}>
        📦 Đơn hàng ({orders.length})
      </button>
      <button class:active={activeTab === 'users'} on:click={() => (activeTab = 'users')}>
        👥 Người dùng ({users.length})
      </button>
      <button class:active={activeTab === 'reservations'} on:click={() => (activeTab = 'reservations')}>
        📅 Đặt bàn ({reservations.length})
      </button>
    </nav>

    {#if message}
      <div class="alert {isMessageError ? 'error' : 'success'}">
        {message}
      </div>
    {/if}

    <!-- TAB 1: DASHBOARD & REAL STATS -->
    {#if activeTab === 'dashboard'}
      <div class="stats-grid">
        <div class="stat-card">
          <span class="label">Tổng sản phẩm</span>
          <strong>{products.length}</strong>
        </div>
        <div class="stat-card">
          <span class="label">Đơn chờ duyệt</span>
          <strong>{pendingCount}</strong>
        </div>
        <div class="stat-card">
          <span class="label">Đơn hoàn tất</span>
          <strong>{completedCount}</strong>
        </div>
        <div class="stat-card accent">
          <span class="label">Doanh thu thực tế (Trừ đơn hủy)</span>
          <strong>{revenue.toLocaleString('vi-VN')}đ</strong>
          <small>Đã thu tiền: {paidRevenue.toLocaleString('vi-VN')}đ</small>
        </div>
      </div>

      <div class="visual-grid">
        <!-- 7-Day Real Sales Trend -->
        <div class="panel chart-panel">
          <div class="panel-head">
            <h2>Doanh thu 7 ngày gần nhất (Dữ liệu thật từ DB)</h2>
            <span class="real-badge">Dữ liệu thực tế</span>
          </div>
          <div class="chart-wrap">
            {#each salesTrend7Days as item}
              <div class="bar-col">
                <span
                  class="bar"
                  style={`height: ${Math.max(12, Math.round((item.revenue / maxTrendRevenue) * 140))}px;`}
                  title={`${item.date}: ${item.revenue.toLocaleString('vi-VN')}đ (${item.orderCount} đơn)`}
                ></span>
                <span class="bar-value">{item.revenue > 0 ? `${Math.round(item.revenue / 1000)}k` : '0'}</span>
                <small>{item.dayLabel}</small>
              </div>
            {/each}
          </div>
        </div>

        <!-- Real Category Distribution -->
        <div class="panel ring-panel">
          <div class="panel-head">
            <h2>Phân bổ nhóm sản phẩm</h2>
            <span>{products.length} món</span>
          </div>
          <div class="ring-layout">
            <div class="donut-ring" style={`background: ${donutGradient};`}>
              <div class="ring-center">
                <strong>{products.length}</strong>
                <span>sản phẩm</span>
              </div>
            </div>
            <ul class="legend-list">
              {#each categoryBreakdown as item}
                <li>
                  <span class="dot" style={`background:${item.color};`}></span>
                  <span class="cat-label">{item.label}</span>
                  <strong>{item.count} món</strong>
                </li>
              {/each}
            </ul>
          </div>
        </div>

        <!-- Pipeline -->
        <div class="panel pipeline-panel">
          <div class="panel-head">
            <h2>Luồng xử lý đơn hàng</h2>
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
    {/if}

    <!-- TAB 2: PRODUCTS CRUD & IMAGE UPLOAD -->
    {#if activeTab === 'products'}
      <div class="admin-grid">
        <!-- Product Form with Image Upload -->
        <div class="panel form-panel">
          <h2>{editingId ? 'Cập nhật sản phẩm' : 'Thêm sản phẩm mới'}</h2>

          <label>
            Tên sản phẩm <span class="req">*</span>
            <input bind:value={form.name} placeholder="Ví dụ: Cà phê muối" required />
          </label>

          <label>
            Danh mục sản phẩm
            <select bind:value={form.category}>
              {#each categories as cat}
                <option value={cat.name}>{cat.name}</option>
              {/each}
            </select>
          </label>

          <div class="two-col">
            <label>
              Giá bán (VNĐ) <span class="req">*</span>
              <input type="number" bind:value={form.price} min="0" required />
            </label>
            <label>
              Số lượng tồn kho <span class="req">*</span>
              <input type="number" bind:value={form.stock} min="0" required />
            </label>
          </div>

          <!-- Image Upload & Preview -->
          <div class="upload-section">
            <label>
              Tải ảnh lên từ máy tính (Upload ảnh)
              <input type="file" accept="image/*" on:change={handleImageFile} disabled={isUploading} />
            </label>

            <label>
              Hoặc nhập trực tiếp URL ảnh
              <input bind:value={form.image} placeholder="https://... hoặc /uploads/..." />
            </label>

            {#if form.image}
              <div class="preview-box">
                <img src={form.image} alt="Xem trước ảnh" />
                <span>Ảnh đã chọn</span>
              </div>
            {/if}
          </div>

          <label>
            Mô tả sản phẩm
            <textarea bind:value={form.description} rows="3" placeholder="Mô tả hương vị, nguyên liệu..." />
          </label>

          <div class="action-row">
            <button class="btn primary" on:click={saveProduct} disabled={isUploading}>
              {editingId ? 'Lưu cập nhật' : 'Thêm sản phẩm'}
            </button>
            {#if editingId}
              <button class="btn ghost" on:click={resetForm}>Hủy sửa</button>
            {/if}
          </div>
        </div>

        <!-- Product List -->
        <div class="panel list-panel">
          <div class="panel-head">
            <h2>Danh sách sản phẩm hiện có</h2>
            <span>{products.length} món</span>
          </div>

          <div class="product-scroll-list">
            {#each products as product}
              <article class="product-item">
                <img src={product.image} alt={product.name} />
                <div class="product-info">
                  <h3>{product.name}</h3>
                  <p class="cat-tag">{product.category}</p>
                  <strong>{product.price.toLocaleString('vi-VN')}đ</strong>
                  <span class="stock-tag">Tồn kho: {product.stock}</span>
                  <div class="mini-actions">
                    <button class="small-btn edit" on:click={() => fillForm(product)}>Sửa</button>
                    <button class="small-btn delete" on:click={() => removeProduct(product.id)}>Xóa</button>
                  </div>
                </div>
              </article>
            {/each}
          </div>
        </div>
      </div>
    {/if}

    <!-- TAB 3: CATEGORIES CRUD -->
    {#if activeTab === 'categories'}
      <div class="categories-grid">
        <div class="panel form-panel">
          <h2>Thêm danh mục mới</h2>
          <label>
            Tên danh mục
            <input bind:value={newCategoryName} placeholder="Ví dụ: Trà hoa quả tươi" />
          </label>
          <button class="btn primary" on:click={createCategory}>Thêm danh mục</button>
        </div>

        <div class="panel list-panel">
          <h2>Danh sách danh mục cửa hàng</h2>
          <div class="category-table">
            {#each categories as cat}
              <div class="category-row">
                {#if editingCategoryId === cat.id}
                  <input bind:value={editingCategoryName} />
                  <div class="cat-actions">
                    <button class="small-btn save" on:click={() => updateCategory(cat.id)}>Lưu</button>
                    <button class="small-btn ghost" on:click={() => (editingCategoryId = null)}>Hủy</button>
                  </div>
                {:else}
                  <span class="cat-name">{cat.name}</span>
                  <div class="cat-actions">
                    <button
                      class="small-btn edit"
                      on:click={() => {
                        editingCategoryId = cat.id;
                        editingCategoryName = cat.name;
                      }}>Sửa</button
                    >
                    <button class="small-btn delete" on:click={() => deleteCategory(cat.id)}>Xóa</button>
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        </div>
      </div>
    {/if}

    <!-- TAB 4: ORDERS SEARCH, FILTER & PAGINATION -->
    {#if activeTab === 'orders'}
      <div class="panel order-panel">
        <div class="order-controls">
          <input
            type="text"
            bind:value={orderSearchQuery}
            placeholder="🔍 Tìm kiếm mã đơn (#ORD-...), tên khách, SĐT..."
            class="search-input"
          />

          <div class="filters-row">
            <label>
              Trạng thái đơn:
              <select bind:value={orderStatusFilter}>
                <option value="all">Tất cả trạng thái</option>
                <option value="pending">Chờ xác nhận</option>
                <option value="confirmed">Đã xác nhận</option>
                <option value="shipping">Đang giao</option>
                <option value="completed">Đã hoàn tất</option>
                <option value="cancelled">Đã hủy</option>
              </select>
            </label>

            <label>
              Thanh toán:
              <select bind:value={orderPaymentFilter}>
                <option value="all">Tất cả</option>
                <option value="paid">Đã thanh toán (paid)</option>
                <option value="unpaid">Chưa thanh toán (unpaid)</option>
              </select>
            </label>
          </div>
        </div>

        {#if paginatedOrders.length === 0}
          <p class="muted">Không tìm thấy đơn hàng nào phù hợp.</p>
        {:else}
          <div class="order-table">
            <div class="order-row header-row-table">
              <span>Mã đơn</span>
              <span>Khách hàng</span>
              <span>SĐT</span>
              <span>Tổng tiền</span>
              <span>Thanh toán</span>
              <span>Trạng thái</span>
              <span>Thao tác</span>
            </div>
            {#each paginatedOrders as order}
              <div class="order-row">
                <strong>#{order.id}</strong>
                <span>{order.customerName}</span>
                <span>{order.phone || '---'}</span>
                <strong class="order-price">{Number(order.total).toLocaleString('vi-VN')}đ</strong>
                <span class={`pay-badge ${order.paymentStatus ?? 'unpaid'}`}>
                  {order.paymentStatus === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                </span>
                <span class={`status-badge ${order.status}`}>{order.status}</span>
                <div class="table-actions">
                  <select
                    value={order.status}
                    on:change={(e) => updateOrderStatus(order.id, e.currentTarget.value)}
                    disabled={order.status === 'completed' || order.status === 'cancelled'}
                  >
                    <option value="pending">Chờ xác nhận</option>
                    <option value="confirmed">Đã xác nhận</option>
                    <option value="shipping">Đang giao</option>
                    <option value="completed">Đã hoàn tất</option>
                    <option value="cancelled">Đã hủy</option>
                  </select>
                </div>
              </div>
            {/each}
          </div>

          <!-- Pagination Bar -->
          <div class="pagination-bar">
            <span>Hiển thị trang {orderPage} / {totalOrderPages} (Tổng cộng: {filteredOrders.length} đơn)</span>
            <div class="page-btns">
              <button class="btn small" disabled={orderPage <= 1} on:click={() => (orderPage -= 1)}>◀ Trước</button>
              <button class="btn small" disabled={orderPage >= totalOrderPages} on:click={() => (orderPage += 1)}>Sau ▶</button>
            </div>
          </div>
        {/if}
      </div>
    {/if}

    <!-- TAB 5: USERS LIST -->
    {#if activeTab === 'users'}
      <div class="panel users-panel">
        <div class="panel-head">
          <h2>Danh sách tài khoản hệ thống</h2>
          <span>{users.length} tài khoản</span>
        </div>

        {#if users.length === 0}
          <p class="muted">Đang tải hoặc chưa có danh sách người dùng.</p>
        {:else}
          <div class="users-table">
            <div class="user-row user-head">
              <span>ID</span>
              <span>Họ tên</span>
              <span>Email</span>
              <span>Vai trò</span>
            </div>
            {#each users as u}
              <div class="user-row">
                <code>{u.id}</code>
                <strong>{u.name}</strong>
                <span>{u.email}</span>
                <span class={`role-badge ${u.role}`}>{u.role}</span>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}

    <!-- TAB 6: RESERVATIONS LIST -->
    {#if activeTab === 'reservations'}
      <div class="panel reservations-panel">
        <div class="panel-head">
          <h2>Danh sách đặt bàn của khách</h2>
          <span>{reservations.length} lượt đặt</span>
        </div>

        {#if reservations.length === 0}
          <p class="muted">Chưa có lịch đặt bàn nào.</p>
        {:else}
          <div class="reservations-table">
            {#each reservations as r}
              <div class="reservation-card">
                <div class="res-info">
                  <div class="res-main">
                    <code>{r.id}</code>
                    <strong>{r.customerName}</strong>
                    <span>📞 {r.phone}</span>
                  </div>
                  <div class="res-details">
                    <span>📅 Ngày: <strong>{r.date}</strong> lúc <strong>{r.time}</strong></span>
                    <span>👥 Số khách: <strong>{r.guestCount} người</strong></span>
                    <span>📍 Khu vực: <strong>{r.area === 'outdoor' ? 'Ngoài vườn' : r.area === 'vip' ? 'Phòng VIP' : 'Trong nhà'}</strong></span>
                  </div>
                  {#if r.notes}
                    <p class="res-notes">💬 Ghi chú: <em>{r.notes}</em></p>
                  {/if}
                </div>

                <div class="res-actions">
                  <span class={`res-status-badge ${r.status}`}>
                    {r.status === 'confirmed' ? '✓ Đã xác nhận' : r.status === 'cancelled' ? '✕ Đã hủy' : '⏳ Chờ duyệt'}
                  </span>

                  {#if r.status === 'pending'}
                    <div class="res-btn-group">
                      <button class="btn small success" on:click={() => handleUpdateReservationStatus(r.id, 'confirmed')}>
                        Duyệt bàn
                      </button>
                      <button class="btn small danger" on:click={() => handleUpdateReservationStatus(r.id, 'cancelled')}>
                        Từ chối
                      </button>
                    </div>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  </section>
{/if}

<style>
  .page-shell {
    max-width: 1200px;
    margin: 0 auto;
    padding: 24px 16px 48px;
  }

  .header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }

  .eyebrow {
    margin: 0;
    text-transform: uppercase;
    color: #a2593a;
    font-size: 13px;
    font-weight: 700;
  }

  h1 {
    margin: 4px 0 0;
    font-size: 28px;
    color: #2b1e16;
  }

  .user-pill {
    background: #f4ede6;
    color: #5c3826;
    padding: 8px 16px;
    border-radius: 999px;
    font-size: 14px;
  }

  .admin-tabs {
    display: flex;
    gap: 8px;
    margin-bottom: 24px;
    flex-wrap: wrap;
    border-bottom: 2px solid #ebdcd0;
    padding-bottom: 8px;
  }

  .admin-tabs button {
    background: transparent;
    border: none;
    padding: 10px 18px;
    font-size: 14px;
    font-weight: 600;
    color: #6a5347;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .admin-tabs button:hover {
    background: #f7f2ed;
    color: #2b1e16;
  }

  .admin-tabs button.active {
    background: #3a271f;
    color: white;
  }

  .alert {
    padding: 12px 16px;
    border-radius: 10px;
    margin-bottom: 20px;
    font-weight: 600;
  }

  .alert.success {
    background: #eafaf1;
    border: 1px solid #bfe7ce;
    color: #147a44;
  }

  .alert.error {
    background: #fdf2f2;
    border: 1px solid #f8b4b4;
    color: #9b1c1c;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 16px;
    margin-bottom: 24px;
  }

  .stat-card {
    background: white;
    border-radius: 16px;
    padding: 20px;
    box-shadow: 0 4px 16px rgba(30, 20, 16, 0.04);
    border: 1px solid #f2e9e1;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .stat-card.accent {
    background: #3a271f;
    color: white;
  }

  .stat-card.accent .label,
  .stat-card.accent small {
    color: #dfcfc5;
  }

  .stat-card strong {
    font-size: 26px;
    color: #2b1e16;
  }

  .stat-card.accent strong {
    color: white;
  }

  .visual-grid {
    display: grid;
    grid-template-columns: 1.2fr 1fr 1fr;
    gap: 20px;
    margin-bottom: 24px;
  }

  .panel {
    background: white;
    border-radius: 18px;
    padding: 20px;
    box-shadow: 0 4px 18px rgba(30, 20, 16, 0.05);
    border: 1px solid #f2e9e1;
  }

  .panel-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }

  .panel-head h2 {
    font-size: 16px;
    margin: 0;
    color: #2b1e16;
  }

  .real-badge {
    background: #eafaf1;
    color: #147a44;
    font-size: 12px;
    font-weight: 700;
    padding: 4px 10px;
    border-radius: 20px;
  }

  .chart-wrap {
    display: flex;
    align-items: flex-end;
    gap: 12px;
    height: 160px;
    padding-top: 20px;
  }

  .bar-col {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }

  .bar {
    width: 100%;
    max-width: 28px;
    background: #b9734e;
    border-radius: 6px 6px 0 0;
    transition: height 0.3s;
  }

  .bar-value {
    font-size: 10px;
    font-weight: bold;
    color: #8c766b;
  }

  .bar-col small {
    font-size: 11px;
    color: #8c766b;
  }

  .ring-layout {
    display: flex;
    align-items: center;
    gap: 20px;
  }

  .donut-ring {
    width: 110px;
    height: 110px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .ring-center {
    width: 65px;
    height: 65px;
    background: white;
    border-radius: 50%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-size: 12px;
  }

  .legend-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 13px;
  }

  .legend-list li {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
  }

  .pipeline-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .pipeline-item {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .status-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
  }

  .status-dot.pending { background: #e09819; }
  .status-dot.confirmed { background: #1f5ca8; }
  .status-dot.shipping { background: #0e7a4a; }
  .status-dot.completed { background: #206f3b; }
  .status-dot.cancelled { background: #a03a39; }

  .label-stack {
    display: flex;
    justify-content: space-between;
    width: 100%;
    font-size: 13px;
  }

  /* Admin Grid: Products & Categories */
  .admin-grid, .categories-grid {
    display: grid;
    grid-template-columns: 1fr 1.3fr;
    gap: 24px;
    align-items: start;
  }

  .form-panel label {
    display: block;
    margin-bottom: 12px;
    font-size: 13px;
    font-weight: 600;
    color: #47362f;
  }

  .req {
    color: #c93b2b;
  }

  input, select, textarea {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #e0d3c7;
    border-radius: 10px;
    font: inherit;
    font-size: 14px;
    box-sizing: border-box;
    margin-top: 4px;
  }

  .two-col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .upload-section {
    background: #faf7f4;
    padding: 14px;
    border-radius: 12px;
    margin-bottom: 14px;
    border: 1px dashed #d9c4ab;
  }

  .preview-box {
    margin-top: 10px;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .preview-box img {
    width: 60px;
    height: 60px;
    object-fit: cover;
    border-radius: 8px;
    border: 1px solid #d4c1b4;
  }

  .action-row {
    display: flex;
    gap: 10px;
    margin-top: 16px;
  }

  .btn {
    padding: 10px 18px;
    border-radius: 10px;
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
    border: none;
  }

  .btn.primary {
    background: #3a271f;
    color: white;
  }

  .btn.ghost {
    background: #f0e6de;
    color: #4a3325;
  }

  .btn.small {
    padding: 6px 12px;
    font-size: 12px;
  }

  /* Product Scroll List */
  .product-scroll-list {
    max-height: 520px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .product-item {
    display: flex;
    gap: 14px;
    align-items: center;
    padding: 10px;
    background: #faf7f4;
    border-radius: 12px;
    border: 1px solid #ede3da;
  }

  .product-item img {
    width: 65px;
    height: 65px;
    object-fit: cover;
    border-radius: 8px;
  }

  .product-info h3 {
    margin: 0;
    font-size: 15px;
    color: #2b1e16;
  }

  .cat-tag {
    margin: 2px 0;
    font-size: 12px;
    color: #8c766b;
  }

  .stock-tag {
    font-size: 12px;
    color: #7b4f35;
    margin-left: 8px;
  }

  .mini-actions {
    margin-top: 6px;
    display: flex;
    gap: 6px;
  }

  .small-btn {
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    border: none;
  }

  .small-btn.edit { background: #e0f0ff; color: #1266c2; }
  .small-btn.delete { background: #fde8e8; color: #b82a2a; }
  .small-btn.save { background: #147a44; color: white; }

  /* Category Table */
  .category-table {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .category-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px;
    background: #faf7f4;
    border-radius: 10px;
  }

  .cat-actions {
    display: flex;
    gap: 6px;
  }

  /* Orders Controls & Table */
  .order-controls {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 16px;
    flex-wrap: wrap;
  }

  .search-input {
    max-width: 380px;
  }

  .filters-row {
    display: flex;
    gap: 12px;
    align-items: center;
  }

  .filters-row label {
    font-size: 13px;
    font-weight: 600;
    color: #4a362c;
  }

  .order-table {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .order-row {
    display: grid;
    grid-template-columns: 1.2fr 1.2fr 1fr 1.2fr 1fr 1fr 1.2fr;
    gap: 10px;
    align-items: center;
    padding: 12px;
    background: #faf7f4;
    border-radius: 10px;
    font-size: 13px;
  }

  .header-row-table {
    background: #ebdcd0;
    font-weight: 700;
    color: #3a271f;
  }

  .order-price {
    color: #b94a28;
  }

  .pay-badge {
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: bold;
    text-align: center;
  }

  .pay-badge.paid { background: #eafaf1; color: #147a44; }
  .pay-badge.unpaid { background: #fff1d6; color: #8f5d00; }

  .status-badge {
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: bold;
    text-align: center;
    text-transform: capitalize;
  }

  .status-badge.pending { background: #fff5e0; color: #9c6700; }
  .status-badge.confirmed { background: #e0f0ff; color: #1266c2; }
  .status-badge.shipping { background: #e6f9f0; color: #0b804d; }
  .status-badge.completed { background: #ebf7eb; color: #1e7e34; }
  .status-badge.cancelled { background: #fde8e8; color: #b82a2a; }

  .pagination-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 16px;
    font-size: 13px;
    color: #6a5347;
  }

  .page-btns {
    display: flex;
    gap: 8px;
  }

  /* Users Table */
  .users-table {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .user-row {
    display: grid;
    grid-template-columns: 1fr 1.2fr 1.5fr 1fr;
    gap: 12px;
    align-items: center;
    padding: 12px;
    background: #faf7f4;
    border-radius: 10px;
    font-size: 13px;
  }

  .user-head {
    background: #ebdcd0;
    font-weight: 700;
  }

  .role-badge {
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: bold;
    text-transform: uppercase;
  }

  .role-badge.admin { background: #3a271f; color: white; }
  .role-badge.customer { background: #e0f0ff; color: #1266c2; }
  .role-badge.guest { background: #e8ded4; color: #5c3826; }

  /* Reservations panel */
  .reservations-table {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .reservation-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #faf7f4;
    padding: 16px;
    border-radius: 12px;
    border: 1px solid #ebdcd0;
    gap: 16px;
  }

  .res-main {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 6px;
  }

  .res-details {
    display: flex;
    gap: 18px;
    font-size: 13px;
    color: #5c3826;
  }

  .res-notes {
    font-size: 12px;
    color: #8c7365;
    margin: 6px 0 0;
  }

  .res-actions {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 8px;
  }

  .res-status-badge {
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 700;
  }

  .res-status-badge.pending { background: #fff5e0; color: #9c6700; }
  .res-status-badge.confirmed { background: #dcfce7; color: #166534; }
  .res-status-badge.cancelled { background: #fee2e2; color: #991b1b; }

  .res-btn-group {
    display: flex;
    gap: 6px;
  }

  .btn.success { background: #166534; color: white; }
  .btn.danger { background: #991b1b; color: white; }

  .denied-box {
    background: white;
    padding: 48px 24px;
    border-radius: 20px;
    text-align: center;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
  }

  @media (max-width: 900px) {
    .visual-grid {
      grid-template-columns: 1fr;
    }
    .admin-grid, .categories-grid {
      grid-template-columns: 1fr;
    }
    .order-row {
      grid-template-columns: 1fr;
    }
    .header-row-table {
      display: none;
    }
  }
</style>

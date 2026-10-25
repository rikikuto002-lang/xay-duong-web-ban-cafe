<script lang="ts">
  import { onMount } from 'svelte';
  import { getCartStorageKey, notifyCartUpdated } from '$lib/auth';
  import { categories as defaultCategories, type Product } from '$lib/mockData';

  export let data: Record<string, unknown> = {};
  export let params: Record<string, string> = {};

  const routeState = { data, params };
  void routeState;

  const API_URL = import.meta.env.PUBLIC_API_URL ?? 'http://localhost:4000';

  let selectedCategory = 'Tất cả';
  let searchQuery = '';
  let sortBy = 'default';
  let products: Product[] = [];
  let categoryList: string[] = ['Tất cả'];
  let loadingProducts = true;

  // Product detail modal state
  let activeDetailProduct: Product | null = null;
  let detailQuantity = 1;
  let toastMessage = '';
  let toastTimer: ReturnType<typeof setTimeout> | null = null;

  // Reviews state for modal
  type ReviewItem = { id: string; customerName: string; rating: number; comment: string; createdAt: string };
  let productReviews: ReviewItem[] = [];
  let averageRating = 5;
  let reviewAuthor = '';
  let reviewRating = 5;
  let reviewComment = '';
  let reviewSubmitting = false;

  async function loadReviews(productId: number) {
    try {
      const res = await fetch(`${API_URL}/api/reviews/product/${productId}`);
      if (res.ok) {
        const data = await res.json();
        productReviews = data.reviews ?? [];
        averageRating = data.averageRating ?? 5;
      }
    } catch {
      productReviews = [];
    }
  }

  async function submitReview() {
    if (!activeDetailProduct || !reviewAuthor.trim() || !reviewComment.trim()) {
      alert('Vui lòng nhập tên và nhận xét của bạn.');
      return;
    }
    reviewSubmitting = true;
    try {
      const res = await fetch(`${API_URL}/api/reviews/product/${activeDetailProduct.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: reviewAuthor.trim(),
          rating: reviewRating,
          comment: reviewComment.trim()
        })
      });
      if (res.ok) {
        showToast('Cảm ơn bạn đã gửi đánh giá!');
        reviewComment = '';
        await loadReviews(activeDetailProduct.id);
      }
    } catch {
      alert('Lỗi kết nối khi gửi đánh giá.');
    } finally {
      reviewSubmitting = false;
    }
  }

  // Reservation state
  let reserveName = '';
  let reservePhone = '';
  let reserveDate = new Date().toISOString().split('T')[0];
  let reserveTime = '09:00';
  let reserveGuestCount = 2;
  let reserveArea = 'indoor';
  let reserveNotes = '';
  let reserveLoading = false;
  let reserveSuccessMsg = '';
  let reserveErrMsg = '';

  async function handleReservationSubmit() {
    if (!reserveName.trim() || !reservePhone.trim() || !reserveDate || !reserveTime) {
      reserveErrMsg = 'Vui lòng điền đầy đủ họ tên, số điện thoại, ngày và giờ đặt bàn.';
      return;
    }
    reserveLoading = true;
    reserveErrMsg = '';
    reserveSuccessMsg = '';

    try {
      const res = await fetch(`${API_URL}/api/reservations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: reserveName.trim(),
          phone: reservePhone.trim(),
          date: reserveDate,
          time: reserveTime,
          guestCount: reserveGuestCount,
          area: reserveArea,
          notes: reserveNotes.trim()
        })
      });
      const data = await res.json();
      if (res.ok) {
        reserveSuccessMsg = `✓ Đặt bàn thành công! Mã số ${data.reservation.id}. CafeZone sẽ liên hệ sớm để xác nhận.`;
        reserveName = '';
        reservePhone = '';
        reserveNotes = '';
      } else {
        reserveErrMsg = data.message || 'Không thể gửi yêu cầu đặt bàn.';
      }
    } catch {
      reserveErrMsg = 'Lỗi kết nối máy chủ. Vui lòng thử lại sau.';
    } finally {
      reserveLoading = false;
    }
  }

  function showToast(msg: string) {
    toastMessage = msg;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastMessage = '';
    }, 3000);
  }

  async function loadCategories() {
    try {
      const res = await fetch(`${API_URL}/api/categories`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.categories) && data.categories.length > 0) {
          const names = data.categories.map((c: { name: string }) => c.name);
          categoryList = ['Tất cả', ...names];
          return;
        }
      }
    } catch {
      // Fallback
    }
    categoryList = defaultCategories;
  }

  async function loadProducts() {
    loadingProducts = true;
    try {
      const response = await fetch(`${API_URL}/api/products`);
      if (response.ok) {
        const result = await response.json();
        if (result.products?.length) {
          products = result.products;
          localStorage.setItem('cafeProducts', JSON.stringify(products));
          loadingProducts = false;
          return;
        }
      }
    } catch {
      // API offline fallback
    }

    const savedProducts = localStorage.getItem('cafeProducts');
    if (savedProducts) {
      try {
        products = JSON.parse(savedProducts);
      } catch {
        products = [];
      }
    }
    loadingProducts = false;
  }

  onMount(async () => {
    await Promise.all([loadCategories(), loadProducts()]);
  });

  // Filter & Sort Products
  $: filteredProducts = products.filter((product) => {
    const matchesCategory = selectedCategory === 'Tất cả' || product.category === selectedCategory;
    const matchesQuery = searchQuery.trim() === '' ||
      product.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      product.category.toLowerCase().includes(searchQuery.toLowerCase().trim());
    return matchesCategory && matchesQuery;
  });

  $: visibleProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === 'price-asc') return a.price - b.price;
    if (sortBy === 'price-desc') return b.price - a.price;
    if (sortBy === 'name-asc') return a.name.localeCompare(b.name, 'vi');
    if (sortBy === 'stock-desc') return b.stock - a.stock;
    return a.id - b.id; // default
  });

  function addToCart(product: Product, quantityToAdd = 1) {
    if (product.stock <= 0) {
      alert(`Sản phẩm "${product.name}" hiện đang tạm hết hàng.`);
      return;
    }
    const cartKey = getCartStorageKey();
    const cart = JSON.parse(localStorage.getItem(cartKey) ?? '[]');
    const existing = cart.find((item: { productId: number }) => item.productId === product.id);

    const currentQty = existing ? existing.quantity : 0;
    if (currentQty + quantityToAdd > product.stock) {
      alert(`Chỉ còn ${product.stock} món trong kho (bạn đã có ${currentQty} món trong giỏ).`);
      return;
    }

    if (existing) {
      existing.quantity += quantityToAdd;
    } else {
      cart.push({ productId: product.id, quantity: quantityToAdd });
    }

    localStorage.setItem(cartKey, JSON.stringify(cart));
    notifyCartUpdated();
    showToast(`Đã thêm ${quantityToAdd}x "${product.name}" vào giỏ hàng!`);

    if (activeDetailProduct) {
      activeDetailProduct = null;
    }
  }

  function openDetailModal(product: Product) {
    activeDetailProduct = product;
    detailQuantity = 1;
    loadReviews(product.id);
  }

  function closeDetailModal() {
    activeDetailProduct = null;
  }

  function handleImageError(event: Event) {
    const target = event.currentTarget as HTMLImageElement | null;
    if (target) {
      target.src = 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=800&q=80';
    }
  }
</script>

<svelte:head>
  <title>CafeZone - Hương Vị Cà Phê Thủ Công & Không Gian Ấm Áp</title>
  <meta name="description" content="Thưởng thức cà phê pha máy, cà phê rang xay nguyên chất, trà sữa và bánh tươi thủ công tại CafeZone. Đặt hàng trực tuyến, giao tận nơi nhanh chóng." />
  <meta name="keywords" content="cà phê nguyên chất, cafe rang xay, cappuccino, trà sữa matcha, cafezone, bánh ngọt croissant, đặt cafe online" />
  <link rel="canonical" href="https://cafezone.vn/" />

  <!-- Open Graph -->
  <meta property="og:site_name" content="CafeZone" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="CafeZone - Hương Vị Cà Phê Thủ Công & Không Gian Ấm Áp" />
  <meta property="og:description" content="Cà phê rang xay nguyên chất, đồ uống thủ công và bánh tươi mỗi ngày. Giao hàng nhanh toàn thành phố." />
  <meta property="og:image" content="/images/hero-cafe.webp" />
  <meta property="og:locale" content="vi_VN" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="CafeZone - Cà Phê Thủ Công Thượng Hạng" />
  <meta name="twitter:description" content="Khám phá thực đơn cà phê và bánh tươi hảo hạng tại CafeZone." />
  <meta name="twitter:image" content="/images/hero-cafe.webp" />

  <!-- JSON-LD Structured Data for Google Rich Snippets -->
  {@html `<script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "CafeOrCoffeeShop",
    "name": "CafeZone",
    "image": "https://cafezone.vn/images/hero-cafe.webp",
    "description": "Quán cà phê hiện đại phục vụ cà phê rang xay nguyên chất, bánh ngọt tươi mới và thức uống đặc sắc.",
    "telephone": "+84-28-555-7788",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "45 Nguyễn Huệ",
      "addressLocality": "Quận 1",
      "addressRegion": "Hồ Chí Minh",
      "addressCountry": "VN"
    },
    "openingHoursSpecification": [
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        "opens": "07:00",
        "closes": "21:00"
      },
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": ["Saturday", "Sunday"],
        "opens": "08:00",
        "closes": "22:30"
      }
    ],
    "servesCuisine": "Coffee, Bakery, Beverage",
    "priceRange": "35.000đ - 99.000đ"
  }
  </script>`}
</svelte:head>

<!-- Toast Notification -->
{#if toastMessage}
  <div class="toast-popup" role="status" aria-live="polite">
    <span class="toast-icon">✓</span>
    <span>{toastMessage}</span>
  </div>
{/if}

<div class="coffee-shell">
  <!-- Hero Section -->
  <section id="home" class="hero-section">
    <div class="hero-content">
      <span class="hero-badge">🌿 Từ năm 2011 • Cà Phê Nguyên Bản</span>
      <h1>Cà phê thủ công, khoảnh khắc ấm áp.</h1>
      <p>
        Một không gian thư thái nơi hạt cà phê tuyển chọn, bánh tươi mỗi sáng và văn hóa thưởng thức chậm rãi giao hòa trong lòng thành phố.
      </p>
      <div class="hero-actions">
        <a class="primary-btn" href="#menu">Khám phá thực đơn</a>
        <a class="secondary-btn" href="#reservation">Đặt bàn trải nghiệm</a>
      </div>

      <div class="mini-stats">
        <div class="stat-item">
          <strong>12k+</strong>
          <span>Khách hàng hài lòng</span>
        </div>
        <div class="stat-item">
          <strong>4.9 / 5</strong>
          <span>Đánh giá xuất sắc</span>
        </div>
        <div class="stat-item">
          <strong>100%</strong>
          <span>Hạt Arabica & Robusta sạch</span>
        </div>
      </div>
    </div>

    <div class="hero-visual">
      <div class="floating-card card-top">
        <span>Mẻ rang mới</span>
        <strong>Arabica Cầu Đất</strong>
        <small class="badge-tag">Hương thơm nồng nàn</small>
      </div>

      <div class="hero-image-wrap">
        <picture>
          <source srcset="/images/hero-cafe.webp" type="image/webp" />
          <img
            src="/images/hero-cafe.png"
            alt="Ly cà phê CafeZone pha thủ công với latte art tinh tế"
            width="520"
            height="520"
            loading="eager"
            fetchpriority="high"
          />
        </picture>
      </div>

      <div class="floating-card card-bottom">
        <span>Ưu đãi hôm nay</span>
        <strong>Combo Cafe Sáng</strong>
        <small class="badge-tag">Chỉ từ 99.000đ</small>
      </div>
    </div>
  </section>

  <!-- Feature Grid -->
  <section class="feature-grid" aria-label="Đặc điểm nổi bật">
    <article class="feature-item">
      <span class="feature-icon">☕</span>
      <h3>Hạt Cà Phê Tuyển Chọn</h3>
      <p>Thu hoạch từ vùng cao nguyên trứ danh, rang mộc mỗi ngày giữ trọn hương thơm đậm đà và hậu vị ngọt sâu.</p>
    </article>
    <article class="feature-item">
      <span class="feature-icon">🥐</span>
      <h3>Bánh Nướng Tươi Mỗi Sáng</h3>
      <p>Bánh sừng bò, bánh ngọt bơ Pháp được nướng thủ công trong ngày kết hợp hoàn hảo cùng tách cà phê thơm.</p>
    </article>
    <article class="feature-item">
      <span class="feature-icon">🚀</span>
      <h3>Giao Hàng Siêu Tốc</h3>
      <p>Đóng gói giữ nhiệt chuyên dụng, giao tận tay trong 30-45 phút đảm bảo nguyên vị thơm nóng như tại quán.</p>
    </article>
  </section>

  <!-- About / Story Section -->
  <section id="about" class="story-section">
    <div class="story-image">
      <img
        src="/images/anh3.jpg"
        alt="Barista CafeZone tỉ mỉ pha chế từng giọt cà phê thơm"
        width="500"
        height="380"
        loading="lazy"
        decoding="async"
      />
    </div>

    <div class="story-copy">
      <span class="section-tag">Câu chuyện thương hiệu</span>
      <h2>Mỗi tách cà phê là một niềm đam mê trọn vẹn.</h2>
      <p>
        CafeZone khởi nguồn từ niềm say mê bất tận với hương vị hạt cà phê Việt Nam. Chúng tôi tin rằng mỗi tách espresso không chỉ là thức uống giúp tỉnh táo, mà còn là một khoảnh khắc kết nối và thư thái giữa nhịp sống hối hả.
      </p>
      <ul class="story-bullets">
        <li><strong>Nguyên liệu bền vững:</strong> Đồng hành trực tiếp cùng các nông hộ Đà Lạt & Đắk Lắk.</li>
        <li><strong>Nghệ thuật pha chế:</strong> Đội ngũ barista được đào tạo chuẩn quốc tế SCA.</li>
        <li><strong>Không gian kết nối:</strong> Thiết kế ấm cúng, phù hợp cho cả làm việc lẫn trò chuyện cùng bạn bè.</li>
      </ul>
    </div>
  </section>

  <!-- Menu Section with Search, Sort & Filters -->
  <section id="menu" class="menu-section">
    <div class="menu-header">
      <div>
        <span class="section-tag">Thực Đơn Chọn Lọc</span>
        <h2>Thức Uống & Món Bánh Yêu Thích</h2>
        <p class="menu-subtitle">Nguyên liệu cao cấp, công thức độc quyền dành riêng cho bạn.</p>
      </div>

      <!-- Search & Sorting Controls -->
      <div class="filter-controls">
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Tìm theo tên, mô tả..."
            bind:value={searchQuery}
            aria-label="Tìm kiếm sản phẩm"
          />
          {#if searchQuery}
            <button class="clear-search-btn" on:click={() => (searchQuery = '')} aria-label="Xóa tìm kiếm">✕</button>
          {/if}
        </div>

        <div class="sort-box">
          <label for="sort-select">Sắp xếp:</label>
          <select id="sort-select" bind:value={sortBy} aria-label="Sắp xếp sản phẩm">
            <option value="default">Nổi bật nhất</option>
            <option value="price-asc">Giá: Thấp → Cao</option>
            <option value="price-desc">Giá: Cao → Thấp</option>
            <option value="name-asc">Tên: A → Z</option>
            <option value="stock-desc">Còn hàng nhiều nhất</option>
          </select>
        </div>
      </div>

      <!-- Category Filter Pills -->
      <div class="category-list" role="tablist" aria-label="Danh mục sản phẩm">
        {#each categoryList as category}
          <button
            role="tab"
            aria-selected={selectedCategory === category}
            class:active={selectedCategory === category}
            class="category-chip"
            on:click={() => (selectedCategory = category)}
          >
            {category}
          </button>
        {/each}
      </div>

      <!-- Result Counter -->
      <div class="filter-meta">
        <span>Tìm thấy <strong>{visibleProducts.length}</strong> sản phẩm phù hợp</span>
      </div>
    </div>

    <!-- Product Grid -->
    {#if loadingProducts}
      <div class="loading-state">
        <span class="spinner">☕</span>
        <p>Đang chuẩn bị thực đơn tươi mới...</p>
      </div>
    {:else if visibleProducts.length === 0}
      <div class="empty-state">
        <span class="empty-icon">☕</span>
        <h3>Không tìm thấy món phù hợp</h3>
        <p>Vui lòng thử tìm với từ khóa khác hoặc chọn lại danh mục.</p>
        <button class="secondary-btn dark" on:click={() => { searchQuery = ''; selectedCategory = 'Tất cả'; }}>
          Xem tất cả sản phẩm
        </button>
      </div>
    {:else}
      <div class="product-grid">
        {#each visibleProducts as product (product.id)}
          <article class="product-card">
            <button
              type="button"
              class="product-image-btn"
              on:click={() => openDetailModal(product)}
              aria-label="Xem chi tiết sản phẩm {product.name}"
            >
              <img
                src={product.image}
                alt={product.name}
                loading="lazy"
                decoding="async"
                on:error={handleImageError}
              />
              {#if product.stock <= 0}
                <span class="stock-badge out-of-stock">Tạm hết hàng</span>
              {:else if product.stock <= 5}
                <span class="stock-badge low-stock">Chỉ còn {product.stock} phần</span>
              {/if}
            </button>

            <div class="product-body">
              <div class="product-meta">
                <span class="product-cat">{product.category}</span>
                <strong class="product-price">{product.price.toLocaleString('vi-VN')}đ</strong>
              </div>

              <h3 class="product-title">
                <button
                  type="button"
                  class="title-link-btn"
                  on:click={() => openDetailModal(product)}
                >
                  {product.name}
                </button>
              </h3>
              <p class="product-desc">{product.description}</p>

              <div class="product-actions">
                <button
                  type="button"
                  class="detail-btn"
                  on:click={() => openDetailModal(product)}
                  aria-label="Xem chi tiết {product.name}"
                >
                  Chi tiết
                </button>
                <button
                  type="button"
                  class="add-btn"
                  on:click={() => addToCart(product, 1)}
                  disabled={product.stock <= 0}
                  aria-label="Thêm {product.name} vào giỏ"
                >
                  {product.stock <= 0 ? 'Hết hàng' : '+ Thêm giỏ'}
                </button>
              </div>
            </div>
          </article>
        {/each}
      </div>
    {/if}
  </section>

  <!-- Product Detail Modal -->
  {#if activeDetailProduct}
    <div class="modal-backdrop" on:click={closeDetailModal} role="presentation"></div>
    <div class="detail-modal" role="dialog" aria-modal="true" aria-labelledby="modal-product-title">
      <button class="modal-close-btn" on:click={closeDetailModal} aria-label="Đóng">✕</button>

      <div class="detail-modal-body">
        <div class="detail-image-box">
          <img
            src={activeDetailProduct.image}
            alt={activeDetailProduct.name}
            loading="eager"
            on:error={handleImageError}
          />
        </div>

        <div class="detail-info-box">
          <span class="product-cat">{activeDetailProduct.category}</span>
          <h2 id="modal-product-title">{activeDetailProduct.name}</h2>
          <div class="detail-price">{activeDetailProduct.price.toLocaleString('vi-VN')}đ</div>

          <p class="detail-full-desc">{activeDetailProduct.description}</p>

          <div class="stock-status-row">
            {#if activeDetailProduct.stock > 0}
              <span class="stock-indicator in-stock">● Còn hàng ({activeDetailProduct.stock} sản phẩm sẵn sàng)</span>
            {:else}
              <span class="stock-indicator out-stock">● Tạm hết hàng</span>
            {/if}
          </div>

          {#if activeDetailProduct.stock > 0}
            <div class="detail-quantity-wrap">
              <span class="qty-label">Số lượng:</span>
              <div class="qty-control">
                <button
                  type="button"
                  disabled={detailQuantity <= 1}
                  on:click={() => { if (detailQuantity > 1) detailQuantity -= 1; }}
                >
                  -
                </button>
                <span class="qty-value">{detailQuantity}</span>
                <button
                  type="button"
                  disabled={detailQuantity >= activeDetailProduct.stock}
                  on:click={() => { if (activeDetailProduct && detailQuantity < activeDetailProduct.stock) detailQuantity += 1; }}
                >
                  +
                </button>
              </div>
            </div>

            <button
              class="primary-btn full-width"
              on:click={() => { if (activeDetailProduct) addToCart(activeDetailProduct, detailQuantity); }}
            >
              Thêm vào giỏ hàng • {((activeDetailProduct.price) * detailQuantity).toLocaleString('vi-VN')}đ
            </button>
          {:else}
            <button class="primary-btn full-width disabled" disabled>Tạm thời hết hàng</button>
          {/if}
        </div>
      </div>

      <!-- Reviews Section in Modal -->
      <div class="modal-reviews-section">
        <div class="reviews-header">
          <h3>Đánh giá khách hàng ({productReviews.length})</h3>
          <span class="stars-summary">⭐ {averageRating} / 5.0</span>
        </div>

        <!-- Add Review Form -->
        <div class="add-review-box">
          <h4>Gửi nhận xét của bạn</h4>
          <div class="review-inputs-row">
            <input
              type="text"
              placeholder="Tên của bạn..."
              bind:value={reviewAuthor}
            />
            <div class="star-picker">
              <span>Đánh giá:</span>
              <select bind:value={reviewRating}>
                <option value={5}>⭐⭐⭐⭐⭐ (5 sao)</option>
                <option value={4}>⭐⭐⭐⭐ (4 sao)</option>
                <option value={3}>⭐⭐⭐ (3 sao)</option>
                <option value={2}>⭐⭐ (2 sao)</option>
                <option value={1}>⭐ (1 sao)</option>
              </select>
            </div>
          </div>
          <textarea
            placeholder="Chia sẻ cảm nhận về hương vị, dịch vụ..."
            rows="2"
            bind:value={reviewComment}
          ></textarea>
          <button
            type="button"
            class="submit-review-btn"
            disabled={reviewSubmitting}
            on:click={submitReview}
          >
            {reviewSubmitting ? 'Đang gửi...' : 'Gửi đánh giá'}
          </button>
        </div>

        <!-- Reviews List -->
        {#if productReviews.length === 0}
          <p class="no-reviews">Chưa có đánh giá nào cho sản phẩm này. Hãy là người đầu tiên để lại nhận xét nhé!</p>
        {:else}
          <div class="reviews-list">
            {#each productReviews as r}
              <div class="review-item">
                <div class="review-meta">
                  <strong>{r.customerName}</strong>
                  <span class="review-stars">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                </div>
                <p class="review-text">{r.comment}</p>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  {/if}

  <!-- Benefits Section -->
  <section class="benefit-section">
    <div class="section-top-center">
      <span class="section-tag">Cam Kết Chất Lượng</span>
      <h2>Giá Trị Tạo Nên Sự Khác Biệt</h2>
    </div>

    <div class="benefits-grid">
      <article class="benefit-card">
        <span class="benefit-step">01</span>
        <h3>Rang Mộc Nguyên Bản</h3>
        <p>100% không hương liệu, không phẩm màu hóa học hay chất bảo quản, giữ trọn vẹn tinh hoa hạt cà phê tự nhiên.</p>
      </article>
      <article class="benefit-card">
        <span class="benefit-step">02</span>
        <h3>Barista Chuyên Nghiệp</h3>
        <p>Mỗi ly cà phê espresso hay latte art đều được nén ép, chiết xuất theo đúng tỉ lệ vàng của hiệp hội cà phê.</p>
      </article>
      <article class="benefit-card">
        <span class="benefit-step">03</span>
        <h3>Bao Bì Thân Thiện</h3>
        <p>Sử dụng ly giấy phân hủy sinh học và ống hút tinh bột ngô để chung tay bảo vệ môi trường xanh.</p>
      </article>
    </div>
  </section>

  <!-- Reservation Section -->
  <section id="reservation" class="reservation-section">
    <div class="reservation-form-box">
      <span class="section-tag">Đặt Chỗ Trực Tuyến</span>
      <h2>Đặt bàn giữ chỗ trước</h2>
      <p>Chọn khung giờ và không gian mong muốn, CafeZone sẽ chuẩn bị chu đáo để đón tiếp bạn.</p>

      <div class="reservation-form">
        <div class="form-row">
          <label>
            Họ tên của bạn <span class="req">*</span>
            <input type="text" placeholder="Nguyễn Văn A" bind:value={reserveName} required />
          </label>
          <label>
            Số điện thoại <span class="req">*</span>
            <input type="tel" placeholder="0901234567" bind:value={reservePhone} required />
          </label>
        </div>

        <div class="form-row">
          <label>
            Ngày đặt <span class="req">*</span>
            <input type="date" bind:value={reserveDate} required />
          </label>
          <label>
            Giờ đến <span class="req">*</span>
            <select bind:value={reserveTime}>
              <option value="08:00">08:00 Sáng</option>
              <option value="09:00">09:00 Sáng</option>
              <option value="10:00">10:00 Sáng</option>
              <option value="14:00">14:00 Chiều</option>
              <option value="15:30">15:30 Chiều</option>
              <option value="18:00">18:00 Tối</option>
              <option value="19:30">19:30 Tối</option>
              <option value="20:30">20:30 Tối</option>
            </select>
          </label>
        </div>

        <div class="form-row">
          <label>
            Số lượng khách
            <input type="number" min="1" max="30" bind:value={reserveGuestCount} />
          </label>
          <label>
            Khu vực ngồi
            <select bind:value={reserveArea}>
              <option value="indoor">Trong nhà ấm cúng (Máy lạnh)</option>
              <option value="outdoor">Ngoài trời thoáng mát (Sân vườn)</option>
              <option value="vip">Phòng riêng VIP (Họp mặt / Tiệc nhỏ)</option>
            </select>
          </label>
        </div>

        <label>
          Ghi chú đặc biệt
          <input type="text" placeholder="Yêu cầu ghế trẻ em, bàn sinh nhật, v.v..." bind:value={reserveNotes} />
        </label>

        {#if reserveSuccessMsg}
          <div class="res-msg success">{reserveSuccessMsg}</div>
        {/if}
        {#if reserveErrMsg}
          <div class="res-msg error">{reserveErrMsg}</div>
        {/if}

        <button
          type="button"
          class="primary-btn full-width"
          disabled={reserveLoading}
          on:click={handleReservationSubmit}
        >
          {reserveLoading ? 'Đang gửi yêu cầu...' : 'Gửi yêu cầu đặt bàn'}
        </button>
      </div>
    </div>

    <div class="reservation-card">
      <h3>Thông Tin Cửa Hàng & Giờ Phục Vụ</h3>
      <div class="hours-row">
        <span>Thứ 2 - Thứ 6:</span>
        <strong>7:00 - 21:00</strong>
      </div>
      <div class="hours-row">
        <span>Thứ 7 - Chủ nhật:</span>
        <strong>8:00 - 22:30</strong>
      </div>
      <div class="hours-row">
        <span>Địa chỉ:</span>
        <strong>45 Nguyễn Huệ, Quận 1, TP.HCM</strong>
      </div>
      <div class="hours-row">
        <span>Hotline hỗ trợ:</span>
        <strong>+84 28 555 7788</strong>
      </div>
      <div class="service-perks">
        <p>✓ Đỗ xe máy & ô tô miễn phí</p>
        <p>✓ WiFi tốc độ cao 200Mbps</p>
        <p>✓ Ổ cắm sạc máy tính tại mỗi bàn</p>
      </div>
    </div>
  </section>

  <!-- Testimonials Section -->
  <section class="testimonial-section">
    <div class="section-top-center">
      <span class="section-tag">Cảm Nhận Khách Hàng</span>
      <h2>Những Chia Sẻ Từ Người Yêu Cà Phê</h2>
    </div>

    <div class="testimonial-grid">
      <article class="testimonial-card">
        <p class="quote">"Cappuccino ở đây có lớp bọt sữa cực mịn mượt, vị đắng dịu thanh thoát đúng chuẩn gu của mình."</p>
        <div class="author-info">
          <strong>Chị Phương Lan</strong>
          <span>Kiến trúc sư • Khách quen 3 năm</span>
        </div>
      </article>
      <article class="testimonial-card">
        <p class="quote">"Không gian yên tĩnh, WiFi rất nhanh, đồ uống chất lượng và các bạn nhân viên cực kỳ niềm nở."</p>
        <div class="author-info">
          <strong>Anh Tuấn Minh</strong>
          <span>Lập trình viên làm việc từ xa</span>
        </div>
      </article>
      <article class="testimonial-card">
        <p class="quote">"Bánh Croissant giòn xốp kết hợp với Trà sữa Matcha là combo tuyệt vời nhất cho những buổi chiều."</p>
        <div class="author-info">
          <strong>Bạn Thu Hà</strong>
          <span>Sinh viên ĐH Ngoại Thương</span>
        </div>
      </article>
    </div>
  </section>

  <!-- Site Footer -->
  <footer id="contact" class="site-footer">
    <div class="footer-col">
      <div class="footer-brand">
        <span class="footer-icon">☕</span>
        <span class="footer-title">CafeZone</span>
      </div>
      <p>Cà phê đậm đà bản sắc. Thức ăn tươi ngon và không gian ấm áp đồng hành cùng nhịp sống của bạn mỗi ngày.</p>
    </div>

    <div class="footer-col">
      <h4>Hệ Thống Cửa Hàng</h4>
      <p>📍 45 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh</p>
      <p>📞 Hotline: +84 28 555 7788</p>
      <p>✉️ Email: contact@cafezone.vn</p>
    </div>

    <div class="footer-col">
      <h4>Giờ Phục Vụ</h4>
      <p>Thứ Hai - Thứ Sáu: 07:00 – 21:00</p>
      <p>Thứ Bảy - Chủ Nhật: 08:00 – 22:30</p>
      <p>Hỗ trợ giao hàng nội thành trong 30-45 phút</p>
    </div>
  </footer>
</div>

<style>
  .coffee-shell {
    max-width: 1200px;
    margin: 0 auto;
    padding: 24px 20px 60px;
  }

  /* Toast notification */
  .toast-popup {
    position: fixed;
    bottom: 24px;
    right: 24px;
    background: #2a1810;
    color: #ffffff;
    padding: 12px 20px;
    border-radius: 12px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.25);
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 14px;
    font-weight: 600;
    z-index: 2000;
    border-left: 4px solid #c68a4c;
    animation: fadeIn 0.2s ease-out;
  }

  .toast-icon {
    background: #c68a4c;
    color: white;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  /* Hero Section */
  .hero-section {
    display: grid;
    grid-template-columns: 1.1fr 0.9fr;
    gap: 40px;
    padding: 40px 0 60px;
    align-items: center;
  }

  .hero-badge {
    display: inline-block;
    padding: 6px 14px;
    background: rgba(198, 138, 76, 0.15);
    color: #8c5725;
    font-size: 13px;
    font-weight: 700;
    border-radius: 20px;
    margin-bottom: 16px;
    border: 1px solid rgba(198, 138, 76, 0.3);
  }

  .hero-content h1 {
    font-size: 2.8rem;
    line-height: 1.15;
    color: var(--cafe-primary);
    margin: 0 0 18px;
    font-weight: 800;
  }

  .hero-content p {
    font-size: 1.1rem;
    line-height: 1.6;
    color: var(--cafe-text-muted);
    margin: 0 0 28px;
  }

  .hero-actions {
    display: flex;
    gap: 14px;
    margin-bottom: 36px;
    flex-wrap: wrap;
  }

  .primary-btn {
    background: var(--cafe-primary);
    color: #ffffff;
    padding: 13px 26px;
    border-radius: 30px;
    text-decoration: none;
    font-weight: 700;
    font-size: 15px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: none;
    cursor: pointer;
    box-shadow: 0 8px 18px rgba(61, 35, 20, 0.2);
    transition: all 0.2s ease;
  }

  .primary-btn:hover {
    background: var(--cafe-primary-hover);
    transform: translateY(-1px);
  }

  .primary-btn.full-width {
    width: 100%;
    margin-top: 20px;
  }

  .primary-btn.disabled {
    background: #a09088;
    cursor: not-allowed;
    box-shadow: none;
  }

  .secondary-btn {
    background: transparent;
    color: var(--cafe-primary);
    border: 2px solid var(--cafe-border);
    padding: 11px 24px;
    border-radius: 30px;
    text-decoration: none;
    font-weight: 700;
    font-size: 15px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .secondary-btn:hover {
    border-color: var(--cafe-accent);
    color: var(--cafe-accent);
  }

  .secondary-btn.dark {
    background: #ffffff;
    color: var(--cafe-primary);
    margin-top: 14px;
  }

  .mini-stats {
    display: flex;
    gap: 28px;
    padding-top: 24px;
    border-top: 1px solid var(--cafe-border);
  }

  .stat-item {
    display: flex;
    flex-direction: column;
  }

  .stat-item strong {
    font-size: 1.5rem;
    color: var(--cafe-primary);
    font-weight: 800;
  }

  .stat-item span {
    font-size: 13px;
    color: var(--cafe-text-muted);
  }

  /* Hero Visual */
  .hero-visual {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .hero-image-wrap {
    width: 100%;
    max-width: 440px;
    border-radius: 28px;
    overflow: hidden;
    box-shadow: 0 20px 45px rgba(61, 35, 20, 0.2);
    background: #ffffff;
  }

  .hero-image-wrap img {
    width: 100%;
    height: auto;
    display: block;
    object-fit: cover;
  }

  .floating-card {
    position: absolute;
    background: #ffffff;
    padding: 12px 18px;
    border-radius: 16px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.12);
    display: flex;
    flex-direction: column;
    z-index: 2;
    border: 1px solid var(--cafe-border);
  }

  .floating-card span {
    font-size: 11px;
    color: var(--cafe-text-muted);
    text-transform: uppercase;
    font-weight: 700;
  }

  .floating-card strong {
    font-size: 14px;
    color: var(--cafe-primary);
    margin: 2px 0;
  }

  .badge-tag {
    font-size: 11px;
    color: #c68a4c;
    font-weight: 700;
  }

  .card-top {
    top: -10px;
    right: 10px;
  }

  .card-bottom {
    bottom: -15px;
    left: 10px;
  }

  /* Feature Grid */
  .feature-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 24px;
    margin: 40px 0 60px;
  }

  .feature-item {
    background: #ffffff;
    padding: 30px 24px;
    border-radius: 20px;
    border: 1px solid var(--cafe-border);
    transition: transform 0.2s ease;
  }

  .feature-item:hover {
    transform: translateY(-4px);
    border-color: var(--cafe-accent);
  }

  .feature-icon {
    font-size: 32px;
    display: inline-block;
    margin-bottom: 14px;
  }

  .feature-item h3 {
    font-size: 1.2rem;
    color: var(--cafe-primary);
    margin: 0 0 10px;
  }

  .feature-item p {
    font-size: 14px;
    line-height: 1.6;
    color: var(--cafe-text-muted);
    margin: 0;
  }

  /* Story Section */
  .story-section {
    display: grid;
    grid-template-columns: 1fr 1.1fr;
    gap: 40px;
    align-items: center;
    background: #ffffff;
    padding: 40px;
    border-radius: 24px;
    border: 1px solid var(--cafe-border);
    margin-bottom: 70px;
  }

  .story-image img {
    width: 100%;
    height: auto;
    border-radius: 18px;
    display: block;
    object-fit: cover;
  }

  .section-tag {
    display: inline-block;
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--cafe-accent);
    margin-bottom: 8px;
  }

  .story-copy h2 {
    font-size: 2.2rem;
    color: var(--cafe-primary);
    margin: 0 0 16px;
    line-height: 1.25;
  }

  .story-copy p {
    font-size: 15px;
    line-height: 1.7;
    color: var(--cafe-text-muted);
    margin: 0 0 20px;
  }

  .story-bullets {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .story-bullets li {
    font-size: 14px;
    color: var(--cafe-text);
    padding-left: 20px;
    position: relative;
  }

  .story-bullets li::before {
    content: "✓";
    position: absolute;
    left: 0;
    color: var(--cafe-accent);
    font-weight: 800;
  }

  /* Menu Section */
  .menu-section {
    margin-bottom: 70px;
  }

  .menu-header {
    margin-bottom: 30px;
  }

  .menu-header h2 {
    font-size: 2.3rem;
    color: var(--cafe-primary);
    margin: 4px 0 6px;
  }

  .menu-subtitle {
    color: var(--cafe-text-muted);
    font-size: 15px;
    margin: 0 0 24px;
  }

  .filter-controls {
    display: flex;
    gap: 16px;
    margin-bottom: 20px;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
  }

  .search-box {
    position: relative;
    flex: 1;
    min-width: 260px;
    max-width: 450px;
  }

  .search-icon {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 14px;
    color: var(--cafe-text-muted);
  }

  .search-box input {
    width: 100%;
    padding: 12px 38px 12px 38px;
    border-radius: 25px;
    border: 1px solid var(--cafe-border);
    font-size: 14px;
    background: #ffffff;
    color: var(--cafe-text);
    outline: none;
    transition: border-color 0.2s ease;
  }

  .search-box input:focus {
    border-color: var(--cafe-accent);
    box-shadow: 0 0 0 3px rgba(198, 138, 76, 0.15);
  }

  .clear-search-btn {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    background: #eae2d8;
    border: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    font-size: 11px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .sort-box {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    font-weight: 600;
    color: var(--cafe-text-muted);
  }

  .sort-box select {
    padding: 10px 14px;
    border-radius: 12px;
    border: 1px solid var(--cafe-border);
    background: #ffffff;
    font-size: 14px;
    font-weight: 600;
    color: var(--cafe-primary);
    cursor: pointer;
  }

  .category-list {
    display: flex;
    gap: 10px;
    overflow-x: auto;
    padding-bottom: 8px;
    margin-bottom: 14px;
  }

  .category-chip {
    padding: 9px 18px;
    border-radius: 20px;
    border: 1px solid var(--cafe-border);
    background: #ffffff;
    color: var(--cafe-text);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.2s ease;
  }

  .category-chip.active {
    background: var(--cafe-primary);
    color: #ffffff;
    border-color: var(--cafe-primary);
  }

  .category-chip:hover:not(.active) {
    border-color: var(--cafe-accent);
    color: var(--cafe-accent);
  }

  .filter-meta {
    font-size: 13px;
    color: var(--cafe-text-muted);
    margin-top: 4px;
  }

  /* Product Grid */
  .product-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 24px;
  }

  .product-card {
    background: #ffffff;
    border-radius: 18px;
    border: 1px solid var(--cafe-border);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }

  .product-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 25px rgba(61, 35, 20, 0.1);
  }

  .product-image-btn {
    height: 190px;
    width: 100%;
    position: relative;
    overflow: hidden;
    cursor: pointer;
    background: #f7f3ef;
    border: none;
    padding: 0;
    display: block;
  }

  .product-image-btn img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.3s ease;
  }

  .product-card:hover .product-image-btn img {
    transform: scale(1.05);
  }

  .stock-badge {
    position: absolute;
    top: 10px;
    right: 10px;
    font-size: 11px;
    font-weight: 700;
    padding: 4px 8px;
    border-radius: 8px;
  }

  .stock-badge.out-of-stock {
    background: rgba(197, 48, 48, 0.9);
    color: white;
  }

  .stock-badge.low-stock {
    background: rgba(221, 107, 32, 0.9);
    color: white;
  }

  .product-body {
    padding: 16px;
    display: flex;
    flex-direction: column;
    flex: 1;
  }

  .product-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .product-cat {
    font-size: 12px;
    color: var(--cafe-accent);
    font-weight: 700;
    text-transform: uppercase;
  }

  .product-price {
    font-size: 16px;
    color: var(--cafe-primary);
    font-weight: 800;
  }

  .product-title {
    margin: 0 0 6px;
  }

  .title-link-btn {
    font-size: 1.15rem;
    color: var(--cafe-primary);
    background: transparent;
    border: none;
    padding: 0;
    text-align: left;
    cursor: pointer;
    font-weight: 700;
    font-family: inherit;
    line-height: 1.25;
  }

  .title-link-btn:hover {
    color: var(--cafe-accent);
  }

  .product-desc {
    font-size: 13px;
    color: var(--cafe-text-muted);
    line-height: 1.5;
    margin: 0 0 16px;
    flex: 1;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .product-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .detail-btn {
    background: #f7f3ef;
    border: 1px solid var(--cafe-border);
    color: var(--cafe-primary);
    padding: 9px;
    border-radius: 12px;
    font-weight: 700;
    font-size: 13px;
    cursor: pointer;
  }

  .detail-btn:hover {
    background: #ede4db;
  }

  .add-btn {
    background: var(--cafe-primary);
    border: none;
    color: white;
    padding: 9px;
    border-radius: 12px;
    font-weight: 700;
    font-size: 13px;
    cursor: pointer;
    transition: background 0.2s ease;
  }

  .add-btn:hover:not(:disabled) {
    background: var(--cafe-accent);
  }

  .add-btn:disabled {
    background: #c7bbb2;
    cursor: not-allowed;
  }

  /* Empty & Loading states */
  .empty-state, .loading-state {
    text-align: center;
    padding: 60px 20px;
    background: #ffffff;
    border-radius: 20px;
    border: 1px dashed var(--cafe-border);
  }

  .empty-icon, .spinner {
    font-size: 40px;
    display: inline-block;
    margin-bottom: 12px;
  }

  /* Detail Modal */
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(5px);
    z-index: 2100;
  }

  .detail-modal {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 90%;
    max-width: 680px;
    max-height: 90vh;
    overflow-y: auto;
    background: #ffffff;
    border-radius: 24px;
    z-index: 2200;
    box-shadow: 0 25px 60px rgba(0, 0, 0, 0.3);
    padding: 30px;
  }

  .modal-close-btn {
    position: absolute;
    top: 18px;
    right: 18px;
    background: #f0eae4;
    border: none;
    width: 34px;
    height: 34px;
    border-radius: 50%;
    font-size: 16px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .detail-modal-body {
    display: grid;
    grid-template-columns: 1fr 1.2fr;
    gap: 24px;
    align-items: center;
  }

  .detail-image-box img {
    width: 100%;
    height: 280px;
    object-fit: cover;
    border-radius: 16px;
  }

  .detail-info-box h2 {
    font-size: 1.6rem;
    color: var(--cafe-primary);
    margin: 6px 0 10px;
  }

  .detail-price {
    font-size: 22px;
    font-weight: 800;
    color: var(--cafe-accent);
    margin-bottom: 12px;
  }

  .detail-full-desc {
    font-size: 14px;
    color: var(--cafe-text-muted);
    line-height: 1.6;
    margin-bottom: 16px;
  }

  .stock-status-row {
    margin-bottom: 18px;
  }

  .stock-indicator {
    font-size: 13px;
    font-weight: 700;
  }

  .stock-indicator.in-stock { color: var(--cafe-success); }
  .stock-indicator.out-stock { color: var(--cafe-danger); }

  .detail-quantity-wrap {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .qty-label {
    font-size: 14px;
    font-weight: 700;
    color: var(--cafe-text);
  }

  .qty-control {
    display: flex;
    align-items: center;
    border: 1px solid var(--cafe-border);
    border-radius: 10px;
    overflow: hidden;
  }

  .qty-control button {
    background: #f7f3ef;
    border: none;
    width: 32px;
    height: 32px;
    font-size: 16px;
    font-weight: 700;
    cursor: pointer;
  }

  .qty-control button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .qty-value {
    padding: 0 14px;
    font-weight: 700;
  }

  /* Modal Reviews Section */
  .modal-reviews-section {
    border-top: 1px solid var(--cafe-border);
    margin-top: 24px;
    padding-top: 18px;
  }

  .reviews-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 14px;
  }

  .reviews-header h3 {
    font-size: 1.15rem;
    color: var(--cafe-primary);
    margin: 0;
  }

  .stars-summary {
    font-size: 14px;
    font-weight: 700;
    color: var(--cafe-accent);
  }

  .add-review-box {
    background: #fdfbf9;
    border: 1px solid var(--cafe-border);
    border-radius: 12px;
    padding: 14px;
    margin-bottom: 16px;
  }

  .add-review-box h4 {
    margin: 0 0 10px;
    font-size: 13px;
    color: var(--cafe-primary);
  }

  .review-inputs-row {
    display: flex;
    gap: 12px;
    margin-bottom: 10px;
  }

  .review-inputs-row input {
    flex: 1;
    padding: 8px 12px;
    border-radius: 8px;
    border: 1px solid var(--cafe-border);
    font-size: 13px;
  }

  .star-picker {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    font-weight: 600;
  }

  .star-picker select {
    padding: 8px 10px;
    border-radius: 8px;
    border: 1px solid var(--cafe-border);
    font-size: 13px;
  }

  .add-review-box textarea {
    width: 100%;
    padding: 8px 12px;
    border-radius: 8px;
    border: 1px solid var(--cafe-border);
    font-size: 13px;
    font-family: inherit;
    resize: vertical;
    margin-bottom: 8px;
  }

  .submit-review-btn {
    background: var(--cafe-primary);
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
  }

  .no-reviews {
    font-size: 13px;
    color: var(--cafe-text-muted);
    font-style: italic;
    margin: 8px 0;
  }

  .reviews-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
    max-height: 200px;
    overflow-y: auto;
  }

  .review-item {
    background: #f7f3ef;
    padding: 10px 14px;
    border-radius: 10px;
  }

  .review-meta {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    margin-bottom: 4px;
  }

  .review-stars {
    color: #eab308;
    letter-spacing: 2px;
  }

  .review-text {
    font-size: 13px;
    color: var(--cafe-text);
    margin: 0;
    line-height: 1.5;
  }

  /* Benefits Section */
  .section-top-center {
    text-align: center;
    margin-bottom: 36px;
  }

  .section-top-center h2 {
    font-size: 2.2rem;
    color: var(--cafe-primary);
    margin: 6px 0;
  }

  .benefits-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 24px;
    margin-bottom: 70px;
  }

  .benefit-card {
    background: #ffffff;
    padding: 30px;
    border-radius: 20px;
    border: 1px solid var(--cafe-border);
  }

  .benefit-step {
    font-size: 2.2rem;
    font-weight: 900;
    color: rgba(198, 138, 76, 0.4);
    display: block;
    margin-bottom: 10px;
  }

  .benefit-card h3 {
    font-size: 1.25rem;
    color: var(--cafe-primary);
    margin: 0 0 10px;
  }

  .benefit-card p {
    font-size: 14px;
    color: var(--cafe-text-muted);
    line-height: 1.6;
    margin: 0;
  }

  /* Reservation Section */
  .reservation-section {
    display: grid;
    grid-template-columns: 1.2fr 0.8fr;
    gap: 36px;
    background: #2d1b12;
    color: #ffffff;
    padding: 40px;
    border-radius: 24px;
    margin-bottom: 70px;
    align-items: start;
  }

  .reservation-form-box h2 {
    font-size: 2rem;
    margin: 6px 0 10px;
    color: #ffffff;
  }

  .reservation-form-box p {
    font-size: 14px;
    color: #eedcd0;
    margin: 0 0 20px;
  }

  .reservation-form {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }

  .reservation-form label {
    display: flex;
    flex-direction: column;
    font-size: 13px;
    font-weight: 600;
    color: #eedcd0;
    gap: 6px;
  }

  .reservation-form input,
  .reservation-form select {
    padding: 10px 12px;
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    background: rgba(255, 255, 255, 0.08);
    color: #ffffff;
    font-size: 13px;
    font-family: inherit;
    outline: none;
  }

  .reservation-form input:focus,
  .reservation-form select:focus {
    border-color: #c68a4c;
    background: rgba(255, 255, 255, 0.12);
  }

  .reservation-form select option {
    background: #2d1b12;
    color: #ffffff;
  }

  .req {
    color: #feb2b2;
  }

  .res-msg {
    padding: 10px 14px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
  }
  .res-msg.success { background: rgba(34, 197, 94, 0.2); color: #86efac; border: 1px solid rgba(34, 197, 94, 0.4); }
  .res-msg.error { background: rgba(239, 68, 68, 0.2); color: #fca5a5; border: 1px solid rgba(239, 68, 68, 0.4); }

  .service-perks {
    margin-top: 20px;
    padding-top: 16px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    font-size: 13px;
    color: #eedcd0;
  }
  .service-perks p {
    margin: 6px 0;
  }

  .reservation-card {
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 18px;
    padding: 24px;
  }

  .reservation-card h3 {
    margin: 0 0 18px;
    font-size: 1.2rem;
    color: #f7ca9a;
  }

  .hours-row {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    padding: 10px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    font-size: 14px;
  }

  .hours-row:last-child {
    border-bottom: none;
  }

  .hours-row span {
    color: #eedcd0;
  }

  /* Testimonials Section */
  .testimonial-section {
    margin-bottom: 70px;
  }

  .testimonial-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 24px;
  }

  .testimonial-card {
    background: #ffffff;
    padding: 28px;
    border-radius: 20px;
    border: 1px solid var(--cafe-border);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .quote {
    font-size: 15px;
    font-style: italic;
    color: var(--cafe-text);
    line-height: 1.6;
    margin: 0 0 20px;
  }

  .author-info strong {
    display: block;
    color: var(--cafe-primary);
    font-size: 14px;
  }

  .author-info span {
    font-size: 12px;
    color: var(--cafe-text-muted);
  }

  /* Footer */
  .site-footer {
    border-top: 1px solid var(--cafe-border);
    padding-top: 40px;
    display: grid;
    grid-template-columns: 1.2fr 1fr 1fr;
    gap: 36px;
    font-size: 14px;
  }

  .footer-brand {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
  }

  .footer-icon { font-size: 22px; }
  .footer-title { font-size: 18px; font-weight: 800; color: var(--cafe-primary); }

  .footer-col p {
    color: var(--cafe-text-muted);
    line-height: 1.6;
    margin: 6px 0;
  }

  .footer-col h4 {
    margin: 0 0 14px;
    color: var(--cafe-primary);
    font-size: 15px;
    font-weight: 700;
  }

  /* Mobile responsiveness */
  @media (max-width: 900px) {
    .hero-section {
      grid-template-columns: 1fr;
      text-align: center;
    }

    .hero-actions {
      justify-content: center;
    }

    .mini-stats {
      justify-content: center;
    }

    .story-section {
      grid-template-columns: 1fr;
    }

    .reservation-section {
      grid-template-columns: 1fr;
    }

    .feature-grid, .benefits-grid, .testimonial-grid {
      grid-template-columns: 1fr;
    }

    .site-footer {
      grid-template-columns: 1fr;
    }

    .detail-modal-body {
      grid-template-columns: 1fr;
    }
  }
</style>

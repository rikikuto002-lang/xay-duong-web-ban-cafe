<script lang="ts">
  import { onMount } from 'svelte';
  import { getCartStorageKey } from '$lib/auth';
  import { categories, initialProducts, type Product } from '$lib/mockData';

  let role = 'guest';
  let selectedCategory = 'Tất cả';
  let products: Product[] = initialProducts;
  let cartCount = 0;

  function updateCartCount() {
    const cartKey = getCartStorageKey();
    const cart = JSON.parse(localStorage.getItem(cartKey) ?? '[]');
    cartCount = cart.reduce((sum: number, item: { quantity: number }) => sum + item.quantity, 0);
  }

  onMount(() => {
    const savedRole = localStorage.getItem('cafeRole') ?? 'guest';
    role = savedRole;

    const savedProducts = localStorage.getItem('cafeProducts');
    if (savedProducts) {
      products = JSON.parse(savedProducts);
    }

    updateCartCount();
  });

  $: visibleProducts = selectedCategory === 'Tất cả'
    ? products
    : products.filter((product) => product.category === selectedCategory);

  function addToCart(product: Product) {
    const cartKey = getCartStorageKey();
    const cart = JSON.parse(localStorage.getItem(cartKey) ?? '[]');
    const existing = cart.find((item: { productId: number }) => item.productId === product.id);

    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push({ productId: product.id, quantity: 1 });
    }

    localStorage.setItem(cartKey, JSON.stringify(cart));
    cartCount = cart.reduce((sum: number, item: { quantity: number }) => sum + item.quantity, 0);
  }
</script>

<svelte:head>
  <title>CafeZone | Coffee Shop</title>
</svelte:head>

<div class="coffee-shell">
  <header class="site-header">
    <div class="brand-wrap">
      <span class="brand-mark">C</span>
      <div>
        <div class="brand-name">CafeZone</div>
        <div class="brand-sub">Coffee & Restaurant</div>
      </div>
    </div>

    <nav class="main-nav">
      <a href="#home">Trang chủ</a>
      <a href="#about">Giới thiệu</a>
      <a href="#menu">Thực đơn</a>
      <a href="#reservation">Đặt bàn</a>
      <a href="#contact">Liên hệ</a>
    </nav>

    <div class="header-actions">
      <a href="/login" class="login-link">Đăng nhập</a>
      <a href="/cart" class="cart-btn">Giỏ hàng ({cartCount})</a>
    </div>
  </header>

  <section id="home" class="hero-section">
    <div class="hero-content">
      <span class="hero-badge">Từ năm 2011</span>
      <h1>Cà phê thủ công, khoảnh khắc ấm áp.</h1>
      <p>
        Một quán cà phê hiện đại nơi các thức uống thủ công, bánh tươi và văn hóa brunch chậm rãi gặp nhau trong không gian yên bình của khu phố.
      </p>
      <div class="hero-actions">
        <a class="primary-btn" href="#menu">Đặt hàng ngay</a>
        <a class="secondary-btn" href="/login">Đặt bàn</a>
      </div>

      <div class="mini-stats">
        <div>
          <strong>12k+</strong>
          <span>Khách hàng hài lòng</span>
        </div>
        <div>
          <strong>4.9/5</strong>
          <span>Đánh giá khách hàng</span>
        </div>
      </div>
    </div>

    <div class="hero-visual">
      <div class="floating-card card-top">
        <span>Roast mới</span>
        <strong>Arabica đặc biệt</strong>
        <small>Bán chạy</small>
      </div>

      <div class="hero-image-wrap">
        <img src="/images/hero-cafe.png" alt="Coffee" />
      </div>

      <div class="floating-card card-bottom">
        <span>Hôm nay</span>
        <strong>GIẢM 20%</strong>
        <small>Combo buổi sáng</small>
      </div>
    </div>
  </section>

  <section class="feature-grid">
    <article class="feature-item">
      <span>☕</span>
      <h3>Hạt cà phê cao cấp</h3>
      <p>Hạt cà phê nguyên chất rang hàng ngày cho hương thơm đậm và kết thúc mượt mà.</p>
    </article>
    <article class="feature-item">
      <span>🍰</span>
      <h3>Bánh tươi mới</h3>
      <p>Mỗi loại bánh được nướng mới mỗi ngày để kết hợp hoàn hảo với ly cà phê của bạn.</p>
    </article>
    <article class="feature-item">
      <span>🚚</span>
      <h3>Giao hàng nhanh</h3>
      <p>Thưởng thức giao hàng tận nhà trên toàn thành phố với dịch vụ nhanh chóng và đáng tin cậy.</p>
    </article>
  </section>

  <section id="about" class="story-section">
    <div class="story-image">
      <img src="/images/anh3.jpg" alt="Barista" />
    </div>

    <div class="story-copy">
      <span class="section-tag">Về chúng tôi</span>
      <h2>Mỗi ngụm cà phê đều mang cảm giác riêng.</h2>
      <p>
        CafeZone kết hợp văn hóa cà phê tinh tế với sự hiếu khách ấm áp của một quán cà phê khu phố. Chúng tôi phục vụ espresso chất lượng, đồ uống thủ công và món ăn ấm áp lấy cảm hứng từ những buổi sáng chậm rãi và cuộc trò chuyện cùng nhau.
      </p>
      <ul>
        <li>Cà phê và thức uống signature được pha thủ công</li>
        <li>Thực đơn brunch tươi mới và món tráng miệng theo mùa</li>
        <li>Không gian thư giãn cho những thói quen hàng ngày</li>
      </ul>
    </div>
  </section>

  <section id="menu" class="menu-section">
    <div class="section-top">
      <div>
        <span class="section-tag">Thực đơn</span>
        <h2>Món được yêu thích</h2>
      </div>
      <div class="category-list">
        {#each categories as category}
          <button
            class:active={selectedCategory === category}
            class="chip"
            on:click={() => (selectedCategory = category)}
          >
            {category}
          </button>
        {/each}
      </div>
    </div>

    <div class="product-grid">
      {#each visibleProducts as product}
        <article class="product-card">
          <img src={product.image} alt={product.name} />
          <div class="product-body">
            <div class="product-meta">
              <span>{product.category}</span>
              <strong>{product.price.toLocaleString('vi-VN')}đ</strong>
            </div>
            <h3>{product.name}</h3>
            <p>{product.description}</p>
            <button on:click={() => addToCart(product)}>Thêm vào giỏ</button>
          </div>
        </article>
      {/each}
    </div>
  </section>

  <section class="benefit-section">
    <div class="section-top compact">
      <div>
        <span class="section-tag">Vì sao chọn chúng tôi</span>
        <h2>Thiết kế cho những thói quen hàng ngày</h2>
      </div>
    </div>

    <div class="benefits-grid">
      <article>
        <strong>01</strong>
        <h3>Thực đơn theo mùa</h3>
        <p>Hương vị tươi mới và món đặc biệt thay đổi theo từng mùa trong năm.</p>
      </article>
      <article>
        <strong>02</strong>
        <h3>Được pha bởi barista</h3>
        <p>Mỗi ly đồ uống được làm bằng sự tỉ mỉ, kỹ thuật và nguyên liệu chất lượng.</p>
      </article>
      <article>
        <strong>03</strong>
        <h3>Không gian cộng đồng</h3>
        <p>Không gian ấm cúng cho công việc, gặp gỡ và những phút nghỉ cafe yên bình.</p>
      </article>
    </div>
  </section>

  <section id="reservation" class="reservation-section">
    <div class="reservation-copy">
      <span class="section-tag">Đặt bàn</span>
      <h2>Đặt chỗ cho buổi hẹn cà phê tiếp theo.</h2>
      <p>Dù là cuộc gặp gỡ sớm hay một buổi tráng miệng muộn, chúng tôi luôn sẵn sàng tạo ra những khoảnh khắc đẹp.</p>
      <a href="/login" class="primary-btn dark">Đặt ngay</a>
    </div>

    <div class="reservation-card">
      <h3>Giờ mở cửa</h3>
      <div class="hours-row"><span>Thứ 2 - Thứ 6</span><strong>7:00 - 21:00</strong></div>
      <div class="hours-row"><span>Thứ 7 - Chủ nhật</span><strong>8:00 - 22:30</strong></div>
      <div class="hours-row"><span>Địa chỉ</span><strong>45 Nguyễn Huệ, Q1</strong></div>
      <div class="hours-row"><span>Điện thoại</span><strong>+84 28 555 7788</strong></div>
    </div>
  </section>

  <section class="testimonial-section">
    <span class="section-tag">Khách hàng nói gì</span>
    <h2>Những phản hồi từ khách ghé</h2>
    <div class="testimonial-grid">
      <article>
        <p>“Cappuccino rất cân bằng hương vị và đội ngũ phục vụ khiến trải nghiệm trở nên rất đáng nhớ.”</p>
        <div class="author"><strong>Lan</strong><span>Khách quen</span></div>
      </article>
      <article>
        <p>“Không gian đẹp, bữa brunch tuyệt và dịch vụ rất mượt. Cứ như một nơi sang trọng nhưng rất chào đón.”</p>
        <div class="author"><strong>Minh</strong><span>Người viết blog ẩm thực</span></div>
      </article>
      <article>
        <p>“Matcha ngon nhất thành phố và món tráng miệng thật sự đáng quay lại lần hai.”</p>
        <div class="author"><strong>Hà</strong><span>Khách địa phương</span></div>
      </article>
    </div>
  </section>

  <footer id="contact" class="site-footer">
    <div>
      <div class="brand-name">CafeZone</div>
      <p>Cà phê ấm áp. Thực phẩm chu đáo. Những khoảnh khắc đáng lưu lại.</p>
    </div>
    <div>
      <h4>Ghé thăm</h4>
      <p>45 Nguyễn Huệ, Q1</p>
      <p>+84 28 555 7788</p>
    </div>
    <div>
      <h4>Giờ mở cửa</h4>
      <p>Thứ 2 - Thứ 6: 7:00 - 21:00</p>
      <p>Thứ 7 - Chủ nhật: 8:00 - 22:30</p>
    </div>
  </footer>
</div>

<style>
  :global(body) {
    background: linear-gradient(180deg, #f4faf5 0%, #edf6ee 100%);
    color: #18342a;
  }

  * {
    box-sizing: border-box;
  }

  a {
    text-decoration: none;
  }

  .coffee-shell {
    max-width: 1280px;
    margin: 0 auto;
    padding: 22px 18px 52px;
  }

  .site-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 18px 22px;
    border-radius: 26px;
    background: rgba(21, 56, 42, 0.9);
    color: white;
    position: sticky;
    top: 0;
    z-index: 20;
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255,255,255,0.08);
    box-shadow: 0 18px 35px rgba(24, 52, 42, 0.15);
  }

  .brand-wrap {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .brand-mark {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 42px;
    height: 42px;
    background: linear-gradient(135deg, #d7f0d9, #77b689);
    color: #133426;
    border-radius: 14px;
    font-weight: 800;
  }

  .brand-name {
    font-size: 1.22rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .brand-sub {
    font-size: 0.7rem;
    opacity: 0.76;
  }

  .main-nav {
    display: flex;
    align-items: center;
    gap: 22px;
    font-size: 0.92rem;
  }

  .main-nav a,
  .login-link {
    color: rgba(255,255,255,0.82);
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .cart-btn,
  .primary-btn,
  .secondary-btn,
  .product-body button,
  .chip {
    border: none;
    border-radius: 999px;
    font-weight: 700;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  }

  .cart-btn,
  .primary-btn,
  .product-body button {
    background: linear-gradient(135deg, #dff7e0, #9ec29d);
    color: #1a382d;
    padding: 12px 18px;
    box-shadow: 0 12px 22px rgba(54, 94, 73, 0.15);
  }

  .login-link {
    padding: 10px 12px;
  }

  .primary-btn,
  .secondary-btn {
    padding: 14px 22px;
  }

  .secondary-btn {
    background: transparent;
    border: 1px solid rgba(255,255,255,0.45);
    color: white;
  }

  .primary-btn.dark {
    background: #1f432f;
    color: white;
  }

  .hero-section {
    display: grid;
    grid-template-columns: 1.1fr 0.9fr;
    gap: 30px;
    padding: 52px 12px 28px;
    align-items: center;
  }

  .hero-badge,
  .section-tag {
    display: inline-flex;
    align-items: center;
    padding: 8px 12px;
    border-radius: 999px;
    background: #e5f5e8;
    color: #23523d;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .hero-content h1 {
    margin: 18px 0 16px;
    font-size: clamp(2.8rem, 5vw, 5rem);
    line-height: 1.02;
    letter-spacing: -0.06em;
    color: #193c2f;
  }

  .hero-content p {
    max-width: 560px;
    color: #4c695d;
    font-size: 1.05rem;
    line-height: 1.7;
  }

  .hero-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 14px;
    margin-top: 24px;
  }

  .mini-stats {
    margin-top: 28px;
    display: flex;
    gap: 30px;
    flex-wrap: wrap;
  }

  .mini-stats div {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .mini-stats strong {
    font-size: 2rem;
    letter-spacing: -0.04em;
    color: #1d3d2f;
  }

  .mini-stats span {
    color: #587267;
  }

  .hero-visual {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 540px;
  }

  .hero-image-wrap {
    width: min(100%, 540px);
    height: 520px;
    border-radius: 36px;
    overflow: hidden;
    box-shadow: 0 28px 60px rgba(18, 44, 31, 0.18);
    border: 10px solid rgba(255,255,255,0.7);
    background: #dfeee3;
  }

  .hero-image-wrap img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .floating-card {
    position: absolute;
    display: flex;
    flex-direction: column;
    padding: 18px 20px;
    background: rgba(255,255,255,0.78);
    border: 1px solid rgba(85, 125, 96, 0.1);
    border-radius: 24px;
    box-shadow: 0 18px 30px rgba(35, 58, 40, 0.12);
    backdrop-filter: blur(8px);
  }

  .floating-card span,
  .floating-card small {
    color: #456857;
  }

  .floating-card strong {
    font-size: 1.6rem;
    margin: 6px 0;
    color: #133426;
  }

  .card-top {
    right: 6px;
    top: 48px;
  }

  .card-bottom {
    left: 4px;
    bottom: 40px;
  }

  .feature-grid,
  .benefits-grid,
  .testimonial-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 18px;
    margin-top: 24px;
  }

  .feature-item,
  .benefits-grid article,
  .testimonial-grid article {
    background: rgba(255,255,255,0.7);
    border: 1px solid rgba(89, 126, 101, 0.08);
    border-radius: 26px;
    padding: 24px;
    box-shadow: 0 15px 30px rgba(19, 52, 38, 0.04);
  }

  .feature-item span {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 52px;
    height: 52px;
    background: #ecf7ee;
    border-radius: 16px;
    font-size: 24px;
  }

  .feature-item h3,
  .benefits-grid h3,
  .testimonial-grid strong {
    margin: 18px 0 8px;
    font-size: 1.45rem;
    color: #173b2d;
  }

  .feature-item p,
  .benefits-grid p,
  .testimonial-grid p {
    margin: 0;
    color: #557065;
    line-height: 1.65;
  }

  .story-section {
    display: grid;
    grid-template-columns: 0.95fr 1.05fr;
    gap: 24px;
    margin-top: 54px;
    align-items: center;
  }

  .story-image img {
    width: 100%;
    height: 100%;
    min-height: 420px;
    object-fit: cover;
    display: block;
    border-radius: 30px;
    box-shadow: 0 24px 45px rgba(18, 52, 38, 0.12);
  }

  .story-copy h2,
  .menu-section h2,
  .benefit-section h2,
  .testimonial-section h2 {
    margin: 14px 0 18px;
    font-size: clamp(2rem, 3vw, 3rem);
    letter-spacing: -0.05em;
    color: #173d2e;
  }

  .story-copy p {
    color: #4d665d;
    line-height: 1.8;
    margin: 0 0 16px;
  }

  .story-copy ul {
    margin: 0;
    padding-left: 20px;
    color: #425d52;
    display: grid;
    gap: 10px;
    line-height: 1.7;
  }

  .menu-section,
  .benefit-section,
  .testimonial-section {
    margin-top: 58px;
  }

  .section-top {
    display: flex;
    justify-content: space-between;
    align-items: end;
    gap: 20px;
    margin-bottom: 24px;
  }

  .compact {
    margin-bottom: 16px;
  }

  .category-list {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    justify-content: flex-end;
  }

  .chip {
    background: #edf8ef;
    color: #1d473a;
    padding: 10px 14px;
    font-size: 0.88rem;
    border: 1px solid rgba(67, 114, 87, 0.08);
  }

  .chip.active {
    background: #1c4b39;
    color: white;
  }

  .product-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 18px;
  }

  .product-card {
    background: white;
    border-radius: 26px;
    overflow: hidden;
    box-shadow: 0 18px 35px rgba(17, 53, 39, 0.06);
    border: 1px solid rgba(89, 126, 101, 0.08);
  }

  .product-card img {
    display: block;
    width: 100%;
    height: 230px;
    object-fit: cover;
  }

  .product-body {
    padding: 18px 18px 20px;
  }

  .product-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    color: #517d66;
    font-size: 0.76rem;
    font-weight: 700;
    text-transform: uppercase;
  }

  .product-body h3 {
    margin: 14px 0 10px;
    font-size: 1.65rem;
    color: #183d2d;
  }

  .product-body p {
    margin: 0;
    line-height: 1.7;
    color: #5d726a;
    min-height: 70px;
  }

  .product-body button {
    margin-top: 18px;
    border: none;
  }

  .benefits-grid article {
    position: relative;
    overflow: hidden;
  }

  .benefits-grid strong {
    display: inline-flex;
    font-size: 2.6rem;
    color: #5f9d75;
    letter-spacing: -0.06em;
  }

  .reservation-section {
    margin-top: 58px;
    display: grid;
    grid-template-columns: 1.1fr 0.9fr;
    gap: 20px;
    background: linear-gradient(135deg, #1d4033, #0f2c23);
    color: white;
    border-radius: 32px;
    padding: 28px;
    box-shadow: 0 25px 45px rgba(22, 44, 35, 0.12);
  }

  .reservation-copy p {
    color: rgba(255,255,255,0.78);
    line-height: 1.8;
    margin: 0 0 22px;
    max-width: 560px;
  }

  .reservation-card {
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 24px;
    padding: 22px;
  }

  .reservation-card h3 {
    margin-top: 0;
    margin-bottom: 18px;
    font-size: 1.5rem;
  }

  .hours-row {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 0;
    border-bottom: 1px solid rgba(255,255,255,0.08);
    color: rgba(255,255,255,0.8);
  }

  .hours-row:last-child {
    border-bottom: none;
  }

  .testimonial-grid article {
    padding: 22px 18px;
  }

  .testimonial-grid p {
    font-size: 1rem;
    line-height: 1.7;
  }

  .author {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-top: 18px;
  }

  .author span {
    color: #6a857b;
    font-size: 0.8rem;
  }

  .site-footer {
    display: grid;
    grid-template-columns: 1.3fr 1fr 1fr;
    gap: 16px;
    background: #112b22;
    color: rgba(255,255,255,0.8);
    border-radius: 32px;
    padding: 28px 24px;
    margin-top: 58px;
  }

  .site-footer h4 {
    color: white;
    margin: 0 0 12px;
    font-size: 1.05rem;
  }

  .site-footer p {
    margin: 8px 0;
    line-height: 1.7;
  }

  @media (max-width: 980px) {
    .site-header,
    .section-top,
    .hero-section,
    .story-section,
    .reservation-section,
    .site-footer {
      grid-template-columns: 1fr;
      display: grid;
    }

    .main-nav {
      display: none;
    }

    .hero-section,
    .story-section,
    .reservation-section,
    .site-footer {
      padding-left: 0;
      padding-right: 0;
    }

    .feature-grid,
    .product-grid,
    .benefits-grid,
    .testimonial-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 640px) {
    .site-header {
      display: flex;
      flex-direction: column;
      gap: 12px;
      align-items: flex-start;
    }

    .header-actions {
      width: 100%;
      justify-content: space-between;
    }

    .feature-grid,
    .product-grid,
    .benefits-grid,
    .testimonial-grid,
    .site-footer {
      grid-template-columns: 1fr;
    }

    .hero-section {
      padding-top: 24px;
    }

    .hero-visual {
      min-height: 400px;
    }

    .hero-image-wrap {
      height: 360px;
    }

    .floating-card {
      transform: scale(0.9);
    }

    .category-list {
      justify-content: flex-start;
    }
  }
</style>


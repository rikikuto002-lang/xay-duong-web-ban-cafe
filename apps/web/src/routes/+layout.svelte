<script lang="ts">
  import { onMount } from 'svelte';
  import { getRole, clearSession, getSession, getCartCount } from '$lib/auth';

  export let data: Record<string, unknown> = {};
  export let params: Record<string, string> = {};

  const routeState = { data, params };
  void routeState;

  let role: 'guest' | 'customer' | 'admin' = 'guest';
  let userName = '';
  let cartCount = 0;
  let mobileMenuOpen = false;

  function refreshState() {
    role = getRole();
    const session = getSession();
    userName = session?.user?.name || (role === 'admin' ? 'Admin' : '');
    cartCount = getCartCount();
  }

  onMount(() => {
    refreshState();

    const onCartUpdated = () => {
      cartCount = getCartCount();
    };
    const onStorage = () => {
      refreshState();
    };

    window.addEventListener('cart-updated', onCartUpdated);
    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener('cart-updated', onCartUpdated);
      window.removeEventListener('storage', onStorage);
    };
  });

  function logout() {
    clearSession();
    role = 'guest';
    userName = '';
    mobileMenuOpen = false;
    window.location.href = '/';
  }

  function toggleMobileMenu() {
    mobileMenuOpen = !mobileMenuOpen;
  }

  function closeMobileMenu() {
    mobileMenuOpen = false;
  }
</script>

<svelte:head>
  <meta name="theme-color" content="#3d2314" />
</svelte:head>

<header class="global-navbar">
  <div class="nav-container">
    <a href="/" class="brand-link" on:click={closeMobileMenu}>
      <span class="brand-icon">☕</span>
      <div class="brand-text">
        <span class="brand-title">CafeZone</span>
        <span class="brand-tagline">Artisan Coffee & Bakery</span>
      </div>
    </a>

    <!-- Desktop Navigation -->
    <nav class="desktop-nav" aria-label="Menu chính">
      <a href="/" class="nav-item">Trang chủ</a>
      <a href="/#menu" class="nav-item">Thực đơn</a>
      <a href="/#about" class="nav-item">Giới thiệu</a>
      {#if role !== 'guest'}
        <a href="/orders" class="nav-item">Đơn hàng</a>
      {/if}
      {#if role === 'admin'}
        <a href="/admin" class="nav-item admin-badge">Quản trị</a>
      {/if}
    </nav>

    <!-- Desktop Actions -->
    <div class="desktop-actions">
      <a href="/cart" class="cart-button" aria-label="Xem giỏ hàng">
        <span class="cart-icon">🛒</span>
        <span class="cart-text">Giỏ hàng</span>
        {#if cartCount > 0}
          <span class="cart-badge">{cartCount}</span>
        {/if}
      </a>

      {#if role === 'guest'}
        <a href="/login" class="login-button">Đăng nhập</a>
      {:else}
        <div class="user-greeting">
          <a href="/account" class="user-name">👤 {userName || 'Tài khoản'}</a>
          <button class="logout-btn" on:click={logout} title="Đăng xuất">Thoát</button>
        </div>
      {/if}

      <!-- Mobile Hamburger Button -->
      <button
        class="hamburger-btn"
        on:click={toggleMobileMenu}
        aria-label="Mở menu di động"
        aria-expanded={mobileMenuOpen}
      >
        <span class="hamburger-bar" class:open={mobileMenuOpen}></span>
        <span class="hamburger-bar" class:open={mobileMenuOpen}></span>
        <span class="hamburger-bar" class:open={mobileMenuOpen}></span>
      </button>
    </div>
  </div>
</header>

<!-- Mobile Drawer Overlay -->
{#if mobileMenuOpen}
  <div class="mobile-backdrop" on:click={closeMobileMenu} on:keydown={(e) => e.key === 'Escape' && closeMobileMenu()} role="presentation"></div>
  <aside class="mobile-drawer" aria-label="Menu di động">
    <div class="drawer-header">
      <div class="brand-text">
        <span class="brand-title">CafeZone</span>
        <span class="brand-tagline">Menu chuyển hướng</span>
      </div>
      <button class="close-drawer-btn" on:click={closeMobileMenu} aria-label="Đóng menu">✕</button>
    </div>

    <nav class="drawer-links">
      <a href="/" on:click={closeMobileMenu} class="drawer-link">☕ Trang chủ</a>
      <a href="/#menu" on:click={closeMobileMenu} class="drawer-link">📋 Thực đơn</a>
      <a href="/#about" on:click={closeMobileMenu} class="drawer-link">🌿 Về CafeZone</a>
      <a href="/cart" on:click={closeMobileMenu} class="drawer-link drawer-cart">
        🛒 Giỏ hàng
        {#if cartCount > 0}
          <span class="cart-badge">{cartCount}</span>
        {/if}
      </a>
      {#if role !== 'guest'}
        <a href="/orders" on:click={closeMobileMenu} class="drawer-link">📦 Lịch sử đơn hàng</a>
        <a href="/account" on:click={closeMobileMenu} class="drawer-link">👤 Tài khoản ({userName})</a>
      {/if}
      {#if role === 'admin'}
        <a href="/admin" on:click={closeMobileMenu} class="drawer-link drawer-admin">⚡ Bảng Quản Trị</a>
      {/if}
    </nav>

    <div class="drawer-footer">
      {#if role === 'guest'}
        <a href="/login" on:click={closeMobileMenu} class="drawer-login-btn">Đăng nhập / Đăng ký</a>
      {:else}
        <button class="drawer-logout-btn" on:click={logout}>Đăng xuất ({userName})</button>
      {/if}
    </div>
  </aside>
{/if}

<main class="main-content">
  <slot />
</main>

<style>
  :global(:root) {
    --cafe-primary: #3d2314;
    --cafe-primary-hover: #2b180d;
    --cafe-accent: #c68a4c;
    --cafe-accent-hover: #b07436;
    --cafe-bg: #fcf9f5;
    --cafe-surface: #ffffff;
    --cafe-text: #281810;
    --cafe-text-muted: #6b584d;
    --cafe-border: #e8dfd5;
    --cafe-success: #1e7e34;
    --cafe-danger: #c53030;
  }

  :global(body) {
    margin: 0;
    padding: 0;
    background: var(--cafe-bg);
    color: var(--cafe-text);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
  }

  :global(*) {
    box-sizing: border-box;
  }

  .global-navbar {
    position: sticky;
    top: 0;
    z-index: 1000;
    background: rgba(45, 27, 18, 0.96);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  }

  .nav-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 10px 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  .brand-link {
    display: flex;
    align-items: center;
    gap: 12px;
    text-decoration: none;
    color: #ffffff;
  }

  .brand-icon {
    font-size: 26px;
    background: rgba(198, 138, 76, 0.2);
    width: 42px;
    height: 42px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 12px;
    border: 1px solid rgba(198, 138, 76, 0.4);
  }

  .brand-text {
    display: flex;
    flex-direction: column;
  }

  .brand-title {
    font-size: 20px;
    font-weight: 800;
    letter-spacing: 0.5px;
    color: #ffffff;
    line-height: 1.1;
  }

  .brand-tagline {
    font-size: 11px;
    color: #c68a4c;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    font-weight: 600;
  }

  .desktop-nav {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .nav-item {
    color: #eeddd2;
    text-decoration: none;
    font-size: 14px;
    font-weight: 600;
    padding: 8px 14px;
    border-radius: 20px;
    transition: all 0.2s ease;
  }

  .nav-item:hover {
    color: #ffffff;
    background: rgba(255, 255, 255, 0.1);
  }

  .admin-badge {
    background: rgba(198, 138, 76, 0.25);
    color: #f7ca9a;
    border: 1px solid rgba(198, 138, 76, 0.4);
  }

  .admin-badge:hover {
    background: #c68a4c;
    color: #ffffff;
  }

  .desktop-actions {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .cart-button {
    display: flex;
    align-items: center;
    gap: 6px;
    background: rgba(255, 255, 255, 0.1);
    color: #ffffff;
    text-decoration: none;
    font-size: 13px;
    font-weight: 700;
    padding: 8px 14px;
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.15);
    transition: all 0.2s ease;
  }

  .cart-button:hover {
    background: #c68a4c;
    border-color: #c68a4c;
  }

  .cart-badge {
    background: #e53e3e;
    color: white;
    font-size: 11px;
    font-weight: 800;
    padding: 2px 7px;
    border-radius: 10px;
    min-width: 18px;
    text-align: center;
  }

  .login-button {
    background: #c68a4c;
    color: #ffffff;
    text-decoration: none;
    font-size: 13px;
    font-weight: 700;
    padding: 8px 18px;
    border-radius: 20px;
    transition: background 0.2s ease;
  }

  .login-button:hover {
    background: #b07436;
  }

  .user-greeting {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .user-name {
    color: #eeddd2;
    text-decoration: none;
    font-size: 13px;
    font-weight: 600;
    padding: 6px 10px;
    border-radius: 6px;
  }

  .user-name:hover {
    color: white;
  }

  .logout-btn {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: #d1b8a9;
    padding: 6px 10px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .logout-btn:hover {
    border-color: #e53e3e;
    color: #e53e3e;
    background: rgba(229, 62, 62, 0.1);
  }

  /* Mobile Hamburger button */
  .hamburger-btn {
    display: none;
    flex-direction: column;
    justify-content: space-around;
    width: 32px;
    height: 32px;
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 4px;
    z-index: 1001;
  }

  .hamburger-bar {
    width: 24px;
    height: 2.5px;
    background-color: #ffffff;
    border-radius: 2px;
    transition: all 0.3s ease;
  }

  /* Responsive breakpoints */
  @media (max-width: 820px) {
    .desktop-nav {
      display: none;
    }

    .user-greeting .logout-btn,
    .user-greeting .user-name {
      display: none;
    }

    .hamburger-btn {
      display: flex;
    }
  }

  /* Mobile Drawer */
  .mobile-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.55);
    backdrop-filter: blur(4px);
    z-index: 1050;
  }

  .mobile-drawer {
    position: fixed;
    top: 0;
    right: 0;
    width: 82%;
    max-width: 320px;
    height: 100%;
    background: #2a1914;
    color: #ffffff;
    z-index: 1100;
    padding: 24px 20px;
    display: flex;
    flex-direction: column;
    box-shadow: -4px 0 25px rgba(0, 0, 0, 0.4);
    animation: slideIn 0.25s ease-out;
  }

  @keyframes slideIn {
    from {
      transform: translateX(100%);
    }
    to {
      transform: translateX(0);
    }
  }

  .drawer-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    margin-bottom: 16px;
  }

  .close-drawer-btn {
    background: rgba(255, 255, 255, 0.1);
    border: none;
    color: #ffffff;
    font-size: 18px;
    width: 34px;
    height: 34px;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .drawer-links {
    display: flex;
    flex-direction: column;
    gap: 10px;
    flex: 1;
  }

  .drawer-link {
    color: #e5d7cc;
    text-decoration: none;
    font-size: 15px;
    font-weight: 600;
    padding: 12px 14px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    transition: background 0.2s ease;
  }

  .drawer-link:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #ffffff;
  }

  .drawer-admin {
    background: rgba(198, 138, 76, 0.2);
    color: #f7ca9a;
  }

  .drawer-footer {
    padding-top: 16px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }

  .drawer-login-btn {
    display: block;
    text-align: center;
    background: #c68a4c;
    color: #ffffff;
    text-decoration: none;
    padding: 12px;
    border-radius: 8px;
    font-weight: 700;
  }

  .drawer-logout-btn {
    width: 100%;
    padding: 12px;
    background: rgba(229, 62, 62, 0.15);
    border: 1px solid rgba(229, 62, 62, 0.3);
    color: #feb2b2;
    border-radius: 8px;
    font-weight: 700;
    cursor: pointer;
  }

  .main-content {
    min-height: calc(100vh - 65px);
  }
</style>

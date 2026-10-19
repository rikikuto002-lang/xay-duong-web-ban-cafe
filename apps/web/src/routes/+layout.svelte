<script lang="ts">
  import { onMount } from 'svelte';
  import { getRole, clearSession } from '$lib/auth';

  let role: 'guest' | 'customer' | 'admin' = 'guest';

  onMount(() => {
    role = getRole();
  });

  function logout() {
    clearSession();
    role = 'guest';
    window.location.href = '/';
  }

  $: navItems = role === 'admin'
    ? [
        { label: 'Trang chủ', href: '/' },
        { label: 'Giỏ hàng', href: '/cart' },
        { label: 'Đơn hàng', href: '/orders' },
        { label: 'Quản trị', href: '/admin' },
        { label: 'Đăng xuất', href: '#', action: logout }
      ]
    : role === 'customer'
      ? [
          { label: 'Trang chủ', href: '/' },
          { label: 'Giỏ hàng', href: '/cart' },
          { label: 'Đơn hàng', href: '/orders' },
          { label: 'Tài khoản', href: '/account' },
          { label: 'Đăng xuất', href: '#', action: logout }
        ]
      : [
          { label: 'Trang chủ', href: '/' },
          { label: 'Giỏ hàng', href: '/cart' },
          { label: 'Đăng nhập', href: '/login' }
        ];
</script>

<nav class="top-nav">
  {#each navItems as item}
    {#if item.action}
      <button class="nav-btn" on:click={item.action}>{item.label}</button>
    {:else}
      <a href={item.href}>{item.label}</a>
    {/if}
  {/each}
</nav>

<slot />

<style>
  :global(body) {
    margin: 0;
    background: #f5efe9;
    color: #201712;
    font-family: 'Segoe UI', sans-serif;
  }

  :global(*) {
    box-sizing: border-box;
  }

  .top-nav {
    position: sticky;
    top: 0;
    z-index: 10;
    display: flex;
    justify-content: space-between;
    gap: 8px;
    padding: 14px 16px;
    background: rgba(42, 25, 20, 0.92);
    backdrop-filter: blur(8px);
  }

  .top-nav a,
  .nav-btn {
    color: white;
    text-decoration: none;
    font-size: 13px;
    font-weight: 600;
    padding: 8px 10px;
    border-radius: 999px;
    background: transparent;
    border: none;
    cursor: pointer;
  }

  .top-nav a:hover,
  .nav-btn:hover {
    background: rgba(255, 255, 255, 0.08);
  }
</style>

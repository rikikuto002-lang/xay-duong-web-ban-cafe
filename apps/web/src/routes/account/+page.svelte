<script lang="ts">
  import { onMount } from 'svelte';
  import { getSession } from '$lib/auth';

  export let data: Record<string, unknown> = {};
  export let params: Record<string, string> = {};

  const routeState = { data, params };
  void routeState;

  type UserSession = {
    id: string;
    name: string;
    email: string;
    role: string;
  };

  let user: UserSession | null = null;

  onMount(() => {
    const session = getSession();
    user = session?.user ?? null;

    if (!user) {
      window.location.href = '/login';
    }
  });
</script>

{#if user}
  <section class="page-shell">
    <div class="header-row">
      <div>
        <p class="eyebrow">Tài khoản</p>
        <h1>Khu vực khách hàng</h1>
      </div>
    </div>

    <div class="account-grid">
      <div class="panel profile-panel">
        <h2>Thông tin cá nhân</h2>
        <p><strong>Họ tên:</strong> {user.name}</p>
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>Vai trò:</strong> {user.role}</p>
      </div>

      <div class="panel quick-panel">
        <h2>Truy cập nhanh</h2>
        <div class="action-stack">
          <a href="/cart">Giỏ hàng</a>
          <a href="/orders">Đơn hàng của tôi</a>
          <a href="/">Mua sắm</a>
        </div>
      </div>
    </div>
  </section>
{/if}

<style>
  .page-shell {
    max-width: 1000px;
    margin: 0 auto;
    padding: 24px 16px 40px;
  }

  .header-row {
    margin-bottom: 18px;
  }

  .eyebrow {
    margin: 0;
    text-transform: uppercase;
    color: #b66b41;
    font-weight: 700;
  }

  h1 {
    margin: 8px 0 0;
    font-size: 36px;
  }

  .account-grid {
    display: grid;
    gap: 18px;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  }

  .panel {
    background: white;
    border-radius: 22px;
    padding: 20px;
    box-shadow: 0 10px 24px rgba(25, 17, 12, 0.04);
  }

  h2 {
    margin-top: 0;
  }

  p {
    margin: 10px 0;
    color: #4d3b35;
  }

  .action-stack {
    display: grid;
    gap: 12px;
  }

  .action-stack a {
    display: block;
    background: #f6ede7;
    color: #31231d;
    text-decoration: none;
    padding: 12px 14px;
    border-radius: 12px;
    font-weight: 700;
  }
</style>

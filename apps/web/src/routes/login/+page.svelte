<script lang="ts">
  import { onMount } from 'svelte';
  import { setSession, clearSession, getRole } from '$lib/auth';

  export let data: Record<string, unknown> = {};
  export let params: Record<string, string> = {};

  const routeState = { data, params };
  void routeState;

  const API_URL = import.meta.env.PUBLIC_API_URL ?? '';

  let role: 'guest' | 'customer' | 'admin' = 'guest';
  let name = '';
  let email = '';
  let password = '';
  let isRegisterMode = false;
  let message = '';
  let isLoading = false;

  onMount(() => {
    role = getRole();
  });

  function saveRole(nextRole: 'guest' | 'customer' | 'admin') {
    role = nextRole;
    localStorage.setItem('cafeRole', nextRole);
  }

  async function handleSubmit() {
    isLoading = true;
    message = '';

    try {
      const endpoint = isRegisterMode ? `${API_URL}/api/auth/register` : `${API_URL}/api/auth/login`;
      const payload = isRegisterMode
        ? { name, email, password, role: 'customer' }
        : { email, password, role };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message ?? (isRegisterMode ? 'Tạo tài khoản thất bại' : 'Đăng nhập thất bại'));
      }

      setSession({
        token: result.token,
        user: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          role: result.user.role
        }
      });

      message = isRegisterMode ? 'Tạo tài khoản thành công' : 'Đăng nhập thành công';
      window.location.href = result.user.role === 'admin' ? '/admin' : '/';
    } catch (error) {
      message = error instanceof Error ? error.message : (isRegisterMode ? 'Tạo tài khoản thất bại' : 'Đăng nhập thất bại');
      clearSession();
    } finally {
      isLoading = false;
    }
  }
</script>

<section class="page-shell">
  <div class="auth-card">
    <p class="eyebrow">Tài khoản</p>
    <h1>{isRegisterMode ? 'Tạo tài khoản mới' : 'Đăng nhập hệ thống'}</h1>

    <div class="mode-switch">
      <button class:selected={!isRegisterMode} on:click={() => (isRegisterMode = false)}>Đăng nhập</button>
      <button class:selected={isRegisterMode} on:click={() => (isRegisterMode = true)}>Đăng ký</button>
    </div>

    <div class="role-list">
      <button class:selected={role === 'guest'} on:click={() => saveRole('guest')}>Khách vãng lai</button>
      <button class:selected={role === 'customer'} on:click={() => saveRole('customer')}>Người mua hàng</button>
      <button class:selected={role === 'admin'} on:click={() => saveRole('admin')}>Admin</button>
    </div>

    {#if isRegisterMode}
      <label>
        Họ và tên
        <input bind:value={name} type="text" placeholder="Nguyễn Văn A" required />
      </label>
    {/if}

    <label>
      Email
      <input bind:value={email} type="email" placeholder="demo@cafeshop.vn" required />
    </label>

    <label>
      Mật khẩu
      <input bind:value={password} type="password" placeholder="********" required />
    </label>

    <button class="primary" on:click={handleSubmit} disabled={isLoading}>
      {isLoading ? (isRegisterMode ? 'Đang tạo tài khoản...' : 'Đang đăng nhập...') : (isRegisterMode ? 'Tạo tài khoản' : 'Đăng nhập')}
    </button>

    {#if message}
      <p class="message">{message}</p>
    {/if}
    <p class="note">Bạn đang ở vai trò: <strong>{role}</strong></p>
  </div>
</section>

<style>
  .page-shell {
    padding: 40px 16px;
    display: flex;
    justify-content: center;
  }

  .auth-card {
    width: 100%;
    max-width: 480px;
    background: white;
    border-radius: 24px;
    padding: 24px;
    box-shadow: 0 12px 24px rgba(40, 23, 16, 0.06);
  }

  .eyebrow {
    margin: 0;
    text-transform: uppercase;
    color: #b66b41;
    font-weight: 700;
  }

  h1 {
    margin: 10px 0 20px;
    font-size: 32px;
  }

  .role-list {
    display: grid;
    gap: 10px;
    margin-bottom: 18px;
  }

  .role-list button {
    padding: 12px 14px;
    border: 1px solid #e9d8c9;
    border-radius: 12px;
    background: white;
    font-weight: 700;
    cursor: pointer;
  }

  .role-list button.selected {
    background: #3b281f;
    color: white;
    border-color: #3b281f;
  }

  label {
    display: block;
    margin-bottom: 16px;
    font-weight: 600;
    color: #47362f;
  }

  input {
    width: 100%;
    margin-top: 8px;
    padding: 12px 14px;
    border: 1px solid #eadbce;
    border-radius: 10px;
    font: inherit;
  }

  .primary {
    width: 100%;
    border: none;
    border-radius: 12px;
    background: #3b281f;
    color: white;
    padding: 14px 16px;
    font-weight: 700;
    cursor: pointer;
  }

  .message {
    margin-top: 16px;
    color: #157347;
    background: #eafaf1;
    border: 1px solid #bfe7ce;
    padding: 10px 12px;
    border-radius: 10px;
  }

  .note {
    margin-top: 16px;
    color: #6a4f43;
  }
</style>
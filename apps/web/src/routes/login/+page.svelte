<script lang="ts">
  import { onMount } from 'svelte';
  import { setSession, clearSession, getRole } from '$lib/auth';

  export let data: Record<string, unknown> = {};
  export let params: Record<string, string> = {};

  const routeState = { data, params };
  void routeState;

  const API_URL = import.meta.env.PUBLIC_API_URL || 'https://ban-cafe-api.rikikuto002.workers.dev';

  let role: 'guest' | 'customer' | 'admin' = 'admin';
  let name = '';
  let email = 'admin@cafeshop.vn';
  let password = 'admin123';
  let showPassword = false;
  let isRegisterMode = false;
  let message = '';
  let isErrorMessage = false;
  let isLoading = false;

  onMount(() => {
    role = getRole();
    if (role === 'admin') {
      email = 'admin@cafeshop.vn';
      password = 'admin123';
    } else if (role === 'customer') {
      email = 'customer@example.com';
      password = 'customer123';
    } else {
      email = 'guest@example.com';
      password = 'guest123';
    }
  });

  function saveRole(nextRole: 'guest' | 'customer' | 'admin') {
    role = nextRole;
    localStorage.setItem('cafeRole', nextRole);
    if (!isRegisterMode) {
      if (nextRole === 'admin') {
        email = 'admin@cafeshop.vn';
        password = 'admin123';
      } else if (nextRole === 'customer') {
        email = 'customer@example.com';
        password = 'customer123';
      } else {
        email = 'guest@example.com';
        password = 'guest123';
      }
    }
  }

  async function handleSubmit() {
    isLoading = true;
    message = '';
    isErrorMessage = false;

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

      let result: Record<string, any> = {};
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        result = await response.json();
      } else {
        const text = await response.text();
        try {
          result = JSON.parse(text);
        } catch {
          result = { message: text || `Lỗi phản hồi từ máy chủ (${response.status})` };
        }
      }

      if (!response.ok) {
        const errorMsg =
          result.message ||
          result.error ||
          result.msg ||
          (isRegisterMode ? 'Tạo tài khoản thất bại' : 'Đăng nhập thất bại (Vui lòng kiểm tra lại mật khẩu)');
        throw new Error(errorMsg);
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

      isErrorMessage = false;
      message = isRegisterMode ? 'Tạo tài khoản thành công' : 'Đăng nhập thành công';
      window.location.href = result.user.role === 'admin' ? '/admin' : '/';
    } catch (error) {
      isErrorMessage = true;
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

    <div class="hint-box">
      {#if role === 'admin'}
        Tài khoản: <strong>admin@cafeshop.vn</strong> | Mật khẩu: <strong>admin123</strong>
      {:else if role === 'customer'}
        Tài khoản: <strong>customer@example.com</strong> | Mật khẩu: <strong>customer123</strong>
      {:else}
        Tài khoản: <strong>guest@example.com</strong> | Mật khẩu: <strong>guest123</strong>
      {/if}
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
      <div class="password-wrap">
        {#if showPassword}
          <input bind:value={password} type="text" placeholder="admin123" required />
        {:else}
          <input bind:value={password} type="password" placeholder="admin123" required />
        {/if}
        <button type="button" class="toggle-pw" on:click={() => (showPassword = !showPassword)}>
          {showPassword ? 'Ẩn' : 'Hiện'}
        </button>
      </div>
    </label>

    <button class="primary" on:click={handleSubmit} disabled={isLoading}>
      {isLoading ? (isRegisterMode ? 'Đang tạo tài khoản...' : 'Đang đăng nhập...') : (isRegisterMode ? 'Tạo tài khoản' : 'Đăng nhập')}
    </button>

    {#if message}
      <p class="message" class:error-style={isErrorMessage}>{message}</p>
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

  .mode-switch {
    display: flex;
    gap: 8px;
    margin-bottom: 16px;
  }

  .mode-switch button {
    flex: 1;
    padding: 8px 12px;
    border: 1px solid #e9d8c9;
    border-radius: 8px;
    background: #fdfaf7;
    font-weight: 600;
    cursor: pointer;
  }

  .mode-switch button.selected {
    background: #3b281f;
    color: white;
    border-color: #3b281f;
  }

  .role-list {
    display: grid;
    gap: 10px;
    margin-bottom: 12px;
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

  .hint-box {
    margin-bottom: 16px;
    padding: 10px 14px;
    background: #fdf7ee;
    border: 1px solid #fae6c8;
    border-radius: 10px;
    color: #8c5b1c;
    font-size: 13px;
  }

  label {
    display: block;
    margin-bottom: 16px;
    font-weight: 600;
    color: #47362f;
  }

  .password-wrap {
    position: relative;
    display: flex;
    align-items: center;
  }

  .password-wrap input {
    margin-top: 8px;
    padding-right: 54px;
  }

  .toggle-pw {
    position: absolute;
    right: 10px;
    bottom: 8px;
    background: none;
    border: none;
    color: #8c6b5b;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    padding: 4px 6px;
  }

  input {
    width: 100%;
    margin-top: 8px;
    padding: 12px 14px;
    border: 1px solid #eadbce;
    border-radius: 10px;
    font: inherit;
    box-sizing: border-box;
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

  .message.error-style {
    color: #b02a37;
    background: #fdf2f2;
    border: 1px solid #f8d7da;
  }

  .note {
    margin-top: 16px;
    color: #6a4f43;
  }
</style>

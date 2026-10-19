<script lang="ts">
  import { onMount } from 'svelte';
  import { getSession, isAdmin } from '$lib/auth';

  type OrderStatus = 'pending' | 'confirmed' | 'shipping' | 'completed' | 'cancelled';

  type Order = {
    id: string;
    customerName: string;
    customerEmail?: string;
    phone: string;
    address: string;
    paymentMethod: string;
    total: number;
    status: OrderStatus;
  };

  let orders: Order[] = [];
  let role = 'guest';

  const statusMap: Record<OrderStatus, string> = {
    pending: 'Chờ xác nhận',
    confirmed: 'Đã xác nhận',
    shipping: 'Đang giao',
    completed: 'Đã hoàn tất',
    cancelled: 'Đã huỷ'
  };

  onMount(async () => {
    const session = getSession();
    role = session?.user.role ?? 'guest';
    await loadOrders();
  });

  async function loadOrders() {
    const session = getSession();
    const params = new URLSearchParams({
      role: session?.user.role ?? 'guest',
      userEmail: session?.user.email ?? ''
    });

    const response = await fetch(`http://localhost:4000/api/orders?${params.toString()}`);
    const result = await response.json();
    orders = result.orders ?? [];
  }

  async function changeStatus(orderId: string, nextStatus: OrderStatus) {
    const response = await fetch(`http://localhost:4000/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus })
    });

    const result = await response.json();
    if (response.ok) {
      await loadOrders();
      console.log(result.message);
    }
  }

  function handleStatusChange(event: Event, orderId: string) {
    const target = event.currentTarget as HTMLSelectElement;
    const nextStatus = target.value as OrderStatus;
    changeStatus(orderId, nextStatus);
  }
</script>

<section class="page-shell">
  <div class="header-row">
    <div>
      <p class="eyebrow">Đơn hàng</p>
      <h1>{isAdmin() ? 'Quản lý đơn hàng' : 'Lịch sử đơn hàng'}</h1>
    </div>
    <span class="badge">Vai trò: {role}</span>
  </div>

  {#if orders.length === 0}
    <div class="empty-box">Chưa có đơn hàng nào cho tài khoản này.</div>
  {:else}
    <div class="order-list">
      {#each orders as order}
        <article class="order-card">
          <div class="top-row">
            <h2>{order.id}</h2>
            <span class={`status ${order.status}`}>{statusMap[order.status]}</span>
          </div>

          <p><strong>Khách hàng:</strong> {order.customerName}</p>
          {#if order.customerEmail}
            <p><strong>Email:</strong> {order.customerEmail}</p>
          {/if}
          <p><strong>Điện thoại:</strong> {order.phone}</p>
          <p><strong>Địa chỉ:</strong> {order.address}</p>
          <p><strong>Thanh toán:</strong> {order.paymentMethod === 'bank-transfer' ? 'Chuyển khoản' : 'COD'}</p>
          <p><strong>Tổng tiền:</strong> {order.total.toLocaleString('vi-VN')}đ</p>

          {#if isAdmin()}
            <div class="admin-actions">
              <select
                value={order.status}
                on:change={(event) => handleStatusChange(event, order.id)}
              >
                <option value="pending">Chờ xác nhận</option>
                <option value="confirmed">Đã xác nhận</option>
                <option value="shipping">Đang giao</option>
                <option value="completed">Đã hoàn tất</option>
                <option value="cancelled">Đã huỷ</option>
              </select>
            </div>
          {/if}
        </article>
      {/each}
    </div>
  {/if}
</section>

<style>
  .page-shell {
    max-width: 1100px;
    margin: 0 auto;
    padding: 24px 16px 40px;
  }

  .header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 18px;
    gap: 12px;
  }

  .eyebrow {
    margin: 0;
    text-transform: uppercase;
    color: #b66b41;
    font-weight: 700;
  }

  h1 {
    margin: 8px 0 0;
    font-size: clamp(28px, 4vw, 40px);
  }

  .badge {
    background: #f7e6d6;
    color: #7a462c;
    border-radius: 999px;
    padding: 8px 12px;
    font-weight: 700;
  }

  .order-list {
    display: grid;
    gap: 18px;
  }

  .order-card {
    background: white;
    border-radius: 22px;
    padding: 20px;
    box-shadow: 0 10px 24px rgba(25, 17, 12, 0.04);
  }

  .top-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
  }

  h2 {
    margin: 0;
    font-size: 22px;
  }

  .status {
    display: inline-block;
    padding: 8px 12px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
  }

  .status.pending { background: #fff1d6; color: #8f5d00; }
  .status.confirmed { background: #dfeeff; color: #1f5ca8; }
  .status.shipping { background: #dff8ea; color: #0e7a4a; }
  .status.completed { background: #e6f6e6; color: #206f3b; }
  .status.cancelled { background: #fde7e7; color: #a03a39; }

  p {
    margin: 8px 0;
    color: #4d3b35;
  }

  .admin-actions {
    margin-top: 16px;
  }

  select {
    width: 100%;
    padding: 12px 14px;
    border: 1px solid #eadbce;
    border-radius: 10px;
    font: inherit;
  }

  .empty-box {
    background: white;
    padding: 28px 20px;
    border-radius: 18px;
    text-align: center;
    color: #604c43;
    box-shadow: 0 10px 24px rgba(25, 17, 12, 0.04);
  }

  @media (max-width: 640px) {
    .header-row {
      align-items: flex-start;
      flex-direction: column;
    }
  }
</style>

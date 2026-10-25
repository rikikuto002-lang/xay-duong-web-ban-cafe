<script lang="ts">
  import { onMount } from 'svelte';
  import { getSession, isAdmin } from '$lib/auth';

  export let data: Record<string, unknown> = {};
  export let params: Record<string, string> = {};

  const routeState = { data, params };
  void routeState;

  const API_URL = import.meta.env.PUBLIC_API_URL ?? 'http://localhost:4000';

  type OrderStatus = 'pending' | 'confirmed' | 'shipping' | 'completed' | 'cancelled';
  type PaymentStatus = 'unpaid' | 'paid';

  type OrderItem = {
    productId: number;
    name: string;
    quantity: number;
    price: number;
  };

  type OrderHistory = {
    status: string;
    note: string;
    timestamp: string;
  };

  type Order = {
    id: string;
    customerName: string;
    customerEmail?: string;
    phone: string;
    address: string;
    paymentMethod: string;
    paymentStatus: PaymentStatus;
    total: number;
    status: OrderStatus;
    createdAt: string;
    items?: OrderItem[];
    history?: OrderHistory[];
    qrUrl?: string;
  };

  let orders: Order[] = [];
  let role = 'guest';
  let isLoading = true;
  let actionMessage = '';
  let activeQrModalOrder: Order | null = null;
  let isActionLoading: Record<string, boolean> = {};

  const statusMap: Record<OrderStatus, string> = {
    pending: 'Chờ xác nhận',
    confirmed: 'Đã xác nhận',
    shipping: 'Đang giao',
    completed: 'Đã hoàn tất',
    cancelled: 'Đã hủy'
  };

  const paymentStatusMap: Record<PaymentStatus, string> = {
    unpaid: 'Chưa thanh toán',
    paid: 'Đã thanh toán'
  };

  onMount(async () => {
    const session = getSession();
    role = session?.user.role ?? 'guest';
    await loadOrders();
  });

  async function loadOrders() {
    isLoading = true;
    try {
      const session = getSession();
      const response = await fetch(`${API_URL}/api/orders`, {
        headers: session?.token ? { 'Authorization': `Bearer ${session.token}` } : {}
      });
      const result = await response.json();
      orders = result.orders ?? [];
    } catch {
      orders = [];
    } finally {
      isLoading = false;
    }
  }

  async function cancelOrder(orderId: string) {
    if (!confirm('Bạn có chắc chắn muốn hủy đơn hàng này không? Số lượng sản phẩm sẽ được tự động hoàn lại vào kho.')) {
      return;
    }

    const session = getSession();
    isActionLoading[orderId] = true;
    actionMessage = '';

    try {
      const response = await fetch(`${API_URL}/api/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.token ? { 'Authorization': `Bearer ${session.token}` } : {})
        },
        body: JSON.stringify({ reason: 'Khách hàng chủ động hủy trên web' })
      });

      const result = await response.json();
      if (!response.ok) {
        alert(result.message ?? 'Không thể hủy đơn hàng.');
        return;
      }

      actionMessage = `Đơn hàng #${orderId} đã được hủy thành công.`;
      await loadOrders();
    } catch {
      alert('Lỗi kết nối khi gửi yêu cầu hủy đơn.');
    } finally {
      isActionLoading[orderId] = false;
    }
  }

  // Simulate payment webhook or quick reconciliation
  async function simulatePaymentSuccess(order: Order) {
    isActionLoading[order.id] = true;
    actionMessage = '';

    try {
      const response = await fetch(`${API_URL}/api/orders/webhook/payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          orderId: order.id,
          amount: order.total,
          transactionId: `DEMO-TXN-${Date.now().toString().slice(-6)}`,
          content: `CAFE ${order.id}`
        })
      });

      const result = await response.json();
      if (response.ok) {
        actionMessage = `Thanh toán thành công cho đơn #${order.id}! Trạng thái tự động đổi sang "paid" & "confirmed".`;
        if (activeQrModalOrder?.id === order.id) {
          activeQrModalOrder = null;
        }
        await loadOrders();
      } else {
        alert(result.message ?? 'Đối soát thất bại.');
      }
    } catch {
      alert('Không thể kết nối đến cổng webhook thanh toán.');
    } finally {
      isActionLoading[order.id] = false;
    }
  }

  async function changeStatus(orderId: string, nextStatus: OrderStatus) {
    const session = getSession();
    const response = await fetch(`${API_URL}/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.token ? { 'Authorization': `Bearer ${session.token}` } : {})
      },
      body: JSON.stringify({ status: nextStatus })
    });

    const result = await response.json();
    if (!response.ok) {
      alert(result.message ?? 'Cập nhật trạng thái thất bại.');
      await loadOrders();
      return;
    }

    actionMessage = `Đơn hàng #${orderId} đã chuyển sang "${statusMap[nextStatus]}".`;
    await loadOrders();
  }

  function handleStatusChange(event: Event, orderId: string) {
    const target = event.currentTarget as HTMLSelectElement;
    const nextStatus = target.value as OrderStatus;
    changeStatus(orderId, nextStatus);
  }
</script>

<svelte:head>
  <title>{isAdmin() ? 'Quản lý đơn hàng' : 'Lịch sử đơn hàng'} | CafeZone</title>
</svelte:head>

<section class="page-shell">
  <div class="header-row">
    <div>
      <p class="eyebrow">Hệ thống đơn hàng</p>
      <h1>{isAdmin() ? 'Quản lý toàn bộ đơn hàng' : 'Lịch sử mua hàng của bạn'}</h1>
    </div>
    <span class="badge">Vai trò: {role}</span>
  </div>

  {#if actionMessage}
    <div class="alert success">
      ✓ {actionMessage}
    </div>
  {/if}

  {#if isLoading}
    <div class="empty-box">Đang tải danh sách đơn hàng...</div>
  {:else if orders.length === 0}
    <div class="empty-box">
      <p>Bạn chưa có đơn hàng nào.</p>
      <a href="/" class="btn primary">Đặt món ngay</a>
    </div>
  {:else}
    <div class="order-list">
      {#each orders as order}
        <article class="order-card">
          <div class="card-header">
            <div>
              <div class="title-meta">
                <h2>#{order.id}</h2>
                <span class="created-time">{new Date(order.createdAt).toLocaleString('vi-VN')}</span>
              </div>
              <p class="customer-line">
                <strong>{order.customerName}</strong> ({order.phone}) · <em>{order.address}</em>
              </p>
            </div>

            <div class="status-tags">
              <span class={`status ${order.status}`}>{statusMap[order.status] ?? order.status}</span>
              <span class={`pay-status ${order.paymentStatus}`}>
                {paymentStatusMap[order.paymentStatus] ?? order.paymentStatus}
              </span>
            </div>
          </div>

          <!-- Order items breakdown -->
          {#if order.items && order.items.length > 0}
            <div class="items-table">
              <div class="items-head">
                <span>Món</span>
                <span>Số lượng</span>
                <span>Đơn giá</span>
                <span>Thành tiền</span>
              </div>
              {#each order.items as item}
                <div class="items-row">
                  <span class="item-name">{item.name}</span>
                  <span class="item-qty">x{item.quantity}</span>
                  <span class="item-unit">{item.price.toLocaleString('vi-VN')}đ</span>
                  <strong class="item-subtotal">{(item.price * item.quantity).toLocaleString('vi-VN')}đ</strong>
                </div>
              {/each}
            </div>
          {/if}

          <!-- Order footer with totals and action buttons -->
          <div class="card-footer">
            <div class="order-total-info">
              <span class="pay-method">Phương thức: {order.paymentMethod === 'bank-transfer' ? 'Chuyển khoản VietQR' : 'Tiền mặt (COD)'}</span>
              <span class="total-text">Tổng thanh toán: <strong>{order.total.toLocaleString('vi-VN')}đ</strong></span>
            </div>

            <div class="action-buttons">
              <!-- VietQR View Button -->
              {#if order.paymentMethod === 'bank-transfer' && order.paymentStatus === 'unpaid' && order.status !== 'cancelled'}
                <button class="btn qr-btn" on:click={() => (activeQrModalOrder = order)}>
                  📱 Xem VietQR
                </button>
                <button 
                  class="btn pay-btn" 
                  on:click={() => simulatePaymentSuccess(order)} 
                  disabled={isActionLoading[order.id]}
                  title="Mô phỏng tiền về qua ngân hàng tự động"
                >
                  {isActionLoading[order.id] ? 'Đang đối soát...' : '⚡ Giả lập thanh toán'}
                </button>
              {/if}

              <!-- Cancel Button for customer -->
              {#if order.status === 'pending'}
                <button 
                  class="btn cancel-btn" 
                  on:click={() => cancelOrder(order.id)}
                  disabled={isActionLoading[order.id]}
                >
                  {isActionLoading[order.id] ? 'Đang hủy...' : 'Hủy đơn'}
                </button>
              {/if}

              <!-- Admin Status Change Dropdown -->
              {#if isAdmin()}
                <div class="admin-select-wrapper">
                  <label for={`status-${order.id}`}>Trạng thái:</label>
                  <select
                    id={`status-${order.id}`}
                    value={order.status}
                    on:change={(event) => handleStatusChange(event, order.id)}
                    disabled={order.status === 'completed' || order.status === 'cancelled'}
                  >
                    <option value="pending">Chờ xác nhận</option>
                    <option value="confirmed">Đã xác nhận</option>
                    <option value="shipping">Đang giao</option>
                    <option value="completed">Đã hoàn tất</option>
                    <option value="cancelled">Đã hủy</option>
                  </select>
                </div>
              {/if}
            </div>
          </div>

          <!-- History Timeline -->
          {#if order.history && order.history.length > 0}
            <details class="history-accordion">
              <summary>Lịch sử trạng thái ({order.history.length} sự kiện)</summary>
              <div class="timeline">
                {#each order.history as ev}
                  <div class="timeline-step">
                    <span class="timeline-dot"></span>
                    <div class="timeline-content">
                      <span class="timeline-note">{ev.note}</span>
                      <span class="timeline-time">{new Date(ev.timestamp).toLocaleString('vi-VN')}</span>
                    </div>
                  </div>
                {/each}
              </div>
            </details>
          {/if}
        </article>
      {/each}
    </div>
  {/if}

  <!-- QR Modal Pop-up -->
  {#if activeQrModalOrder}
    <div class="modal-backdrop" on:click={() => (activeQrModalOrder = null)} role="presentation">
      <div class="modal-card" on:click|stopPropagation role="presentation">
        <button class="close-btn" on:click={() => (activeQrModalOrder = null)}>✕</button>
        <h3>Mã VietQR thanh toán tự động</h3>
        <p class="modal-sub">Quét mã bằng bất kỳ App Ngân hàng nào (Vietcombank, MB, Techcombank, Momo, ...)</p>

        {#if activeQrModalOrder.qrUrl}
          <div class="qr-image-wrapper">
            <img src={activeQrModalOrder.qrUrl} alt="VietQR Payment" />
          </div>
        {/if}

        <div class="modal-bank-info">
          <p><strong>Mã đơn hàng:</strong> <code>#{activeQrModalOrder.id}</code></p>
          <p><strong>Số tiền:</strong> <strong class="highlight">{activeQrModalOrder.total.toLocaleString('vi-VN')}đ</strong></p>
          <p><strong>Nội dung CK:</strong> <code>CAFE {activeQrModalOrder.id}</code></p>
        </div>

        <div class="modal-actions">
          <button class="btn pay-btn" on:click={() => activeQrModalOrder && simulatePaymentSuccess(activeQrModalOrder)}>
            ⚡ Giả lập tiền về ngay
          </button>
          <button class="btn secondary" on:click={() => (activeQrModalOrder = null)}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  {/if}
</section>

<style>
  .page-shell {
    max-width: 1000px;
    margin: 0 auto;
    padding: 24px 16px 48px;
  }

  .header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
    gap: 12px;
  }

  .eyebrow {
    margin: 0;
    text-transform: uppercase;
    color: #a2593a;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.5px;
  }

  h1 {
    margin: 6px 0 0;
    font-size: 28px;
    color: #2b1e16;
  }

  .badge {
    background: #f4ede6;
    color: #664330;
    border-radius: 999px;
    padding: 6px 14px;
    font-size: 13px;
    font-weight: 700;
  }

  .alert.success {
    background: #eafaf1;
    border: 1px solid #bfe7ce;
    color: #147a44;
    padding: 12px 16px;
    border-radius: 12px;
    margin-bottom: 20px;
    font-weight: 600;
  }

  .order-list {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .order-card {
    background: white;
    border-radius: 18px;
    padding: 20px;
    box-shadow: 0 4px 18px rgba(30, 20, 16, 0.05);
    border: 1px solid #f2e9e1;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    border-bottom: 1px solid #f2e9e1;
    padding-bottom: 14px;
  }

  .title-meta {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .title-meta h2 {
    margin: 0;
    font-size: 18px;
    color: #2b1e16;
  }

  .created-time {
    color: #8c766b;
    font-size: 13px;
  }

  .customer-line {
    margin: 6px 0 0;
    font-size: 14px;
    color: #4a362c;
  }

  .status-tags {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .status, .pay-status {
    padding: 6px 10px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 700;
  }

  .status.pending { background: #fff5e0; color: #9c6700; }
  .status.confirmed { background: #e0f0ff; color: #1266c2; }
  .status.shipping { background: #e6f9f0; color: #0b804d; }
  .status.completed { background: #ebf7eb; color: #1e7e34; }
  .status.cancelled { background: #fde8e8; color: #b82a2a; }

  .pay-status.unpaid { background: #fdf0ea; color: #b84b23; border: 1px solid #fcdad0; }
  .pay-status.paid { background: #e6f7ec; color: #147a44; border: 1px solid #bfe7ce; }

  .items-table {
    margin: 14px 0;
    background: #faf7f4;
    border-radius: 12px;
    padding: 10px 14px;
  }

  .items-head {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr 1fr;
    font-size: 12px;
    color: #8c766b;
    font-weight: 600;
    border-bottom: 1px solid #ede3da;
    padding-bottom: 6px;
    margin-bottom: 6px;
  }

  .items-row {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr 1fr;
    font-size: 13px;
    padding: 4px 0;
    color: #3b2920;
    align-items: center;
  }

  .item-subtotal {
    text-align: right;
  }

  .card-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
    padding-top: 12px;
  }

  .order-total-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .pay-method {
    font-size: 13px;
    color: #7d685c;
  }

  .total-text {
    font-size: 15px;
    color: #2b1e16;
  }

  .total-text strong {
    font-size: 18px;
    color: #b94a28;
  }

  .action-buttons {
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
  }

  .btn {
    padding: 8px 14px;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    border: none;
    transition: all 0.2s;
  }

  .qr-btn {
    background: #f4ede6;
    color: #5c3826;
  }

  .pay-btn {
    background: #147a44;
    color: white;
  }

  .pay-btn:hover {
    background: #0e6236;
  }

  .cancel-btn {
    background: #fde8e8;
    color: #b82a2a;
  }

  .cancel-btn:hover {
    background: #fad2d2;
  }

  .admin-select-wrapper {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: #4a362c;
  }

  .admin-select-wrapper select {
    padding: 6px 10px;
    border-radius: 8px;
    border: 1px solid #d4c1b4;
    font: inherit;
    font-size: 13px;
  }

  .history-accordion {
    margin-top: 14px;
    border-top: 1px dashed #e8ded4;
    padding-top: 10px;
    font-size: 13px;
    color: #7d685c;
  }

  .history-accordion summary {
    cursor: pointer;
    font-weight: 600;
  }

  .timeline {
    margin-top: 10px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-left: 12px;
    border-left: 2px solid #e0d3c7;
  }

  .timeline-step {
    position: relative;
    padding-left: 10px;
  }

  .timeline-dot {
    position: absolute;
    left: -16px;
    top: 4px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #a2593a;
  }

  .timeline-content {
    display: flex;
    flex-direction: column;
  }

  .timeline-note {
    color: #3b2920;
    font-weight: 500;
  }

  .timeline-time {
    color: #9c897f;
    font-size: 11px;
  }

  /* Modal */
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.55);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 16px;
  }

  .modal-card {
    background: white;
    border-radius: 20px;
    padding: 24px;
    max-width: 420px;
    width: 100%;
    position: relative;
    text-align: center;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  }

  .close-btn {
    position: absolute;
    right: 16px;
    top: 14px;
    background: transparent;
    border: none;
    font-size: 18px;
    cursor: pointer;
    color: #8c766b;
  }

  .modal-card h3 {
    margin: 0 0 6px;
    color: #2b1e16;
  }

  .modal-sub {
    font-size: 13px;
    color: #7d685c;
    margin: 0 0 16px;
  }

  .qr-image-wrapper img {
    width: 100%;
    max-width: 250px;
    border-radius: 12px;
    border: 1px solid #ebdcd0;
  }

  .modal-bank-info {
    text-align: left;
    background: #faf7f4;
    border-radius: 12px;
    padding: 12px 16px;
    margin: 16px 0;
    font-size: 13px;
  }

  .modal-bank-info p {
    margin: 4px 0;
  }

  .modal-bank-info code {
    background: #ebdcd0;
    padding: 2px 6px;
    border-radius: 6px;
    color: #b94a28;
    font-weight: bold;
  }

  .highlight {
    color: #b94a28;
    font-size: 15px;
  }

  .modal-actions {
    display: flex;
    gap: 10px;
    justify-content: center;
  }

  .btn.secondary {
    background: #f0e6de;
    color: #4a3325;
  }

  .empty-box {
    background: white;
    padding: 36px 20px;
    border-radius: 18px;
    text-align: center;
    color: #604c43;
    box-shadow: 0 4px 18px rgba(25, 17, 12, 0.04);
  }

  .btn.primary {
    background: #3a271f;
    color: white;
    display: inline-block;
    margin-top: 12px;
    text-decoration: none;
  }

  @media (max-width: 640px) {
    .card-header, .card-footer {
      flex-direction: column;
      align-items: flex-start;
    }
    .status-tags {
      justify-content: flex-start;
    }
  }
</style>

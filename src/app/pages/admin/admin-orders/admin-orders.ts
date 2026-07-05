import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrderService, Order } from '../../../services/order.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-orders.html',
})
export class AdminOrdersComponent implements OnInit, OnDestroy {
  /* =========================
     FILTER STATE
  ========================== */
  showFilter = false;
  searchQuery = '';
  statusFilter = '';
  dateFilter = '';
  sortBy = 'newest';
  activeFilters = 0;

  /* =========================
     PAGINATION
  ========================== */
  pageSize = 10;
  currentPage = 0;

  /* =========================
     DATA
  ========================== */
  allOrders: Order[] = [];
  filteredOrders: Order[] = [];
  displayedOrders: Order[] = [];
  selectedOrder: Order | null = null;
  loading = true;
  error = '';
  updatingId: string | null = null;

  /* =========================
     STATS
  ========================== */
  totalOrders = 0;
  pendingOrders = 0;
  todaysOrders = 0;
  totalRevenue = 0;

  private refreshTimer: any;
  isBrowser = false;

  constructor(
    private orderService: OrderService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit() {
    this.loadOrders();
    // Auto-refresh every 30 seconds
    this.refreshTimer = setInterval(() => this.loadOrders(), 30000);
  }

  ngOnDestroy() {
    clearInterval(this.refreshTimer);
  }

  /* =========================
     DATA LOADING
  ========================== */
  loadOrders() {
    this.loading = true;
    this.orderService.getAllOrders({ limit: 200, sortBy: '-createdAt' }).subscribe({
      next: (res) => {
        if (res.success) {
          this.allOrders = res.orders;
          this.calculateStats();
          this.applyFilters();
        }
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load orders:', err);
        this.error = 'Failed to load orders.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  refreshOrders() {
    this.loadOrders();
  }

  /* =========================
     STATS
  ========================== */
  calculateStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    this.totalOrders = this.allOrders.length;
    this.pendingOrders = this.allOrders.filter(o =>
      ['pending', 'confirmed', 'preparing'].includes(o.orderStatus)
    ).length;
    this.todaysOrders = this.allOrders.filter(o => {
      const d = new Date(o.createdAt as any);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === today.getTime();
    }).length;
    this.totalRevenue = this.allOrders
      .filter(o => o.orderStatus === 'delivered')
      .reduce((sum, o) => sum + o.totalAmount, 0);
  }

  /* =========================
     FILTERS
  ========================== */
  toggleFilter() { this.showFilter = !this.showFilter; }
  onSearch() { this.applyFilters(); }

  applyFilters() {
    let filtered = [...this.allOrders];

    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      filtered = filtered.filter(o =>
        String(o.orderNumber).includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.customerPhone.includes(q) ||
        o.customerEmail.toLowerCase().includes(q)
      );
    }

    if (this.statusFilter) {
      filtered = filtered.filter(o => o.orderStatus === this.statusFilter);
    }

    if (this.dateFilter) {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      filtered = filtered.filter(o => {
        const d = new Date(o.createdAt as any); d.setHours(0, 0, 0, 0);
        if (this.dateFilter === 'today') return d.getTime() === today.getTime();
        if (this.dateFilter === 'week') {
          const w = new Date(today); w.setDate(today.getDate() - 7);
          return d >= w;
        }
        if (this.dateFilter === 'month') {
          const m = new Date(today); m.setMonth(today.getMonth() - 1);
          return d >= m;
        }
        return true;
      });
    }

    filtered.sort((a, b) => {
      const dA = new Date(a.createdAt as any).getTime();
      const dB = new Date(b.createdAt as any).getTime();
      if (this.sortBy === 'oldest') return dA - dB;
      if (this.sortBy === 'amount-high') return b.totalAmount - a.totalAmount;
      if (this.sortBy === 'amount-low') return a.totalAmount - b.totalAmount;
      return dB - dA; // newest
    });

    this.filteredOrders = filtered;
    this.currentPage = 0;
    this.displayedOrders = filtered.slice(0, this.pageSize);

    this.activeFilters = [this.searchQuery, this.statusFilter, this.dateFilter].filter(Boolean).length;
  }

  clearFilters() {
    this.searchQuery = '';
    this.statusFilter = '';
    this.dateFilter = '';
    this.sortBy = 'newest';
    this.applyFilters();
  }

  get hasMore(): boolean {
    return this.displayedOrders.length < this.filteredOrders.length;
  }

  get loadMoreCount(): number {
    return this.filteredOrders.length - this.displayedOrders.length;
  }

  loadMoreOrders() {
    const next = this.displayedOrders.length + this.pageSize;
    this.displayedOrders = this.filteredOrders.slice(0, next);
  }

  /* =========================
     ORDER ACTIONS
  ========================== */
  viewOrderDetails(order: Order) {
    this.selectedOrder = order;
  }

  closeModal() {
    this.selectedOrder = null;
  }

  updateOrderStatus(order: Order) {
    const flow = ['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered'];
    const idx = flow.indexOf(order.orderStatus);
    if (idx === -1 || idx === flow.length - 1) {
      alert('Order is already at the final status or cannot be advanced.');
      return;
    }
    const nextStatus = flow[idx + 1];
    if (!confirm(`Advance order #${order.orderNumber} to "${this.getStatusText(nextStatus)}"?`)) return;

    this.updatingId = order._id || null;
    this.orderService.updateOrderStatus(order._id!, nextStatus).subscribe({
      next: (res) => {
        if (res.success) {
          order.orderStatus = nextStatus;
          this.calculateStats();
          this.applyFilters();
        }
        this.updatingId = null;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Status update failed:', err);
        alert('Failed to update order status');
        this.updatingId = null;
        this.cdr.detectChanges();
      }
    });
  }

  cancelOrder(order: Order) {
    if (!confirm(`Cancel order #${order.orderNumber}?`)) return;
    this.updatingId = order._id || null;
    this.orderService.updateOrderStatus(order._id!, 'cancelled').subscribe({
      next: (res) => {
        if (res.success) {
          order.orderStatus = 'cancelled';
          this.calculateStats();
          this.applyFilters();
        }
        this.updatingId = null;
        this.cdr.detectChanges();
      },
      error: () => {
        alert('Failed to cancel order');
        this.updatingId = null;
        this.cdr.detectChanges();
      }
    });
  }

  /* =========================
     HELPERS
  ========================== */
  getStatusText(status: string): string {
    const map: Record<string, string> = {
      pending: 'Pending',
      confirmed: 'Confirmed',
      preparing: 'Preparing',
      out_for_delivery: 'Out for Delivery',
      delivered: 'Delivered',
      cancelled: 'Cancelled'
    };
    return map[status] || status;
  }

  getStatusClasses(status: string): string {
    const map: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      preparing: 'bg-purple-100 text-purple-800',
      out_for_delivery: 'bg-indigo-100 text-indigo-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return map[status] || 'bg-gray-100 text-gray-800';
  }

  formatDate(date: any): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  }

  formatTime(date: any): string {
    if (!date) return '';
    return new Date(date).toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit'
    });
  }

  getItemNames(items: any[]): string {
    return items.map(i => i.name).join(', ');
  }

  getDeliveryAddressStr(addr: any): string {
    if (!addr) return '—';
    return [addr.street, addr.city, addr.state, addr.zipCode, addr.landmark]
      .filter(Boolean).join(', ');
  }

  canAdvance(order: Order): boolean {
    return !['delivered', 'cancelled'].includes(order.orderStatus);
  }

  canCancel(order: Order): boolean {
    return ['pending', 'confirmed'].includes(order.orderStatus);
  }
}
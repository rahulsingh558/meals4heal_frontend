import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { OrderService, OrderStats, BestSellingItem, Order } from '../../../services/order.service';
import { environment } from '../../../../environments/environment';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-dashboard.html',
})
export class AdminDashboard implements OnInit, OnDestroy {
  isBrowser = false;

  /* =========================
     LIVE ORDER STATS
  ========================== */
  orderStats: OrderStats = {
    totalOrders: 0, periodOrders: 0, totalRevenue: 0,
    periodRevenue: 0, avgOrderValue: 0, statusBreakdown: []
  };
  bestSelling: BestSellingItem[] = [];
  recentOrders: Order[] = [];
  statsLoading = true;

  /* =========================
     SYSTEM STATS (live)
  ========================== */
  systemStats = {
    totalUsers: 0, serverLoad: 0, memoryUsed: 0, memoryTotal: 0,
    memoryPercent: 0, uptime: 0, responseTime: 0, cpus: 1
  };
  systemStatsLoading = true;
  systemStatsError = '';

  /* =========================
     CHART DATA (from API)
  ========================== */
  revenueChart: { label: string; revenue: number; orders: number }[] = [];
  maxRevenue = 1;
  revenuePolylinePoints = '';

  private refreshTimer: any;

  constructor(
    private orderService: OrderService,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit() {
    if (this.isBrowser) {
      this.loadDashboardData();
      this.startSystemStatsPolling();
      this.refreshTimer = setInterval(() => this.loadDashboardData(), 60000);
    }
  }

  ngOnDestroy() {
    clearInterval(this.refreshTimer);
  }

  /* =========================
     LOAD ORDER METRICS
  ========================== */
  loadDashboardData() {
    this.statsLoading = true;

    // Summary stats (7-day period)
    this.orderService.getOrderStats('7d').subscribe({
      next: (res) => {
        if (res.success) this.orderStats = res.stats;
        this.statsLoading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.statsLoading = false; this.cdr.detectChanges(); }
    });

    // Best selling items
    this.orderService.getBestSellingItems(5).subscribe({
      next: (res) => { if (res.success) this.bestSelling = res.bestSelling; this.cdr.detectChanges(); },
      error: () => {}
    });

    // Recent 5 orders
    this.orderService.getAllOrders({ limit: 5, sortBy: '-createdAt' }).subscribe({
      next: (res) => {
        if (res.success) this.recentOrders = res.orders;
        this.cdr.detectChanges();
      },
      error: () => {}
    });

    // Revenue chart (last 7 days)
    this.orderService.getRevenueData('7d', 'day').subscribe({
      next: (res) => {
        if (res.success) {
          this.revenueChart = res.revenueData.map(d => ({
            label: `${d._id.day}/${d._id.month}`,
            revenue: d.revenue,
            orders: d.orders
          }));
          this.maxRevenue = Math.max(1, ...this.revenueChart.map(r => r.revenue));
          this.buildRevenuePolyline();
        }
        this.cdr.detectChanges();
      },
      error: () => {}
    });
  }

  buildRevenuePolyline() {
    if (!this.revenueChart.length) { this.revenuePolylinePoints = ''; return; }
    const step = 80;
    this.revenuePolylinePoints = this.revenueChart
      .map((p, i) => `${i * step + 40},${160 - (p.revenue / this.maxRevenue) * 120}`)
      .join(' ');
  }

  /* =========================
     SYSTEM STATS POLLING
  ========================== */
  startSystemStatsPolling() {
    this.fetchSystemStats();
    setInterval(() => this.fetchSystemStats(), 15000);
  }

  fetchSystemStats() {
    this.http.get<{ success: boolean; stats: any }>(`${environment.apiUrl}/admin/system-stats`).subscribe({
      next: (res) => {
        if (res.success) { this.systemStats = res.stats; this.systemStatsError = ''; }
        this.systemStatsLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.systemStatsError = 'Could not load stats';
        this.systemStatsLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  /* =========================
     HELPERS
  ========================== */
  formatUptime(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }

  getLoadColor(percent: number): string {
    if (percent < 50) return 'bg-green-500';
    if (percent < 80) return 'bg-yellow-500';
    return 'bg-red-500';
  }

  getLoadTextColor(percent: number): string {
    if (percent < 50) return 'text-green-600';
    if (percent < 80) return 'text-yellow-600';
    return 'text-red-600';
  }

  getStatusText(status: string): string {
    const map: Record<string, string> = {
      pending: 'Pending', confirmed: 'Confirmed', preparing: 'Preparing',
      out_for_delivery: 'Out for Delivery', delivered: 'Delivered', cancelled: 'Cancelled'
    };
    return map[status] || status;
  }

  getStatusBadgeClass(status: string): string {
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

  formatDate(d: any): string {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  }

  get pendingCount(): number {
    return (this.orderStats.statusBreakdown || [])
      .filter(s => ['pending', 'confirmed', 'preparing'].includes(s._id))
      .reduce((sum, s) => sum + s.count, 0);
  }
}
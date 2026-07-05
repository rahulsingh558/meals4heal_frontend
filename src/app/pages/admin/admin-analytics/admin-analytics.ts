import { Component, OnInit, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface DayRevenue {
  _id: { year: number; month: number; day: number };
  revenue: number;
  orders: number;
}

interface StatusEntry { _id: string; count: number; }
interface BestSellingItem { _id: string; totalSold: number; totalRevenue: number; }

interface AnalyticsSummary {
  totalOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
  periodOrders: number;
  periodRevenue: number;
  days: number;
}

interface Analytics {
  revenueByDay: DayRevenue[];
  statusBreakdown: StatusEntry[];
  bestSelling: BestSellingItem[];
  summary: AnalyticsSummary;
}

@Component({
  selector: 'app-admin-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-analytics.html',
})
export class AdminAnalyticsComponent implements OnInit {
  loading = true;
  error = '';
  selectedDays = 30;
  Math = Math; // expose to template

  analytics: Analytics = {
    revenueByDay: [],
    statusBreakdown: [],
    bestSelling: [],
    summary: { totalOrders: 0, totalRevenue: 0, avgOrderValue: 0, periodOrders: 0, periodRevenue: 0, days: 30 }
  };

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.loadAnalytics();
    }
  }

  loadAnalytics() {
    this.loading = true;
    this.error = '';
    this.http.get<{ success: boolean; analytics: Analytics }>(
      `${environment.apiUrl}/admin/analytics?days=${this.selectedDays}`
    ).subscribe({
      next: (res) => {
        if (res.success) this.analytics = res.analytics;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Analytics error:', err);
        this.error = 'Failed to load analytics data.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  onPeriodChange() {
    this.loadAnalytics();
  }

  /* ============================
     CHART HELPERS
  ============================= */
  get maxRevenue(): number {
    return Math.max(1, ...this.analytics.revenueByDay.map(d => d.revenue));
  }

  get maxOrders(): number {
    return Math.max(1, ...this.analytics.revenueByDay.map(d => d.orders));
  }

  /** Format a DayRevenue _id into a short label */
  dayLabel(d: DayRevenue): string {
    return `${d._id.day}/${d._id.month}`;
  }

  /** SVG polyline points for the orders line chart */
  getRevenueLinePoints(): string {
    const data = this.analytics.revenueByDay;
    if (!data.length) return '';
    const step = Math.min(380 / Math.max(data.length - 1, 1), 40);
    return data.map((d, i) => {
      const x = i * step + 20;
      const y = 160 - (d.revenue / this.maxRevenue) * 120;
      return `${x},${y}`;
    }).join(' ');
  }

  getOrdersLinePoints(): string {
    const data = this.analytics.revenueByDay;
    if (!data.length) return '';
    const step = Math.min(380 / Math.max(data.length - 1, 1), 40);
    return data.map((d, i) => {
      const x = i * step + 20;
      const y = 160 - (d.orders / this.maxOrders) * 120;
      return `${x},${y}`;
    }).join(' ');
  }

  /* Status display */
  statusLabel(s: string): string {
    const map: Record<string, string> = {
      pending: 'Pending', confirmed: 'Confirmed', preparing: 'Preparing',
      out_for_delivery: 'Out for Delivery', delivered: 'Delivered', cancelled: 'Cancelled'
    };
    return map[s] || s;
  }

  statusColor(s: string): string {
    const map: Record<string, string> = {
      pending: '#f59e0b', confirmed: '#3b82f6', preparing: '#8b5cf6',
      out_for_delivery: '#6366f1', delivered: '#10b981', cancelled: '#ef4444'
    };
    return map[s] || '#6b7280';
  }

  get totalStatusCount(): number {
    return this.analytics.statusBreakdown.reduce((s, x) => s + x.count, 0);
  }

  statusPercent(count: number): number {
    const t = this.totalStatusCount;
    return t > 0 ? Math.round((count / t) * 100) : 0;
  }

  get maxBestSelling(): number {
    return Math.max(1, ...this.analytics.bestSelling.map(b => b.totalSold));
  }
}
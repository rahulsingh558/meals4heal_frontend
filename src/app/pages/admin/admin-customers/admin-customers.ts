import { Component, OnInit, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface Customer {
  _id: string;
  name: string;
  email: string;
  phone: string;
  ordersCount: number;
  totalSpent: number;
  lastOrder: string | null;
  status: 'active' | 'inactive';
  memberSince: string;
}

@Component({
  selector: 'app-admin-customers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-customers.html',
})
export class AdminCustomersComponent implements OnInit {
  searchQuery = '';
  customers: Customer[] = [];
  loading = true;
  error = '';

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.loadCustomers();
    }
  }

  loadCustomers() {
    this.loading = true;
    this.error = '';
    this.http.get<{ success: boolean; customers: Customer[] }>(
      `${environment.apiUrl}/admin/customers`
    ).subscribe({
      next: (res) => {
        if (res.success) {
          this.customers = res.customers;
        }
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load customers:', err);
        this.error = 'Failed to load customers. Please try again.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  get filteredCustomers() {
    if (!this.searchQuery) return this.customers;
    const query = this.searchQuery.toLowerCase();
    return this.customers.filter(c =>
      c.name.toLowerCase().includes(query) ||
      c.email.toLowerCase().includes(query) ||
      (c.phone && c.phone.includes(query))
    );
  }

  get totalCustomers() { return this.customers.length; }

  get activeCustomers() {
    return this.customers.filter(c => c.status === 'active').length;
  }

  get totalRevenue() {
    return this.customers.reduce((sum, c) => sum + c.totalSpent, 0);
  }

  formatDate(dateStr: string | null): string {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  }
}
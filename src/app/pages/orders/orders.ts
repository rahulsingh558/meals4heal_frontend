import { Component, Inject, PLATFORM_ID, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { OrderService, Order } from '../../services/order.service';
import { AuthService } from '../../services/auth.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './orders.html',
})
export class OrdersPage implements OnInit {
  orders: Order[] = [];
  isBrowser = false;
  loading = true;
  userId: string | null = null;

  // Address Modal State
  showAddressModal = false;
  selectedOrder: Order | null = null;
  editedAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    landmark: string;
    lat?: number;
    lng?: number;
  } = {
    street: '',
    city: '',
    state: '',
    zipCode: '',
    landmark: ''
  };

  // GPS Location State
  isDetectingLocation = false;
  locationDetected = false;
  locationError = '';

  // Help Modal State
  showHelpModal = false;

  constructor(
    @Inject(PLATFORM_ID) platformId: Object,
    private orderService: OrderService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    if (this.isBrowser) {
      if (!this.authService.isAuthenticated()) {
        this.router.navigate(['/login'], { queryParams: { returnUrl: '/orders' } });
        return;
      }
      const currentUser = this.authService.getCurrentUser();
      this.userId = currentUser ? currentUser.id : localStorage.getItem('userId');
      this.loadOrders();
    }
  }

  loadOrders() {
    this.loading = true;
    const filters: any = { limit: 50, sortBy: '-createdAt' };
    if (this.userId) {
      filters.userId = this.userId;
    }

    this.orderService.getAllOrders(filters).subscribe({
      next: (response) => {
        if (response.success) {
          this.orders = response.orders;
        } else {
          this.orders = [];
        }
      },
      error: (error) => {
        console.error('Error loading orders:', error);
        this.orders = [];
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // Navigation
  openTrackModal(order: Order) {
    this.router.navigate(['/track-order', order._id || order.orderNumber]);
  }

  // Address Logic
  openAddressModal(order: Order) {
    if (this.canUpdateAddress(order.orderStatus)) {
      this.selectedOrder = order;
      this.editedAddress = {
        street: order.deliveryAddress.street,
        city: order.deliveryAddress.city,
        state: order.deliveryAddress.state,
        zipCode: order.deliveryAddress.zipCode,
        landmark: order.deliveryAddress.landmark || '',
        lat: order.deliveryAddress.lat,
        lng: order.deliveryAddress.lng
      };
      this.locationDetected = !!(order.deliveryAddress.lat && order.deliveryAddress.lng);
      this.locationError = '';
      this.showAddressModal = true;
    }
  }

  closeAddressModal() {
    this.showAddressModal = false;
    this.selectedOrder = null;
    this.locationDetected = false;
    this.locationError = '';
    this.isDetectingLocation = false;
  }

  /**
   * Detect user's GPS location using browser geolocation API
   */
  detectLocation() {
    if (!this.isBrowser || !navigator.geolocation) {
      this.locationError = 'Geolocation is not supported by your browser';
      return;
    }

    this.isDetectingLocation = true;
    this.locationError = '';

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.editedAddress.lat = position.coords.latitude;
        this.editedAddress.lng = position.coords.longitude;
        this.locationDetected = true;
        this.isDetectingLocation = false;
        this.locationError = '';
        this.cdr.detectChanges();
      },
      (error) => {
        this.isDetectingLocation = false;
        switch (error.code) {
          case error.PERMISSION_DENIED:
            this.locationError = 'Location access denied. Please allow location access in your browser settings.';
            break;
          case error.POSITION_UNAVAILABLE:
            this.locationError = 'Location unavailable. Please try again.';
            break;
          case error.TIMEOUT:
            this.locationError = 'Location request timed out. Please try again.';
            break;
          default:
            this.locationError = 'Unable to detect location. Please try again.';
        }
        this.cdr.detectChanges();
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }

  updateAddress() {
    if (!this.selectedOrder || !this.selectedOrder._id) return;

    this.loading = true;
    this.orderService.updateOrder(this.selectedOrder._id, {
      deliveryAddress: this.editedAddress
    }).subscribe({
      next: (res) => {
        this.loading = false;
        if (res.success) {
          alert('Address updated successfully');
          this.closeAddressModal();
          this.loadOrders();
        }
      },
      error: (err) => {
        this.loading = false;
        console.error('Error updating address', err);
        alert('Failed to update address');
      }
    });
  }

  // Help Logic
  openHelpModal(order: Order) {
    this.selectedOrder = order;
    this.showHelpModal = true;
  }

  closeHelpModal() {
    this.showHelpModal = false;
    this.selectedOrder = null;
  }

  // UI Helpers
  getStatusClass(status: string): string {
    const statusClasses: { [key: string]: string } = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'confirmed': 'bg-blue-100 text-blue-800',
      'preparing': 'bg-purple-100 text-purple-800',
      'out_for_delivery': 'bg-indigo-100 text-indigo-800',
      'delivered': 'bg-green-100 text-green-800',
      'cancelled': 'bg-red-100 text-red-800'
    };
    return statusClasses[status] || 'bg-gray-100 text-gray-800';
  }

  getStatusText(status: string): string {
    const statusMap: { [key: string]: string } = {
      'pending': 'Pending',
      'confirmed': 'Confirmed',
      'preparing': 'Preparing',
      'out_for_delivery': 'Out for Delivery',
      'delivered': 'Delivered',
      'cancelled': 'Cancelled'
    };
    return statusMap[status] || status;
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

  canUpdateAddress(status: string): boolean {
    return status === 'pending' || status === 'confirmed';
  }
}
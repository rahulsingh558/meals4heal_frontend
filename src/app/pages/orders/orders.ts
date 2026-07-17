import { Component, Inject, PLATFORM_ID, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { OrderService, Order } from '../../services/order.service';
import { AuthService } from '../../services/auth.service';
import { ReviewService } from '../../services/review.service';
import { CartService } from '../../services/cart.service';
import { ToastService } from '../../services/toast.service';

type OrderFilter = 'all' | 'active' | 'delivered' | 'cancelled';

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

  // Filter & Search State
  activeFilter: OrderFilter = 'all';
  searchTerm = '';

  // Order progression steps (excludes cancelled which is a terminal branch)
  readonly progressSteps = ['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered'];

  // Order Details Modal State
  showDetailsModal = false;
  detailsOrder: Order | null = null;

  // Cancel Order Modal State
  showCancelModal = false;
  cancelOrderTarget: Order | null = null;
  cancelReason = '';
  isCancelling = false;

  // Reorder State
  reorderingId: string | null = null;

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

  // Review Modal State
  showReviewModal = false;
  reviewOrder: Order | null = null;
  reviewState: {
    [foodId: string]: {
      rating: number;
      comment: string;
      isSubmitting: boolean;
      isSubmitted: boolean;
      error: string;
    }
  } = {};

  constructor(
    @Inject(PLATFORM_ID) platformId: Object,
    private orderService: OrderService,
    private authService: AuthService,
    private reviewService: ReviewService,
    private cartService: CartService,
    private toast: ToastService,
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

  // ---- Filtering & Search ----
  setFilter(filter: OrderFilter) {
    this.activeFilter = filter;
  }

  get filteredOrders(): Order[] {
    let list = this.orders;

    if (this.activeFilter === 'active') {
      list = list.filter(o => !['delivered', 'cancelled'].includes(o.orderStatus));
    } else if (this.activeFilter === 'delivered') {
      list = list.filter(o => o.orderStatus === 'delivered');
    } else if (this.activeFilter === 'cancelled') {
      list = list.filter(o => o.orderStatus === 'cancelled');
    }

    const term = this.searchTerm.trim().toLowerCase();
    if (term) {
      list = list.filter(o =>
        String(o.orderNumber).includes(term) ||
        o.items.some(i => i.name.toLowerCase().includes(term))
      );
    }
    return list;
  }

  filterCount(filter: OrderFilter): number {
    if (filter === 'all') return this.orders.length;
    if (filter === 'active') return this.orders.filter(o => !['delivered', 'cancelled'].includes(o.orderStatus)).length;
    if (filter === 'delivered') return this.orders.filter(o => o.orderStatus === 'delivered').length;
    return this.orders.filter(o => o.orderStatus === 'cancelled').length;
  }

  // ---- Summary Stats ----
  get activeOrdersCount(): number {
    return this.orders.filter(o => !['delivered', 'cancelled'].includes(o.orderStatus)).length;
  }

  get deliveredOrdersCount(): number {
    return this.orders.filter(o => o.orderStatus === 'delivered').length;
  }

  get totalSpent(): number {
    return this.orders
      .filter(o => o.orderStatus !== 'cancelled')
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  }

  itemCount(order: Order): number {
    return order.items.reduce((sum, i) => sum + i.quantity, 0);
  }

  // ---- Order Details ----
  openDetailsModal(order: Order) {
    this.detailsOrder = order;
    this.showDetailsModal = true;
  }

  closeDetailsModal() {
    this.showDetailsModal = false;
    this.detailsOrder = null;
  }

  printOrder() {
    if (this.isBrowser) {
      window.print();
    }
  }

  // ---- Order Progress Timeline ----
  currentStepIndex(status: string): number {
    return this.progressSteps.indexOf(status);
  }

  isStepComplete(order: Order, step: string): boolean {
    if (order.orderStatus === 'cancelled') return false;
    return this.currentStepIndex(order.orderStatus) >= this.progressSteps.indexOf(step);
  }

  isStepActive(order: Order, step: string): boolean {
    return order.orderStatus === step;
  }

  // ---- Cancel Order ----
  canCancel(status: string): boolean {
    return status === 'pending' || status === 'confirmed';
  }

  openCancelModal(order: Order) {
    this.cancelOrderTarget = order;
    this.cancelReason = '';
    this.showCancelModal = true;
  }

  closeCancelModal() {
    this.showCancelModal = false;
    this.cancelOrderTarget = null;
    this.cancelReason = '';
    this.isCancelling = false;
  }

  confirmCancel() {
    if (!this.cancelOrderTarget || !this.cancelOrderTarget._id) return;

    this.isCancelling = true;
    this.orderService.updateOrderStatus(this.cancelOrderTarget._id, 'cancelled', this.cancelReason.trim() || undefined)
      .subscribe({
        next: (res) => {
          this.isCancelling = false;
          if (res.success) {
            this.toast.success('Order Cancelled', 'Your order has been cancelled.');
            this.closeCancelModal();
            this.loadOrders();
          } else {
            this.toast.error('Cancellation Failed', res.message || 'Please try again.');
          }
        },
        error: (err) => {
          this.isCancelling = false;
          console.error('Error cancelling order', err);
          this.toast.error('Cancellation Failed', 'Unable to cancel order. Please try again.');
        }
      });
  }

  // ---- Reorder ----
  reorder(order: Order) {
    if (!order._id) return;

    this.reorderingId = order._id;
    const addCalls = order.items.map(item =>
      this.cartService.addToCart({
        menuItemId: item.foodId,
        name: item.name,
        price: item.basePrice,
        quantity: item.quantity,
        customizations: item.addons && item.addons.length ? { addons: item.addons } : undefined
      })
    );

    forkJoin(addCalls).subscribe({
      next: () => {
        this.reorderingId = null;
        this.toast.success('Added to Cart', 'Items from your order have been added to the cart.');
        this.router.navigate(['/cart']);
      },
      error: (err) => {
        this.reorderingId = null;
        console.error('Error reordering', err);
        this.toast.error('Reorder Failed', 'Could not add items to cart. Please try again.');
      }
    });
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

  // Review Logic
  openReviewModal(order: Order) {
    this.reviewOrder = order;
    this.reviewState = {};
    order.items.forEach(item => {
      this.reviewState[item.foodId] = {
        rating: 5,
        comment: '',
        isSubmitting: false,
        isSubmitted: false,
        error: ''
      };
    });
    this.showReviewModal = true;
  }

  closeReviewModal() {
    this.showReviewModal = false;
    this.reviewOrder = null;
  }

  setRating(foodId: string, rating: number) {
    if (this.reviewState[foodId] && !this.reviewState[foodId].isSubmitted) {
      this.reviewState[foodId].rating = rating;
    }
  }

  submitReview(foodId: string) {
    if (!this.reviewOrder || !this.reviewOrder._id) return;
    const state = this.reviewState[foodId];
    if (state.isSubmitted || state.isSubmitting) return;

    state.isSubmitting = true;
    state.error = '';

    this.reviewService.submitReview({
      foodId,
      orderId: this.reviewOrder._id,
      rating: state.rating,
      comment: state.comment
    }).subscribe({
      next: (res) => {
        state.isSubmitting = false;
        if (res.success) {
          state.isSubmitted = true;
        } else {
          state.error = res.message || 'Failed to submit review';
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        state.isSubmitting = false;
        state.error = err.error?.message || 'Failed to submit review';
        this.cdr.detectChanges();
      }
    });
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

  getPaymentStatusClass(status: string): string {
    const classes: { [key: string]: string } = {
      'paid': 'bg-green-100 text-green-800',
      'pending': 'bg-yellow-100 text-yellow-800',
      'failed': 'bg-red-100 text-red-800',
      'refunded': 'bg-blue-100 text-blue-800'
    };
    return classes[status] || 'bg-gray-100 text-gray-800';
  }

  getPaymentStatusText(status: string): string {
    const map: { [key: string]: string } = {
      'paid': 'Paid',
      'pending': 'Payment Pending',
      'failed': 'Payment Failed',
      'refunded': 'Refunded'
    };
    return map[status] || status;
  }

  getPaymentMethodText(method: string): string {
    const map: { [key: string]: string } = {
      'cod': 'Cash on Delivery',
      'online': 'Online Payment',
      'card': 'Card',
      'upi': 'UPI'
    };
    return map[method] || method;
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
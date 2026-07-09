import { Component, Inject, PLATFORM_ID, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { CartService, CartItem } from '../../services/cart.service';
import { AddressService } from '../../services/address.service';
import { OrderService, Order, OrderItem } from '../../services/order.service';
import { Address } from '../../pages/address/address';

declare var Razorpay: any;

interface PaymentMethod {
  id: string;
  name: string;
  icon: string;
  description: string;
}

interface OnlinePaymentMethod {
  id: string;
  name: string;
  icon: string;
  description: string;
}

@Component({
  standalone: true,
  templateUrl: './checkout.html',
  imports: [CommonModule, FormsModule],
})
export class Checkout implements OnInit {
  selectedAddress: Address | null = null;
  items: CartItem[] = [];
  isPlacingOrder = false;
  isBrowser = false;
  deliveryInstructions = '';
  paymentMethod = 'cod'; // 'cod' or 'online'

  // User info
  userId: string | null = null;
  userName: string | null = null;
  userEmail: string | null = null;
  userPhone: string | null = null;

  // Online payment fields
  showOnlinePaymentForm = false;
  onlinePaymentMethod = 'upi'; // 'upi', 'card', 'netbanking', 'wallet'
  upiId = '';
  cardNumber = '';
  cardExpiry = '';
  cardCvv = '';
  cardName = '';
  walletType = 'paytm';
  selectedBank = 'hdfc';
  isProcessingPayment = false;

  // Geolocation for tracking
  userLocation: { lat: number; lng: number } | null = null;
  locationError = '';
  isRequestingLocation = false;
  locationCaptured = false;

  // Toast Notification
  toastMessage = '';
  toastType: 'success' | 'error' = 'error';
  toastTimeout: any;

  // Payment methods
  paymentMethods: PaymentMethod[] = [
    { id: 'cod', name: 'Cash on Delivery', icon: '💵', description: 'Pay when you receive' },
    { id: 'online', name: 'Pay Online', icon: '💳', description: 'Card, UPI, Net Banking' }
  ];

  onlinePaymentMethods: OnlinePaymentMethod[] = [
    { id: 'upi', name: 'UPI', icon: '📱', description: 'Google Pay, PhonePe, Paytm' },
    { id: 'card', name: 'Credit/Debit Card', icon: '💳', description: 'Visa, Mastercard, RuPay' },
    { id: 'netbanking', name: 'Net Banking', icon: '🏦', description: 'All major banks' },
    { id: 'wallet', name: 'Wallet', icon: '👛', description: 'Paytm, PhonePe, Amazon Pay' },
  ];

  banks = [
    { id: 'hdfc', name: 'HDFC Bank' },
    { id: 'icici', name: 'ICICI Bank' },
    { id: 'sbi', name: 'State Bank of India' },
    { id: 'axis', name: 'Axis Bank' },
    { id: 'kotak', name: 'Kotak Mahindra Bank' },
  ];

  wallets = [
    { id: 'paytm', name: 'Paytm', icon: '📱' },
    { id: 'phonepe', name: 'PhonePe', icon: '📱' },
    { id: 'amazonpay', name: 'Amazon Pay', icon: '📦' },
    { id: 'gpay', name: 'Google Pay', icon: '📱' },
  ];

  constructor(
    private cartService: CartService,
    private addressService: AddressService,
    private orderService: OrderService,
    public router: Router,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    // Check if user is logged in
    if (this.isBrowser) {
      const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';

      if (!isLoggedIn) {
        this.showToast('Please login to place an order', 'error');
        setTimeout(() => {
          this.router.navigate(['/auth'], { queryParams: { returnUrl: '/checkout' } });
        }, 1500);
        return;
      }

      // Get user details
      this.userId = localStorage.getItem('userId');
      this.userName = localStorage.getItem('userName');
      this.userEmail = localStorage.getItem('userEmail') || '';
      this.userPhone = localStorage.getItem('userPhone') || '';
    }

    // Get cart items
    this.cartService.cart$.subscribe(cart => {
      this.items = cart.items;
      this.cdr.detectChanges();
      if (cart.items.length === 0 && !this.isPlacingOrder) {
        this.router.navigate(['/cart']);
      }
    });

    // Get selected address
    if (this.isBrowser) {
      this.selectedAddress = this.addressService.getSelectedAddress();

      // If no address selected, redirect to address select page
      if (!this.selectedAddress) {
        this.router.navigate(['/address-select']);
      }

      // Auto-request location for delivery tracking
      this.requestLocation();
    }
  }

  /**
   * Request user's exact location for delivery tracking
   */
  requestLocation(): void {
    if (!this.isBrowser || !navigator.geolocation) {
      this.locationError = 'Geolocation is not supported by your browser';
      return;
    }

    this.isRequestingLocation = true;
    this.locationError = '';

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.userLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        this.locationCaptured = true;
        this.isRequestingLocation = false;
        this.cdr.detectChanges();
      },
      (error) => {
        this.isRequestingLocation = false;
        switch (error.code) {
          case error.PERMISSION_DENIED:
            this.locationError = 'Location access denied. Delivery tracking may be less accurate.';
            break;
          case error.POSITION_UNAVAILABLE:
            this.locationError = 'Location unavailable.';
            break;
          case error.TIMEOUT:
            this.locationError = 'Location request timed out.';
            break;
          default:
            this.locationError = 'Unable to get location.';
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

  // Helper method to get payment method name
  getPaymentMethodName(): string {
    const method = this.paymentMethods.find(m => m.id === this.paymentMethod);
    return method ? method.name : '';
  }

  // Helper method to get online payment method name
  getOnlinePaymentMethodName(): string {
    const method = this.onlinePaymentMethods.find(m => m.id === this.onlinePaymentMethod);
    return method ? method.name : '';
  }

  // Helper method to get wallet name
  getWalletName(): string {
    const wallet = this.wallets.find(w => w.id === this.walletType);
    return wallet ? wallet.name : '';
  }

  isFormValid(): boolean {
    // Basic validation
    if (!this.selectedAddress || this.items.length === 0) {
      return false;
    }

    // Additional validation for online payment
    if (this.paymentMethod === 'online') {
      return this.isOnlinePaymentValid();
    }

    return true;
  }

  isOnlinePaymentValid(): boolean {
    return true; // Form is now managed by Razorpay
  }

  getGrandTotal(): number {
    return this.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
  }

  getDeliveryCharge(): number {
    return this.getGrandTotal() < 299 ? 40 : 0;
  }

  getGst(): number {
    return Math.round(this.getGrandTotal() * 0.05);
  }

  getTotalAmount(): number {
    return this.getGrandTotal() + this.getDeliveryCharge() + this.getGst();
  }

  changeAddress() {
    this.router.navigate(['/address-select']);
  }

  onPaymentMethodChange() {
    if (this.paymentMethod === 'online') {
      this.showOnlinePaymentForm = true;
    } else {
      this.showOnlinePaymentForm = false;
      this.isProcessingPayment = false;
    }
  }

  generateUpiId() {
    const sampleUpiIds = [
      'user@oksbi',
      'user@ybl',
      'user@upi',
      'user@paytm'
    ];
    this.upiId = sampleUpiIds[Math.floor(Math.random() * sampleUpiIds.length)];
  }

  formatCardNumber(event: any) {
    let value = event.target.value.replace(/\D/g, '');
    if (value.length > 16) value = value.substring(0, 16);
    value = value.replace(/(\d{4})(?=\d)/g, '$1 ');
    this.cardNumber = value;
  }

  formatExpiry(event: any) {
    let value = event.target.value.replace(/\D/g, '');
    if (value.length > 4) value = value.substring(0, 4);
    if (value.length > 2) {
      value = value.substring(0, 2) + '/' + value.substring(2);
    }
    this.cardExpiry = value;
  }

  processOnlinePayment() {
    this.placeOrder();
  }

  placeOrder() {
    if (!this.isBrowser || !this.isFormValid()) return;

    this.isPlacingOrder = true;

    // Build order object for API
    const orderData: Partial<Order> = {
      userId: this.userId || undefined,
      customerName: this.userName || this.selectedAddress?.name || '',
      customerEmail: this.userEmail || '',
      customerPhone: this.userPhone || this.selectedAddress?.phone || '',
      items: this.items.map(item => {
        const orderItem: OrderItem = {
          foodId: item.menuItemId || '',
          name: item.name,
          basePrice: item.price,
          quantity: item.quantity,
          addons: item.customizations?.addons || [],
          totalPrice: item.price * item.quantity
        };
        return orderItem;
      }),
      deliveryAddress: {
        street: this.selectedAddress?.addressLine1 || '',
        city: this.selectedAddress?.city || '',
        state: this.selectedAddress?.state || '',
        zipCode: this.selectedAddress?.pincode || '',
        landmark: this.selectedAddress?.landmark,
        lat: this.userLocation?.lat,
        lng: this.userLocation?.lng
      },
      subtotal: this.getGrandTotal(),
      deliveryCharge: this.getDeliveryCharge(),
      tax: this.getGst(),
      discount: 0,
      totalAmount: this.getTotalAmount(),
      paymentMethod: this.paymentMethod,
      paymentStatus: 'pending', // Initially pending until Razorpay success
      specialInstructions: this.deliveryInstructions || undefined
    };

    // Call backend API to create order
    this.orderService.createOrder(orderData as Order).subscribe({
      next: (response) => {
        if (response.success) {
          if (this.paymentMethod === 'online') {
            this.initiateRazorpayPayment(response.order);
          } else {
            // Clear cart
            this.cartService.clearCart();

            // Navigate to orders page with success
            this.router.navigate(['/orders']).then(() => {
              this.showToast('Order placed successfully! You will receive a confirmation call shortly.', 'success');
            });
          }
        } else {
          this.showToast('Failed to place order. Please try again.', 'error');
          this.isPlacingOrder = false;
        }
      },
      error: (error) => {
        console.error('Error placing order:', error);
        this.showToast('Error placing order. Please try again.', 'error');
        this.isPlacingOrder = false;
      }
    });
  }

  private getFormattedAddress(): string {
    if (!this.selectedAddress) return '';

    const parts = [
      this.selectedAddress.addressLine1,
      this.selectedAddress.addressLine2,
      this.selectedAddress.city,
      this.selectedAddress.state,
      this.selectedAddress.pincode,
      this.selectedAddress.landmark
    ].filter(part => part && part.trim() !== '');

    return parts.join(', ');
  }

  initiateRazorpayPayment(order: Order) {
    if (!order._id) return;
    
    this.isPlacingOrder = true;
    this.orderService.createPaymentOrder(order._id).subscribe({
      next: (res) => {
        if (res.success) {
          const options = {
            key: res.key,
            amount: res.order.amount,
            currency: res.order.currency,
            name: "Meals4Heal",
            description: "Food Delivery Order",
            order_id: res.order.id,
            handler: (response: any) => {
              this.verifyRazorpayPayment(response, order._id!);
            },
            prefill: {
              name: this.userName || this.selectedAddress?.name || "",
              email: this.userEmail || "",
              contact: this.userPhone || this.selectedAddress?.phone || ""
            },
            theme: {
              color: "#16a34a"
            },
            modal: {
              ondismiss: () => {
                this.isPlacingOrder = false;
                this.showToast('Payment cancelled by user.', 'error');
              }
            }
          };
          
          const rzp = new Razorpay(options);
          rzp.on('payment.failed', (response: any) => {
             this.showToast('Payment Failed! ' + response.error.description, 'error');
             this.isPlacingOrder = false;
          });
          rzp.open();
        } else {
          this.showToast('Failed to initialize payment.', 'error');
          this.isPlacingOrder = false;
        }
      },
      error: (err) => {
        console.error('Payment order creation error', err);
        this.showToast('Could not start payment. Please try again.', 'error');
        this.isPlacingOrder = false;
      }
    });
  }

  verifyRazorpayPayment(response: any, orderId: string) {
    this.orderService.verifyPayment({
      razorpay_order_id: response.razorpay_order_id,
      razorpay_payment_id: response.razorpay_payment_id,
      razorpay_signature: response.razorpay_signature,
      orderId: orderId
    }).subscribe({
      next: (res) => {
        if (res.success) {
          this.cartService.clearCart();
          this.isPlacingOrder = false;
          this.router.navigate(['/orders']).then(() => {
            this.showToast('Payment successful! Order placed.', 'success');
          });
        } else {
          this.showToast('Payment verification failed.', 'error');
          this.isPlacingOrder = false;
        }
      },
      error: (err) => {
        console.error('Verification error', err);
        this.showToast('Payment verification failed.', 'error');
        this.isPlacingOrder = false;
      }
    });
  }

  showToast(message: string, type: 'success' | 'error' = 'error') {
    this.toastMessage = message;
    this.toastType = type;
    
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
    
    this.toastTimeout = setTimeout(() => {
      this.toastMessage = '';
    }, 4000);
  }
}
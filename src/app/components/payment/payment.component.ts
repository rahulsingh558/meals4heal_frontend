import { Component, Inject, PLATFORM_ID, OnInit } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

interface PaymentMethod {
  id: string;
  name: string;
  icon: string;
  description: string;
}

@Component({
  standalone: true,
  selector: 'app-payment',
  imports: [CommonModule, FormsModule],
  templateUrl: './payment.component.html',
})
export class PaymentComponent implements OnInit {
     getWalletName(): string {
    const wallet = this.wallets.find(w => w.id === this.walletType);
    return wallet ? wallet.name : '';
  }
  orderTotal = 0;
  selectedPaymentMethod = 'upi';
  upiId = '';
  cardNumber = '';
  cardExpiry = '';
  cardCvv = '';
  cardName = '';
  walletType = 'paytm';
  isProcessing = false;
  isBrowser = false;

  paymentMethods: PaymentMethod[] = [
    { id: 'upi', name: 'UPI', icon: '💳', description: 'Google Pay, PhonePe, Paytm' },
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

  selectedBank = 'hdfc';

  constructor(
    private router: Router,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    if (this.isBrowser) {
      // Get order total from localStorage or service
      const cartItems = JSON.parse(localStorage.getItem('cart') || '[]');
      this.orderTotal = cartItems.reduce((sum: number, item: any) => 
        sum + (item.totalPrice * item.quantity), 0);
      
      if (this.orderTotal === 0) {
        this.router.navigate(['/cart']);
      }
    }
  }

  // Get selected payment method
  get selectedMethod(): PaymentMethod {
    return this.paymentMethods.find(method => method.id === this.selectedPaymentMethod) || this.paymentMethods[0];
  }

  // Validate form based on payment method
  isFormValid(): boolean {
    switch (this.selectedPaymentMethod) {
      case 'upi':
        return this.upiId.trim().length > 0 && this.upiId.includes('@');
      case 'card':
        return this.cardNumber.trim().length >= 16 && 
               this.cardExpiry.trim().length === 5 &&
               this.cardCvv.trim().length >= 3 &&
               this.cardName.trim().length > 0;
      case 'netbanking':
        return true; // Bank is pre-selected
      case 'wallet':
        return true; // Wallet is pre-selected
      default:
        return false;
    }
  }

  // Process payment
  processPayment() {
    if (!this.isBrowser || !this.isFormValid()) return;

    this.isProcessing = true;

    // Simulate API call delay
    setTimeout(() => {
      this.isProcessing = false;
      
      // Save payment details to localStorage
      const paymentDetails = {
        method: this.selectedPaymentMethod,
        amount: this.orderTotal,
        status: 'success',
        timestamp: new Date().toISOString(),
        transactionId: 'TXN' + Date.now()
      };
      
      localStorage.setItem('lastPayment', JSON.stringify(paymentDetails));
      
      // Redirect to order success page
      this.router.navigate(['/order-success'], {
        state: { 
          transactionId: paymentDetails.transactionId,
          amount: this.orderTotal 
        }
      });
    }, 2000);
  }

  // Generate sample UPI ID
  generateUpiId() {
    const sampleUpiIds = [
      'user@oksbi',
      'user@ybl',
      'user@upi',
      'user@paytm'
    ];
    this.upiId = sampleUpiIds[Math.floor(Math.random() * sampleUpiIds.length)];
  }

  // Format card number
  formatCardNumber(event: any) {
    let value = event.target.value.replace(/\D/g, '');
    if (value.length > 16) value = value.substring(0, 16);
    
    // Add spaces every 4 digits
    value = value.replace(/(\d{4})(?=\d)/g, '$1 ');
    
    this.cardNumber = value;
  }

  // Format expiry date
  formatExpiry(event: any) {
    let value = event.target.value.replace(/\D/g, '');
    if (value.length > 4) value = value.substring(0, 4);
    
    // Add slash after 2 digits
    if (value.length > 2) {
      value = value.substring(0, 2) + '/' + value.substring(2);
    }
    
    this.cardExpiry = value;
  }

  // Back to checkout
  backToCheckout() {
    this.router.navigate(['/checkout']);
  }

  // Calculate GST (5%)
  getGst(): number {
    return Math.round(this.orderTotal * 0.05);
  }

  getDeliveryCharge(): number {
    return this.orderTotal < 299 ? 40 : 0;
  }

  // Get total with GST
  getTotalWithGst(): number {
    return this.orderTotal + this.getDeliveryCharge() + this.getGst();
  }
}
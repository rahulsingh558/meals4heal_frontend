import { Component, OnInit, ChangeDetectorRef, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CartService, Cart, CartItem } from '../../services/cart.service';
import { UserService } from '../../services/user.service';
import { OrderService } from '../../services/order.service';

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './cart.html',
})
export class CartPage implements OnInit {

  cart: Cart = { items: [], total: 0, itemCount: 0 };
  
  couponCode: string = '';
  discountAmount: number = 0;
  couponApplied: boolean = false;
  couponError: string = '';

  constructor(
    private cartService: CartService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private userService: UserService,
    private orderService: OrderService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  isBrowser = false;

  getGrandTotal(): number {
    return this.cart.total;
  }

  getDiscountedTotal(): number {
    return Math.max(0, this.cart.total - this.discountAmount);
  }

  applyCoupon() {
    this.couponError = '';
    
    if (!this.couponCode) {
      this.couponError = 'Please enter a coupon code';
      return;
    }
    
    if (this.couponCode.toUpperCase() === 'HEALTHY20') {
      const token = localStorage.getItem('token');
      if (!token || !this.isBrowser) {
        this.couponError = 'You must be logged in to use this coupon';
        return;
      }

      this.userService.getUserProfile().subscribe({
        next: (profileRes) => {
           const user = profileRes.user;
           if (!user.phone) {
             this.couponError = 'Please add a phone number to your profile to use this coupon';
             this.cdr.detectChanges();
             return;
           }
           
           this.orderService.getAllOrders({ userId: user.id }).subscribe({
             next: (orderRes) => {
               if (orderRes.total > 0) {
                 this.couponError = 'This coupon is only valid for your first order';
                 this.cdr.detectChanges();
                 return;
               }
               
               this.discountAmount = this.cart.total * 0.20;
               this.couponApplied = true;
               this.cdr.detectChanges();
             },
             error: () => {
               this.couponError = 'Failed to verify order history';
               this.cdr.detectChanges();
             }
           });
        },
        error: () => {
          this.couponError = 'You must be logged in to use this coupon';
          this.cdr.detectChanges();
        }
      });
    } else {
      this.couponError = 'Invalid coupon code';
      this.couponApplied = false;
      this.discountAmount = 0;
    }
  }

  removeCoupon() {
    this.couponCode = '';
    this.discountAmount = 0;
    this.couponApplied = false;
    this.couponError = '';
  }

  proceedToCheckout() {
    if (this.isBrowser) {
      const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
      if (isLoggedIn) {
        this.router.navigate(['/address-select']);
      } else {
        this.router.navigate(['/login'], { queryParams: { returnUrl: '/address-select' } });
      }
    }
  }

  ngOnInit() {
    // Subscribe to cart updates
    this.cartService.cart$.subscribe(cart => {
      this.cart = cart;
      this.cdr.detectChanges();
    });
  }

  increase(itemId: string) {
    const item = this.cart.items.find(i => (i._id || i.menuItemId) === itemId);
    if (item) {
      this.cartService.updateQuantity(itemId, item.quantity + 1).subscribe({
        next: () => this.cdr.detectChanges(),
        error: (err: any) => console.error('Error updating quantity:', err)
      });
    }
  }

  decrease(itemId: string) {
    const item = this.cart.items.find(i => (i._id || i.menuItemId) === itemId);
    if (item && item.quantity > 1) {
      this.cartService.updateQuantity(itemId, item.quantity - 1).subscribe({
        next: () => this.cdr.detectChanges(),
        error: (err: any) => console.error('Error updating quantity:', err)
      });
    }
  }

  remove(itemId: string) {
    this.cartService.removeItem(itemId).subscribe({
      next: () => this.cdr.detectChanges(),
      error: (err: any) => console.error('Error removing item:', err)
    });
  }

}

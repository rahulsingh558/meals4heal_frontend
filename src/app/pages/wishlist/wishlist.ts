import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { CartService } from '../../services/cart.service';
import { Router } from '@angular/router';


@Component({
  standalone: true,
  imports: [CommonModule],
  templateUrl: './wishlist.html',
})
export class Wishlist {
  isBrowser = false;
  isLoggedIn = false;

  wishlist: {
    id: number;
    name: string;
    basePrice: number;
    image?: string;
  }[] = [];

  constructor(
    private cartService: CartService,
    private router: Router,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);

    if (this.isBrowser) {
      this.isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';

      this.wishlist = JSON.parse(
        localStorage.getItem('wishlist') || '[]'
      );
    }
  }

  addToCart(item: {
    id: number;
    name: string;
    basePrice: number;
    image?: string;
  }) {
    this.cartService.addToCart({
      menuItemId: String(item.id),
      name: item.name,
      image: item.image,
      price: item.basePrice,
      quantity: 1,
      customizations: [],
    }).subscribe({
      next: (res: any) => console.log('Added to cart from wishlist', res),
      error: (err: any) => console.error('Error adding to cart from wishlist', err)
    });

    this.remove(item.id);
  }

  remove(id: number) {
    this.wishlist = this.wishlist.filter(item => item.id !== id);

    if (this.isBrowser) {
      localStorage.setItem('wishlist', JSON.stringify(this.wishlist));
    }
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}
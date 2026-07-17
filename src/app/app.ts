import { Component, Inject, PLATFORM_ID, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd, RouterLink } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';

import { HeaderComponent } from './layout/header/header.component';
import { FooterComponent } from './layout/footer/footer.component';
import { ToastComponent } from './components/toast/toast.component';
import { CartService, Cart } from './services/cart.service';
import { ToastService } from './services/toast.service';

import { provideHttpClient } from '@angular/common/http';

export const appConfig = {
  providers: [provideHttpClient()]
};

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    HeaderComponent,
    FooterComponent,
    ToastComponent,
  ],
  template: `
    <app-header *ngIf="showLayout"></app-header>
    
    <router-outlet></router-outlet>
    
    <app-footer *ngIf="showLayout"></app-footer>
    
    <app-toast></app-toast>

    <!-- Floating Cart Button -->
    <a *ngIf="showLayout && showCartIcon && cartItemCount > 0" routerLink="/cart"
       class="fixed bottom-6 right-6 bg-green-600 text-white p-4 rounded-full shadow-2xl hover:bg-green-700 transition-all z-50 flex items-center justify-center cursor-pointer">
       <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
         <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
       </svg>
       <span class="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center border-2 border-white">{{ cartItemCount }}</span>
    </a>
  `
})
export class App implements OnInit, OnDestroy {
  isBrowser = false;
  showLayout = true;
  showCartIcon = true;
  cartItemCount = 0;
  private cartSub?: Subscription;

  constructor(
    private router: Router,
    private cartService: CartService,
    private cdr: ChangeDetectorRef,
    private toastService: ToastService,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);

    if (this.isBrowser) {
      this.router.events
        .pipe(filter(event => event instanceof NavigationEnd))
        .subscribe((event: NavigationEnd) => {
          const url = event.urlAfterRedirects;
          const hideLayoutRoutes = ['/admin', '/login', '/signup', '/register', '/auth', '/forgot-password', '/track-order'];
          this.showLayout = !hideLayoutRoutes.some(route => url.startsWith(route));
          
          const hideCartIconRoutes = ['/cart', '/checkout', '/address-select', '/payment'];
          this.showCartIcon = !hideCartIconRoutes.some(route => url.startsWith(route));
        });
    }
  }

  ngOnInit() {
    if (this.isBrowser) {
      this.cartSub = this.cartService.cart$.subscribe((cart: Cart) => {
        this.cartItemCount = cart.itemCount;
        this.cdr.detectChanges();
      });
      
      this.checkLocationServiceability();
    }
  }

  private checkLocationServiceability() {
    if (sessionStorage.getItem('locationChecked') === 'true') {
      return;
    }
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`)
            .then(res => res.json())
            .then(data => {
              sessionStorage.setItem('locationChecked', 'true');
              const city = data.city || data.locality || '';
              
              if (city.toLowerCase().includes('bangalore') || city.toLowerCase().includes('bengaluru')) {
                this.toastService.success('Service Available!', `Great! We deliver hot & fresh meals to ${city}.`);
              } else {
                this.toastService.info('Location Update', `We currently don't serve in ${city || 'your area'}. But we are expanding soon!`);
              }
            })
            .catch(err => {
              console.error('Error fetching location data', err);
              sessionStorage.setItem('locationChecked', 'true');
            });
        },
        (error) => {
          console.error('Geolocation error', error);
          sessionStorage.setItem('locationChecked', 'true');
        }
      );
    }
  }

  ngOnDestroy() {
    if (this.cartSub) {
      this.cartSub.unsubscribe();
    }
  }
}
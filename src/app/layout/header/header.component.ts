import { Component, Inject, PLATFORM_ID, HostListener, ChangeDetectorRef } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule, isPlatformBrowser, Location } from '@angular/common';
import { ClickOutsideDirective } from '../../directives/click-outside.directive';
import { CartService } from '../../services/cart.service';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  standalone: true,
  selector: 'app-header',
  imports: [CommonModule, RouterLink, ClickOutsideDirective],
  templateUrl: './header.component.html',
  styles: [`
    .animate-scaleIn {
      animation: scaleIn 0.2s ease-out;
    }
    
    .animate-slideIn {
      animation: slideIn 0.3s ease-out;
    }
    
    @keyframes scaleIn {
      from {
        opacity: 0;
        transform: scale(0.95) translateY(-10px);
      }
      to {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }
    
    @keyframes slideIn {
      from {
        transform: translateX(100%);
      }
      to {
        transform: translateX(0);
      }
    }
  `]
})
export class HeaderComponent {
  showProfileMenu = false;
  mobileMenuOpen = false;
  cartCount = 0;
  isBrowser = false;
  currentYear = new Date().getFullYear();
  logoUrl = `${environment.backendUrl}/uploads/logo.jpeg`;

  constructor(
    private cartService: CartService,
    private authService: AuthService,
    public router: Router,
    private location: Location,
    @Inject(PLATFORM_ID) platformId: Object,
    private cdr: ChangeDetectorRef
  ) {
    this.isBrowser = isPlatformBrowser(platformId);

    if (this.isBrowser) {
      this.cartService.cart$.subscribe(cart => {
        this.cartCount = cart.itemCount;
        this.cdr.detectChanges();
      });
    }
  }

  @HostListener('document:keydown.escape')
  onEscapeKey() {
    this.closeProfileMenu();
    this.closeMobileMenu();
  }

  @HostListener('window:resize')
  onResize() {
    // Close menus on resize to avoid layout issues
    if (window.innerWidth >= 768) {
      this.closeMobileMenu();
    } else {
      this.closeProfileMenu();
    }
  }

  toggleProfileMenu() {
    this.showProfileMenu = !this.showProfileMenu;
    if (this.showProfileMenu) {
      this.mobileMenuOpen = false;
    }
  }

  closeProfileMenu() {
    this.showProfileMenu = false;
  }

  toggleMobileMenu() {
    this.mobileMenuOpen = !this.mobileMenuOpen;
    if (this.mobileMenuOpen) {
      this.showProfileMenu = false;
    }
  }

  closeMobileMenu() {
    this.mobileMenuOpen = false;
  }

  scrollToTop() {
    if (this.isBrowser) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  goBack() {
    this.location.back();
  }

  isHomePage(): boolean {
    return this.router.url === '/';
  }

  isLoggedIn(): boolean {
    if (!this.isBrowser) return false;
    return this.authService.isAuthenticated();
  }

  getUserName(): string | null {
    if (!this.isBrowser) return null;
    return localStorage.getItem('userName');
  }

  isMobileView(): boolean {
    if (!this.isBrowser) return false;
    return window.innerWidth < 768;
  }

  logout() {
    if (!this.isBrowser) return;
    this.authService.logout();
    this.closeProfileMenu();
    this.closeMobileMenu();
    this.router.navigate(['/login']);
  }
}
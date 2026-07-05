import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { adminGuard } from './guards/admin.guard';
import { AddressSelectComponent } from './components/address-select/address-select.component';
import { PaymentComponent } from './components/payment/payment.component';
import { OrderSuccessComponent } from './components/order-success/order-success.component';



export const routes: Routes = [
  /* ================= PUBLIC PAGES ================= */

  {
    path: '',
    loadComponent: () =>
      import('./pages/home/home').then(m => m.Home),
  },
  {
    path: 'menu',
    loadComponent: () =>
      import('./pages/menu/menu').then(m => m.Menu),
  },
  {
    path: 'cart',
    loadComponent: () =>
      import('./pages/cart/cart').then(m => m.CartPage),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/auth/auth.component').then(m => m.AuthComponent),
  },
  {
    path: 'signup',
    loadComponent: () =>
      import('./pages/auth/auth.component').then(m => m.AuthComponent),
  },
  {
    path: 'register',
    redirectTo: 'signup'
  },
  {
    path: 'auth/callback',
    loadComponent: () =>
      import('./pages/auth-callback/auth-callback.component').then(m => m.AuthCallbackComponent),
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./pages/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent),
  },
  {
    path: 'contact',
    loadComponent: () =>
      import('./pages/contact/contact').then(m => m.Contact),
  },

  /* ================= USER PROTECTED ================= */
  {
    path: 'checkout',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/checkout/checkout').then(m => m.Checkout),
  },
  {
    path: 'address-select', component: AddressSelectComponent,
    canActivate: [authGuard]
  },
  {
    path: 'payment', component: PaymentComponent,
    canActivate: [authGuard]
  },
  {
    path: 'order-success', component: OrderSuccessComponent,
    canActivate: [authGuard]
  },
  {
    path: 'orders',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/orders/orders').then(m => m.OrdersPage),
  },
  {
    path: 'wishlist',
    loadComponent: () =>
      import('./pages/wishlist/wishlist').then(m => m.Wishlist),
  },
  {
    path: 'account',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/account/account').then(m => m.Account),
  },

  /* ================= ADMIN ================= */
  // 🔓 ADMIN LOGIN (NO GUARD)
  {
    path: 'admin/login',
    loadComponent: () =>
      import('./pages/admin/auth/admin-login').then(m => m.AdminLogin),
  },

  // 🔐 ADMIN AREA (WITH LAYOUT) - IMPORTANT: Admin routes come BEFORE wildcard

  {
    path: 'admin',
    canActivate: [adminGuard],
    loadChildren: () => import('./pages/admin/admin.routes').then(m => m.adminRoutes)
  },

  /* ================= DELIVERY TRACKING ================= */
  {
    path: 'delivery-tracking',
    loadComponent: () =>
      import('./pages/delivery-tracking/delivery-tracking').then(m => m.DeliveryTrackingPage),
  },
  {
    path: 'track-order/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/track-order/track-order').then(m => m.TrackOrderPage),
  },

  /* ================= FALLBACK ================= */
  {
    path: '**',
    redirectTo: '',
  },
];
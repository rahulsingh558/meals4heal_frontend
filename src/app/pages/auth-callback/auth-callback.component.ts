import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { CartService } from '../../services/cart.service';

@Component({
    selector: 'app-auth-callback',
    standalone: true,
    template: `
    <div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#f0f4f0;">
      <div style="text-align:center;">
        <div style="width:48px;height:48px;border:4px solid #e0e0e0;border-top-color:#2E7D32;border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 1rem;"></div>
        <p style="color:#616161;font-size:1rem;">Authenticating...</p>
      </div>
    </div>
    <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
  `
})
export class AuthCallbackComponent implements OnInit {
    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private cartService: CartService,
        @Inject(PLATFORM_ID) private platformId: Object
    ) { }

    ngOnInit() {
        if (isPlatformBrowser(this.platformId)) {
            this.route.queryParams.subscribe(params => {
                const token = params['token'];
                const userId = params['userId'];
                const role = params['role'];
                const userName = params['userName'];
                const userEmail = params['userEmail'];

                if (token) {
                    localStorage.setItem('token', token);
                    localStorage.setItem('userId', userId);
                    localStorage.setItem('userRole', role);

                    if (userName) localStorage.setItem('userName', userName);
                    if (userEmail) localStorage.setItem('userEmail', userEmail);

                    const userData = {
                        id: userId,
                        name: userName || 'User',
                        email: userEmail || '',
                        role: role
                    };
                    localStorage.setItem('userData', JSON.stringify(userData));
                    localStorage.setItem('isLoggedIn', 'true');

                    this.cartService.migrateGuestCart().subscribe({
                        next: () => console.log('Cart migrated after Google Auth'),
                        error: (err) => console.error('Error migrating cart:', err),
                        complete: () => {
                            if (role === 'admin') {
                                this.router.navigate(['/admin']);
                            } else {
                                this.router.navigate(['/menu']);
                            }
                        }
                    });
                } else {
                    this.router.navigate(['/login'], { queryParams: { error: 'auth_failed' } });
                }
            });
        }
    }
}

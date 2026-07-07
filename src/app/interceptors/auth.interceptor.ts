import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    // Guard against SSR where localStorage is not available
    if (typeof localStorage === 'undefined') {
        return next(req);
    }

    let adminToken = localStorage.getItem('admin_token');
    let userToken = localStorage.getItem('token');
    
    // Sanitize string "null" or "undefined"
    if (adminToken === 'null' || adminToken === 'undefined') adminToken = null;
    if (userToken === 'null' || userToken === 'undefined') userToken = null;
    
    let token = null;
    const isAdminContext = (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) || req.url.includes('/admin');

    if (isAdminContext && adminToken) {
        token = adminToken;
    } else if (userToken) {
        token = userToken;
    } else if (adminToken) {
        token = adminToken;
    }

    // If token exists, clone request and add Authorization header
    if (token) {
        req = req.clone({
            setHeaders: {
                Authorization: `Bearer ${token}`
            }
        });
    }

    const router = inject(Router);

    return next(req).pipe(
        catchError((error: HttpErrorResponse) => {
            if (error.status === 401 || error.status === 403) {
                if (isAdminContext) {
                    localStorage.removeItem('admin_token');
                    localStorage.removeItem('admin_user');
                    router.navigate(['/admin/login']);
                } else {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    router.navigate(['/login']);
                }
            }
            return throwError(() => error);
        })
    );
};

import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    // Guard against SSR where localStorage is not available
    if (typeof localStorage === 'undefined') {
        return next(req);
    }

    // Get token from localStorage (try both keys for compatibility)
    const token = localStorage.getItem('token') || localStorage.getItem('admin_token');

    // If token exists, clone request and add Authorization header
    if (token) {
        req = req.clone({
            setHeaders: {
                Authorization: `Bearer ${token}`
            }
        });
    }

    return next(req);
};

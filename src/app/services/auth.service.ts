import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface User {
    id: string;
    name: string;
    email: string;
    role?: string;
}

export interface AuthResponse {
    token: string;
    user: User;
    message?: string;
}

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private API_URL = `${environment.apiUrl}/auth`;

    private currentUserSubject = new BehaviorSubject<User | null>(null);
    public currentUser$ = this.currentUserSubject.asObservable();
    private isBrowser: boolean;

    constructor(
        private http: HttpClient,
        @Inject(PLATFORM_ID) platformId: Object
    ) {
        this.isBrowser = isPlatformBrowser(platformId);
        if (this.isBrowser) {
            this.loadUserFromStorage();
        }
    }

    private loadUserFromStorage(): void {
        if (!this.isBrowser) return;

        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('userData');

        if (token && userData) {
            try {
                const user = JSON.parse(userData);
                this.currentUserSubject.next(user);
            } catch (e) {
                console.error('Error parsing user data:', e);
            }
        }
    }

    register(name: string, email: string, password: string, phone: string = ''): Observable<AuthResponse> {
        return this.http.post<AuthResponse>(`${this.API_URL}/register`, {
            name, email, password, phone
        }).pipe(
            tap(response => {
                if (response.token && response.user) {
                    this.handleAuthSuccess(response);
                }
            })
        );
    }

    login(email: string, password: string): Observable<AuthResponse> {
        return this.http.post<AuthResponse>(`${this.API_URL}/login`, {
            email, password
        }).pipe(
            tap(response => {
                if (response.token && response.user) {
                    this.handleAuthSuccess(response);
                }
            })
        );
    }

    sendWhatsAppOtp(phone: string): Observable<any> {
        return this.http.post(`${this.API_URL}/whatsapp/send-otp`, { phone });
    }

    verifyWhatsAppOtp(phone: string, otp: string): Observable<AuthResponse> {
        return this.http.post<AuthResponse>(`${this.API_URL}/whatsapp/verify-otp`, { phone, otp })
            .pipe(
                tap(response => {
                    if (response.token && response.user) {
                        this.handleAuthSuccess(response);
                    }
                })
            );
    }

    sendEmailOtp(email: string): Observable<any> {
        return this.http.post(`${this.API_URL}/email/send-otp`, { email });
    }

    verifyEmailOtp(email: string, otp: string): Observable<AuthResponse> {
        return this.http.post<AuthResponse>(`${this.API_URL}/email/verify-otp`, { email, otp })
            .pipe(
                tap(response => {
                    if (response.token && response.user) {
                        this.handleAuthSuccess(response);
                    }
                })
            );
    }

    forgotPassword(identifier: string): Observable<any> {
        return this.http.post(`${this.API_URL}/forgot-password`, { identifier });
    }

    verifyResetOtp(identifier: string, otp: string): Observable<any> {
        return this.http.post(`${this.API_URL}/verify-reset-otp`, { identifier, otp });
    }

    resetPassword(identifier: string, otp: string, newPassword: string): Observable<any> {
        return this.http.post(`${this.API_URL}/reset-password`, { identifier, otp, newPassword });
    }

    updatePassword(currentPassword: string, newPassword: string): Observable<any> {
        return this.http.put(`${environment.apiUrl}/user/password`, { currentPassword, newPassword });
    }

    private handleAuthSuccess(response: AuthResponse): void {
        if (!this.isBrowser) return;
        localStorage.setItem('token', response.token);
        localStorage.setItem('userData', JSON.stringify(response.user));
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userId', response.user.id);
        localStorage.setItem('userEmail', response.user.email);
        localStorage.setItem('userName', response.user.name);
        this.currentUserSubject.next(response.user);
    }

    logout(): void {
        if (!this.isBrowser) return;
        localStorage.removeItem('token');
        localStorage.removeItem('userData');
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('userId');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userName');
        localStorage.removeItem('authProvider');
        this.currentUserSubject.next(null);
    }

    isAuthenticated(): boolean {
        if (!this.isBrowser) return false;
        return !!localStorage.getItem('token');
    }

    getToken(): string | null {
        if (!this.isBrowser) return null;
        return localStorage.getItem('token');
    }

    getCurrentUser(): User | null {
        return this.currentUserSubject.value;
    }

    getCurrentUser$(): Observable<User | null> {
        return this.currentUser$;
    }
}

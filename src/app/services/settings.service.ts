import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, shareReplay, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface AppSettings {
    restaurantName: string;
    email: string;
    phone: string;
    address: string;
    deliveryRadius: number;
    taxRate: number;
    deliveryCharge: number;
    freeDeliveryThreshold: number;
    openingTime: string;
    closingTime: string;
    notificationEnabled: boolean;
    lowStockAlert: number;
}

// Fallback matches previous hardcoded checkout behaviour (5% GST, ₹40 under ₹299)
export const DEFAULT_SETTINGS: AppSettings = {
    restaurantName: 'meals4heal',
    email: '',
    phone: '',
    address: '',
    deliveryRadius: 5,
    taxRate: 5,
    deliveryCharge: 40,
    freeDeliveryThreshold: 299,
    openingTime: '10:00',
    closingTime: '22:00',
    notificationEnabled: true,
    lowStockAlert: 10,
};

@Injectable({ providedIn: 'root' })
export class SettingsService {
    private apiUrl = `${environment.apiUrl}/settings`;
    private cache$?: Observable<AppSettings>;

    constructor(private http: HttpClient) {}

    /** Cached, resilient settings fetch. Falls back to defaults if the API fails. */
    getSettings(): Observable<AppSettings> {
        if (!this.cache$) {
            this.cache$ = this.http
                .get<{ success: boolean; settings: AppSettings }>(this.apiUrl)
                .pipe(
                    map(res => ({ ...DEFAULT_SETTINGS, ...(res?.settings || {}) })),
                    catchError(() => of(DEFAULT_SETTINGS)),
                    shareReplay(1)
                );
        }
        return this.cache$;
    }
}

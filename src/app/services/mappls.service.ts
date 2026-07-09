import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Coordinates {
    lat: number;
    lng: number;
}

export interface RouteInfo {
    distance: number;
    duration: number;
    distanceText: string;
    durationText: string;
}

@Injectable({
    providedIn: 'root'
})
export class MapplsService {
    private mapObject: any = null;
    private isInitialized = false;
    private isBrowser: boolean;
    private markers: any[] = [];
    private polylines: any[] = [];
    private currentRoute: any = null;

    readonly restaurantCoords: Coordinates = environment.mappls.restaurantCoords;

    constructor(
        @Inject(PLATFORM_ID) platformId: Object,
        private http: HttpClient
    ) {
        this.isBrowser = isPlatformBrowser(platformId);
    }

    async initialize(): Promise<void> {
        if (!this.isBrowser || this.isInitialized) return;

        return new Promise((resolve, reject) => {
            if (document.querySelector('script[src*="apis.mappls.com"]')) {
                this.isInitialized = true;
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = `https://apis.mappls.com/advancedmaps/api/${environment.mappls.apiKey}/map_sdk?layer=vector&v=3.0`;
            script.async = true;
            script.onload = () => {
                this.isInitialized = true;
                resolve();
            };
            script.onerror = (error) => {
                reject(new Error('Failed to load Mappls SDK'));
            };
            document.head.appendChild(script);
        });
    }

    private waitForMappls(timeout: number = 10000): Promise<void> {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            const checkMappls = () => {
                if ((window as any).mappls) {
                    resolve();
                } else if (Date.now() - startTime > timeout) {
                    reject(new Error('Timeout waiting for Mappls object'));
                } else {
                    setTimeout(checkMappls, 100);
                }
            };
            checkMappls();
        });
    }

    private resolvedRestaurantCoords: Coordinates | null = null;

    async getRestaurantCoordinates(): Promise<Coordinates> {
        if (this.resolvedRestaurantCoords) return this.resolvedRestaurantCoords;

        try {
            const eloc = environment.mappls.restaurantELoc;
            if (eloc) {
                const coords = await this.getPlaceDetails(eloc);
                if (coords) {
                    this.resolvedRestaurantCoords = coords;
                    return coords;
                }
            }
        } catch (error) {
            console.error('Failed to resolve restaurant eLoc:', error);
        }

        return this.restaurantCoords;
    }

    async getPlaceDetails(eloc: string): Promise<Coordinates | null> {
        try {
            const url = `${environment.apiUrl}/mappls/place-details?eloc=${eloc}`;
            const response = await firstValueFrom(this.http.get<any>(url));

            if (response && response.success && response.data) {
                const data = response.data;
                const lat = data.latitude || (data.point ? data.point.lat : null);
                const lng = data.longitude || (data.point ? data.point.lng : null);

                if (lat && lng) {
                    return { lat: parseFloat(lat), lng: parseFloat(lng) };
                }
            }
            return null;
        } catch (error) {
            console.error('Error fetching place details:', error);
            return null;
        }
    }

    async createMap(containerId: string, center?: Coordinates, zoom: number = 14): Promise<any> {
        if (!this.isBrowser) return null;

        try {
            if (!this.isInitialized) {
                await this.initialize();
            }
            await this.waitForMappls();

            const mapCenter = center || this.restaurantCoords;
            const mapplsObj = (window as any).mappls;

            this.mapObject = new mapplsObj.Map(containerId, {
                center: [mapCenter.lat, mapCenter.lng],
                zoom: zoom,
                zoomControl: false,
                location: false
            });

            return new Promise((resolve) => {
                this.mapObject.on('load', () => {
                    resolve(this.mapObject);
                });

                setTimeout(() => {
                    if (this.mapObject) {
                        resolve(this.mapObject);
                    }
                }, 5000);
            });
        } catch (error) {
            console.error('Error creating map:', error);
            throw error;
        }
    }

    addMarker(coords: Coordinates, options: {
        iconUrl?: string;
        html?: string;
        width?: number;
        height?: number;
        draggable?: boolean;
    } = {}): any {
        if (!this.mapObject) return null;

        try {
            const mapplsObj = (window as any).mappls;

            const markerOptions: any = {
                map: this.mapObject,
                position: [coords.lat, coords.lng],
                draggable: options.draggable || false,
                html: options.html
            };

            if (options.iconUrl) {
                markerOptions.icon = {
                    url: options.iconUrl,
                    width: options.width || 32,
                    height: options.height || 32
                };
            }

            const marker = new mapplsObj.Marker(markerOptions);
            this.markers.push(marker);
            return marker;
        } catch (error) {
            console.error('Error adding marker:', error);
            return null;
        }
    }

    addRestaurantMarker(coords: Coordinates, label?: string): any {
        const svgHtml = `
            <div style="width: 48px; height: 48px; transform: translate(-50%, -100%);">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style="filter: drop-shadow(0 4px 8px rgba(0,0,0,0.4)); width: 100%; height: 100%;">
                    <path fill="#2E7D32" stroke="white" stroke-width="1.5" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                    <g transform="translate(8.5, 5) scale(0.35)">
                        <path fill="white" d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z"/>
                    </g>
                </svg>
            </div>
        `;
        return this.addMarker(coords, { html: svgHtml });
    }

    addDeliveryAddressMarker(coords: Coordinates, label?: string): any {
        const svgHtml = `
            <div style="width: 48px; height: 48px; transform: translate(-50%, -100%);">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style="filter: drop-shadow(0 4px 8px rgba(0,0,0,0.4)); width: 100%; height: 100%;">
                    <path fill="#4CAF50" stroke="white" stroke-width="1.5" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                    <g transform="translate(7, 4.5) scale(0.45)">
                        <path fill="white" d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
                    </g>
                </svg>
            </div>
        `;
        return this.addMarker(coords, { html: svgHtml });
    }

    addRiderMarker(coords: Coordinates): any {
        const riderHtml = `
            <div style="transform: translate(-50%, -50%); filter: drop-shadow(0 4px 6px rgba(0,0,0,0.4));">
                <div style="background: linear-gradient(135deg, #2E7D32, #1B5E20); width: 50px; height: 50px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 4px 12px rgba(46, 125, 50, 0.5);">
                    <span style="font-size: 24px;">🛵</span>
                </div>
                <div style="position: absolute; top: -8px; left: 50%; transform: translateX(-50%); background: #4CAF50; color: white; font-size: 10px; padding: 2px 6px; border-radius: 10px; font-weight: bold; white-space: nowrap;">
                    LIVE
                </div>
            </div>
        `;
        return this.addMarker(coords, { html: riderHtml });
    }

    drawPolyline(points: Coordinates[], color: string = '#2E7D32'): any {
        if (!this.mapObject || points.length < 2) return null;

        try {
            const mapplsObj = (window as any).mappls;
            const paths = points.map(p => ({ lat: p.lat, lng: p.lng }));

            const polyline = new mapplsObj.Polyline({
                map: this.mapObject,
                paths: paths,
                strokeColor: color,
                strokeOpacity: 0.9,
                strokeWeight: 5
            });

            this.polylines.push(polyline);
            return polyline;
        } catch (error) {
            console.error('Error drawing polyline:', error);
            return null;
        }
    }

    async drawActualRoute(start: Coordinates, end: Coordinates, color: string = '#2E7D32'): Promise<RouteInfo | null> {
        if (!this.mapObject) return null;

        if (this.currentRoute) {
            try { this.currentRoute.remove(); } catch(e) {}
            this.currentRoute = null;
        }

        const fallbackDistance = this.calculateDistance(start, end);
        const fallbackDuration = Math.round(fallbackDistance * 3);
        const fallbackInfo: RouteInfo = {
            distance: fallbackDistance,
            duration: fallbackDuration,
            distanceText: `${fallbackDistance.toFixed(1)} km`,
            durationText: `${fallbackDuration} min`
        };

        try {
            const url = `${environment.apiUrl}/mappls/directions?start=${start.lng},${start.lat}&end=${end.lng},${end.lat}`;
            const response = await firstValueFrom(this.http.get<any>(url));

            if (response && response.success && response.data && response.data.routes && response.data.routes.length > 0) {
                const route = response.data.routes[0];
                let routePoints: Coordinates[] = [];

                if (route.geometry) {
                    if (typeof route.geometry === 'string') {
                        routePoints = this.decodePolyline(route.geometry);
                    } else if (route.geometry.coordinates) {
                        routePoints = route.geometry.coordinates.map((coord: number[]) => ({
                            lng: coord[0],
                            lat: coord[1]
                        }));
                    }
                }

                if (routePoints.length > 0) {
                    this.currentRoute = this.drawPolyline(routePoints, color);

                    const distanceMeters = route.distance || 0;
                    const durationSeconds = route.duration || 0;
                    const distance = distanceMeters / 1000;
                    const duration = Math.round(durationSeconds / 60);

                    return {
                        distance: parseFloat(distance.toFixed(1)),
                        duration: duration || Math.round(distance * 3),
                        distanceText: `${distance.toFixed(1)} km`,
                        durationText: `${duration || Math.round(distance * 3)} min`
                    };
                }
            }

            this.currentRoute = this.drawPolyline([start, end], color);
            return fallbackInfo;
        } catch (error) {
            console.error('Error fetching route:', error);
            this.currentRoute = this.drawPolyline([start, end], color);
            return fallbackInfo;
        }
    }

    private decodePolyline(str: string, precision: number = 5): Coordinates[] {
        let index = 0, lat = 0, lng = 0, coordinates: Coordinates[] = [], shift = 0, result = 0, byte = null, latitude_change, longitude_change, factor = Math.pow(10, precision);
        while (index < str.length) {
            byte = null; shift = 0; result = 0;
            do {
                byte = str.charCodeAt(index++) - 63;
                result |= (byte & 0x1f) << shift;
                shift += 5;
            } while (byte >= 0x20);
            latitude_change = ((result & 1) ? ~(result >> 1) : (result >> 1));
            shift = result = 0;
            do {
                byte = str.charCodeAt(index++) - 63;
                result |= (byte & 0x1f) << shift;
                shift += 5;
            } while (byte >= 0x20);
            longitude_change = ((result & 1) ? ~(result >> 1) : (result >> 1));
            lat += latitude_change;
            lng += longitude_change;
            coordinates.push({lat: lat / factor, lng: lng / factor});
        }
        return coordinates;
    }

    private calculateDistance(start: Coordinates, end: Coordinates): number {
        const R = 6371;
        const dLat = this.toRad(end.lat - start.lat);
        const dLng = this.toRad(end.lng - start.lng);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRad(start.lat)) * Math.cos(this.toRad(end.lat)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return parseFloat((R * c).toFixed(1));
    }

    private toRad(deg: number): number {
        return deg * (Math.PI / 180);
    }

    fitBounds(coords: Coordinates[]): void {
        if (!this.mapObject || coords.length === 0) return;

        try {
            const mapplsObj = (window as any).mappls;
            const bounds = new mapplsObj.LatLngBounds();

            coords.forEach(coord => {
                bounds.extend([coord.lng, coord.lat]);
            });

            this.mapObject.fitBounds(bounds, { padding: 80 });
        } catch (error) {
            console.error('Error fitting bounds:', error);
        }
    }

    updateMarkerPosition(marker: any, coords: Coordinates): void {
        if (marker) {
            try {
                marker.setPosition([coords.lat, coords.lng]);
            } catch (error) {
                console.error('Error updating marker position:', error);
            }
        }
    }

    private deliveryMarker: any = null;

    updateDeliveryMarker(coords: Coordinates): void {
        if (this.deliveryMarker) {
            this.updateMarkerPosition(this.deliveryMarker, coords);
        } else {
            this.deliveryMarker = this.addRiderMarker(coords);
        }
    }

    destroyMap(): void {
        try {
            this.markers.forEach(m => { try { m.remove(); } catch (e) { } });
            this.polylines.forEach(p => { try { p.remove(); } catch (e) { } });
            if (this.mapObject) {
                this.mapObject.remove();
            }
        } catch (error) {
            console.error('Error destroying map:', error);
        }

        this.mapObject = null;
        this.markers = [];
        this.polylines = [];
        this.deliveryMarker = null;
    }

    getDeliveryProgress(orderStatus: string): number {
        const progressMap: { [key: string]: number } = {
            'pending': 0,
            'confirmed': 10,
            'preparing': 25,
            'out_for_delivery': 60,
            'delivered': 100,
            'cancelled': 0
        };
        return progressMap[orderStatus] || 0;
    }

    getPositionOnRoute(start: Coordinates, end: Coordinates, percentage: number): Coordinates {
        const t = percentage / 100;
        return {
            lat: start.lat + (end.lat - start.lat) * t,
            lng: start.lng + (end.lng - start.lng) * t
        };
    }

    getEstimatedCoordinates(address: string): Coordinates {
        let hash = 0;
        const addr = address || '';
        for (let i = 0; i < addr.length; i++) {
            hash = ((hash << 5) - hash) + addr.charCodeAt(i);
            hash = hash & hash;
        }

        const offset = (Math.abs(hash) % 1000) / 50000;
        return {
            lat: this.restaurantCoords.lat + 0.01 + offset,
            lng: this.restaurantCoords.lng + 0.015 + offset
        };
    }

    async geocodeAddress(address: string): Promise<Coordinates> {
        return this.getEstimatedCoordinates(address);
    }

    zoomIn() {
        if (this.mapObject) this.mapObject.zoomIn();
    }

    zoomOut() {
        if (this.mapObject) this.mapObject.zoomOut();
    }

    private is3D = false;
    toggle3D(): boolean {
        if (!this.mapObject) return false;
        this.is3D = !this.is3D;
        this.mapObject.easeTo({
            pitch: this.is3D ? 60 : 0
        });
        return this.is3D;
    }
}

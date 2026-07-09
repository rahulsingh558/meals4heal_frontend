import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { io, Socket } from 'socket.io-client';
import { OrderService, Order } from '../../services/order.service';
import { MapplsService, Coordinates, RouteInfo } from '../../services/mappls.service';
import { environment } from '../../../environments/environment';

@Component({
    standalone: true,
    selector: 'app-track-order',
    templateUrl: './track-order.html',
    styleUrls: ['./track-order.css'],
    imports: [CommonModule, RouterModule]
})
export class TrackOrderPage implements OnInit, OnDestroy {
    orderId: string | null = null;
    order: Order | null = null;
    loading = true;
    error = '';
    isBrowser = false;

    deliveryProgress = 0;
    isLiveTracking = false;
    socket: Socket | null = null;
    mapInitialized = false;
    deliveryAddressCoords: Coordinates | null = null;
    routeInfo: RouteInfo | null = null;
    latestDeliveryLocation: { lat: number, lng: number } | null = null;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private orderService: OrderService,
        private mapplsService: MapplsService,
        private cdr: ChangeDetectorRef,
        @Inject(PLATFORM_ID) platformId: Object
    ) {
        this.isBrowser = isPlatformBrowser(platformId);
    }

    ngOnInit(): void {
        this.orderId = this.route.snapshot.paramMap.get('id');

        if (!this.orderId) {
            this.error = 'Invalid Order ID';
            this.loading = false;
            return;
        }

        this.loadOrder();
    }

    ngOnDestroy(): void {
        if (this.socket) {
            this.socket.disconnect();
        }
    }

    loadOrder() {
        if (!this.orderId) return;

        this.orderService.getOrderById(this.orderId).subscribe({
            next: (response) => {
                if (response.success) {
                    this.order = response.order;
                    this.loading = false;

                    if (this.isBrowser) {
                        setTimeout(() => {
                            this.initializeMap();
                            this.setupSocketConnection();
                        }, 100);
                    }
                } else {
                    this.error = 'Order not found';
                    this.loading = false;
                }
            },
            error: () => {
                this.error = 'Failed to load order details';
                this.loading = false;
            }
        });
    }

    async initializeMap(): Promise<void> {
        if (!this.order || this.mapInitialized) return;

        try {
            const deliveryCoords = await this.getDeliveryCoordinates();
            const restaurantCoords = await this.mapplsService.getRestaurantCoordinates();

            const centerCoords: Coordinates = {
                lat: (restaurantCoords.lat + deliveryCoords.lat) / 2,
                lng: (restaurantCoords.lng + deliveryCoords.lng) / 2
            };

            this.deliveryAddressCoords = deliveryCoords;

            await this.mapplsService.createMap('tracking-map-page', centerCoords, 13);
            this.mapInitialized = true;

            this.mapplsService.addRestaurantMarker(restaurantCoords, 'meals4heal');
            this.mapplsService.addDeliveryAddressMarker(deliveryCoords, 'Delivery Address');

            this.mapplsService.fitBounds([restaurantCoords, deliveryCoords]);

            this.deliveryProgress = this.mapplsService.getDeliveryProgress(this.order.orderStatus);

            if (this.latestDeliveryLocation) {
                this.updateDeliveryLocation(this.latestDeliveryLocation.lat, this.latestDeliveryLocation.lng);
            }

            this.cdr.detectChanges();
        } catch (error) {
            console.error('Error initializing map:', error);
        }
    }

    async getDeliveryCoordinates(): Promise<Coordinates> {
        const address = this.order?.deliveryAddress;

        if (!address) {
            return { lat: 12.9750, lng: 77.6600 };
        }

        if (address.lat && address.lng) {
            return { lat: address.lat, lng: address.lng };
        }

        const fullAddress = [
            address.street,
            address.landmark,
            address.city,
            address.state,
            address.zipCode
        ].filter(Boolean).join(', ');

        return await this.mapplsService.geocodeAddress(fullAddress);
    }

    setupSocketConnection() {
        if (!this.isBrowser || !this.order) return;

        this.socket = io(environment.apiUrl.replace('/api', ''), {
            transports: ['websocket', 'polling']
        });

        const joinRooms = () => {
            const cleanOrderNumber = this.order?.orderNumber?.toString().trim();
            const orderIdStr = this.order?._id?.toString().trim();
            
            if (cleanOrderNumber) {
                this.socket?.emit('join-delivery', cleanOrderNumber);
            }
            if (orderIdStr && orderIdStr !== cleanOrderNumber) {
                this.socket?.emit('join-delivery', orderIdStr);
            }
        };

        this.socket.on('connect', joinRooms);
        if (this.socket.connected) {
            joinRooms();
        }

        this.socket.on('location-update', (data: any) => {
            if (data.lat && data.lng) {
                this.isLiveTracking = true;
                this.latestDeliveryLocation = { lat: Number(data.lat), lng: Number(data.lng) };
                if (this.mapInitialized) {
                    this.updateDeliveryLocation(Number(data.lat), Number(data.lng));
                }
            }
        });

        this.socket.on('order:status_update', (data: any) => {
            if (this.order && data.orderId === this.order._id) {
                this.order.orderStatus = data.status;
                this.deliveryProgress = this.mapplsService.getDeliveryProgress(data.status);
                this.cdr.detectChanges();
            }
        });
    }

    async updateDeliveryLocation(lat: number, lng: number) {
        if (!this.mapInitialized) return;
        const pos = { lat, lng };

        this.mapplsService.updateDeliveryMarker(pos);

        if (this.deliveryAddressCoords) {
            this.routeInfo = await this.mapplsService.drawActualRoute(pos, this.deliveryAddressCoords);
        }

        this.cdr.detectChanges();
    }

    formatDate(date: any): string {
        if (!date) return '';
        return new Date(date).toLocaleDateString('en-US', {
            day: 'numeric', month: 'short', year: 'numeric'
        });
    }

    formatTime(date: any): string {
        if (!date) return '';
        return new Date(date).toLocaleTimeString('en-US', {
            hour: '2-digit', minute: '2-digit'
        });
    }

    getStatusText(status: string): string {
        switch (status) {
            case 'pending': return 'Order Placed';
            case 'confirmed': return 'Confirmed';
            case 'preparing': return 'Preparing';
            case 'out_for_delivery': return 'Out for Delivery';
            case 'delivered': return 'Delivered';
            case 'cancelled': return 'Cancelled';
            default: return status;
        }
    }

    goBack() {
        this.router.navigate(['/orders']);
    }

    is3D = false;

    zoomIn() {
        this.mapplsService.zoomIn();
    }

    zoomOut() {
        this.mapplsService.zoomOut();
    }

    toggle3D() {
        this.is3D = this.mapplsService.toggle3D();
    }
}

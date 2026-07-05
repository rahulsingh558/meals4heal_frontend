import { Component, Inject, PLATFORM_ID, ChangeDetectorRef, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { CartService, CartItem } from '../../services/cart.service';
import { FoodApiService, ApiFood } from '../../services/food-api.service';
import { Subscription } from 'rxjs';
import { Food } from '../../models/food';
import { Addon } from '../../models/addon';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faCartPlus, faTrash } from '@fortawesome/free-solid-svg-icons';
import { ChatWidgetComponent } from '../../components/chat/chat.component';
import { environment } from '../../../environments/environment';
/* =========================
   TYPES
========================= */
type FoodType = 'veg' | 'egg' | 'nonveg';

interface MenuFood extends Food {
  image: string;
  type: FoodType;
  freeAddonIds: number[];
  addons: Addon[];
  showAllAddons?: boolean;
}

/* =========================
   COMPONENT
========================= */
@Component({
  standalone: true,
  selector: 'app-menu',
  imports: [CommonModule, FontAwesomeModule],
  templateUrl: './menu.html',
})
export class Menu implements OnInit, OnDestroy {
  isBrowser = false;
  faCartPlus = faCartPlus;
  faTrash = faTrash;

  selectedType: 'all' | FoodType = 'all';
  foods: MenuFood[] = [];

  /* =========================
     MODAL STATE
  ========================== */
  showAddonModal = false;
  selectedFood!: MenuFood;
  modalSelectedFreeAddons: Addon[] = [];
  modalSelectedPremiumAddons: Addon[] = [];
  modalTotal = 0;

  /* =========================
     WISHLIST & CART STATE
  ========================== */
  wishlist: { id: any; name: string; basePrice: number }[] = [];
  cartItems: CartItem[] = [];
  private cartSub!: Subscription;

  /* =========================
     ADDON IMAGES (Now fetched dynamically from backend)
  ========================== */

  constructor(
    private cartService: CartService,
    private foodApi: FoodApiService,
    @Inject(PLATFORM_ID) platformId: Object,
    private cdr: ChangeDetectorRef
  ) {
    this.isBrowser = isPlatformBrowser(platformId);

    if (this.isBrowser) {
      this.wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
      this.loadMenu();
    }
  }

  ngOnInit() {
    this.cartSub = this.cartService.cart$.subscribe(cart => {
      this.cartItems = cart.items || [];
      if (this.isBrowser) {
        this.cdr.detectChanges();
      }
    });
  }

  ngOnDestroy() {
    if (this.cartSub) {
      this.cartSub.unsubscribe();
    }
  }

  /* =========================
     LOAD MENU (BACKEND)
  ========================== */
  loadMenu() {
    console.log('Fetching foods...');
    this.foodApi.getAllFoods().subscribe({
      next: foods => {
        console.log('Received foods from API:', foods.length);
        this.foods = foods.map(f => this.mapApiFoodToMenu(f));
        console.log('Mapped foods:', this.foods);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load foods:', err);
        this.foods = [];
        this.cdr.detectChanges();
      }
    });
  }

  /* =========================
     API → UI MAPPER
  ========================== */
  mapApiFoodToMenu(food: ApiFood): MenuFood {
    const freeAddons: Addon[] = [
      { id: 1, name: 'Onion', price: 0 },
      { id: 2, name: 'Tomato', price: 0 },
      { id: 3, name: 'Cucumber', price: 0 },
      { id: 4, name: 'Lemon', price: 0 },
      { id: 5, name: 'Coriander', price: 0 },
    ];

    let premiumAddons: Addon[] = [];

    if (food.type === 'veg' || food.type === 'egg') {
      premiumAddons = [
        { id: 6, name: 'Sweet Corn', price: 20 },
        { id: 7, name: 'Broccoli', price: 25 },
        { id: 8, name: 'Beans', price: 15 },
        { id: 9, name: 'Peas', price: 15 }
      ];
    } else {
      premiumAddons = [
        { id: 11, name: 'Capsicum', price: 20 },
        { id: 12, name: 'Broccoli', price: 25 },
        { id: 13, name: 'Cheese', price: 30 },
        { id: 14, name: 'Mushroom', price: 25 }
      ];
    }

    return {
      id: food._id as any,
      name: food.name,
      subtitle: food.subtitle,
      basePrice: food.basePrice,
      category: food.category as 'sprouts' | 'airfried',
      type: food.type,
      image: `${environment.backendUrl}${food.image}`,
      addons: [...freeAddons, ...premiumAddons],
      freeAddonIds: freeAddons.map(a => a.id),
    };
  }

  /* =========================
     FILTER
  ========================== */
  get filteredFoods() {
    if (this.selectedType === 'all') return this.foods;
    return this.foods.filter(f => f.type === this.selectedType);
  }

  /* =========================
     ADDON HELPERS
  ========================== */
  getFreeAddons(food: MenuFood) {
    return food.addons.filter(a => a.price === 0);
  }

  getPremiumAddons(food: MenuFood) {
    return food.addons.filter(a => a.price > 0);
  }

  isFreeAddonSelected(id: number): boolean {
    return this.modalSelectedFreeAddons.some(a => a.id === id);
  }

  isPremiumAddonSelected(id: number): boolean {
    return this.modalSelectedPremiumAddons.some(a => a.id === id);
  }

  addonImageMap: Record<string, string> = {
    'Onion': 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=200&q=80',
    'Tomato': 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=200&q=80',
    'Cucumber': 'https://images.unsplash.com/photo-1604977042946-1eecc30f269e?w=200&q=80',
    'Lemon': 'https://images.unsplash.com/photo-1609951651556-5334e2706168?w=200&q=80',
    'Coriander': 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=200&q=80',
    'Sweet Corn': 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=200&q=80',
    'Broccoli': 'https://images.unsplash.com/photo-1459411621453-7b03977f4bfc?w=200&q=80',
    'Beans': 'https://images.unsplash.com/photo-1593467664654-2098b64e03d3?w=200&q=80',
    'Peas': 'https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?w=200&q=80',
    'Capsicum': 'https://images.unsplash.com/photo-1563514227147-6d2ff665a6a0?w=200&q=80',
    'Cheese': 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=200&q=80',
    'Mushroom': 'https://images.unsplash.com/photo-1511688878353-3a2f5be94cd7?w=200&q=80'
  };

  getAddonImage(name: string) {
    if (this.addonImageMap[name]) {
      return this.addonImageMap[name];
    }
    const fileName = name.toLowerCase().replace(/ /g, '-') + '.jpg';
    return `${environment.backendUrl}/uploads/addons/${fileName}`;
  }

  getPremiumAddonsTotal() {
    return this.modalSelectedPremiumAddons.reduce((s, a) => s + a.price, 0);
  }

  /* =========================
     WISHLIST
  ========================== */
  toggleWishlist(food: Food) {
    const i = this.wishlist.findIndex(w => w.id === food.id);
    i > -1 ? this.wishlist.splice(i, 1) : this.wishlist.push(food as any);
    localStorage.setItem('wishlist', JSON.stringify(this.wishlist));
  }

  isWishlisted(id: any) {
    return this.wishlist.some(w => w.id === id);
  }

  /* =========================
     CART HELPERS
  ========================== */
  isFoodInCart(foodId: any): boolean {
    return this.cartItems.some(item => item.menuItemId === String(foodId));
  }

  removeFromCart(foodId: any, event: Event) {
    if (event) {
      event.stopPropagation();
    }
    // Find the cart item by menuItemId to get the actual cart subdocument _id
    const cartItem = this.cartItems.find(item => item.menuItemId === String(foodId));
    const idToRemove = cartItem?._id || String(foodId);
    this.cartService.removeItem(idToRemove).subscribe({
      next: (res: any) => console.log('Removed from cart', res),
      error: (err: any) => console.error('Error removing from cart', err)
    });
  }

  /* =========================
     ADD TO CART
  ========================== */
  openAddonPopup(food: MenuFood) {
    this.selectedFood = food;
    this.modalSelectedFreeAddons = [...this.getFreeAddons(food)];
    this.modalSelectedPremiumAddons = [];
    this.calculateTotal();
    this.showAddonModal = true;
    if (this.isBrowser) {
      document.body.style.overflow = 'hidden';
    }
  }

  closeAddonPopup() {
    this.showAddonModal = false;
    this.modalSelectedFreeAddons = [];
    this.modalSelectedPremiumAddons = [];
    if (this.isBrowser) {
      document.body.style.overflow = '';
    }
  }

  toggleFreeAddon(addon: Addon) {
    const i = this.modalSelectedFreeAddons.findIndex(a => a.id === addon.id);
    i > -1
      ? this.modalSelectedFreeAddons.splice(i, 1)
      : this.modalSelectedFreeAddons.push(addon);
    this.calculateTotal();
  }

  togglePremiumAddon(addon: Addon) {
    const i = this.modalSelectedPremiumAddons.findIndex(a => a.id === addon.id);
    i > -1
      ? this.modalSelectedPremiumAddons.splice(i, 1)
      : this.modalSelectedPremiumAddons.push(addon);
    this.calculateTotal();
  }

  calculateTotal() {
    this.modalTotal =
      this.selectedFood.basePrice +
      this.modalSelectedPremiumAddons.reduce((s, a) => s + a.price, 0);
  }

  confirmAddToCart() {
    this.cartService.addToCart({
      menuItemId: String(this.selectedFood.id),
      name: this.selectedFood.name,
      price: this.modalTotal,
      quantity: 1,
      customizations: [...this.modalSelectedFreeAddons, ...this.modalSelectedPremiumAddons]
    }).subscribe({
      next: (res: any) => console.log('Added to cart', res),
      error: (err: any) => console.error('Error adding to cart', err)
    });

    this.closeAddonPopup();
  }
}
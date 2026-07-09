import { Component, Inject, PLATFORM_ID, ChangeDetectorRef, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
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
  imports: [CommonModule, FontAwesomeModule, RouterLink],
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
     REPEAT MODAL STATE
  ========================== */
  showRepeatModal = false;
  foodToRepeat: MenuFood | null = null;
  lastCartItemToRepeat: CartItem | null = null;

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

  getAddonImage(name: string) {
    const fileName = name.toLowerCase().replace(/ /g, '-') + '.jpeg';
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

  getFoodQuantity(foodId: any): number {
    return this.cartItems
      .filter(item => item.menuItemId === String(foodId))
      .reduce((sum, item) => sum + item.quantity, 0);
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

  incrementFood(food: MenuFood, event: Event) {
    if (event) event.stopPropagation();
    
    const itemsForFood = this.cartItems.filter(item => item.menuItemId === String(food.id));
    if (itemsForFood.length > 0) {
      this.lastCartItemToRepeat = itemsForFood[itemsForFood.length - 1];
      this.foodToRepeat = food;
      this.showRepeatModal = true;
      if (this.isBrowser) {
        document.body.style.overflow = 'hidden';
      }
    } else {
      this.openAddonPopup(food);
    }
  }

  decrementFood(food: MenuFood, event: Event) {
    if (event) event.stopPropagation();
    
    const itemsForFood = this.cartItems.filter(item => item.menuItemId === String(food.id));
    if (itemsForFood.length > 0) {
      const lastItem = itemsForFood[itemsForFood.length - 1];
      const idToUpdate = lastItem._id || lastItem.menuItemId;
      
      if (lastItem.quantity > 1) {
        this.cartService.updateQuantity(idToUpdate, lastItem.quantity - 1).subscribe({
          next: (res: any) => console.log('Decremented quantity', res),
          error: (err: any) => console.error('Error decrementing quantity', err)
        });
      } else {
        this.cartService.removeItem(idToUpdate).subscribe({
          next: (res: any) => console.log('Removed from cart', res),
          error: (err: any) => console.error('Error removing from cart', err)
        });
      }
    }
  }

  closeRepeatModal() {
    this.showRepeatModal = false;
    this.foodToRepeat = null;
    this.lastCartItemToRepeat = null;
    if (this.isBrowser) {
      document.body.style.overflow = '';
    }
  }

  repeatLastCustomization() {
    if (this.foodToRepeat && this.lastCartItemToRepeat) {
      // For repeat customization, we add a new variation with the same customizations,
      // or if cartService groups them, it will increment the quantity of the matching item.
      this.cartService.addToCart({
        menuItemId: String(this.foodToRepeat.id),
        name: this.foodToRepeat.name,
        image: this.foodToRepeat.image,
        price: this.lastCartItemToRepeat.price, // Uses the same total price
        quantity: 1,
        customizations: [...(this.lastCartItemToRepeat.customizations || [])]
      }).subscribe({
        next: (res: any) => console.log('Added to cart via repeat', res),
        error: (err: any) => console.error('Error adding to cart', err)
      });
    }
    this.closeRepeatModal();
  }

  makeNewCustomization() {
    if (this.foodToRepeat) {
      const food = this.foodToRepeat;
      this.closeRepeatModal();
      this.openAddonPopup(food);
    }
  }

  formatCustomizations(customizations: any[] | undefined): string {
    if (!customizations || customizations.length === 0) return 'No addons selected';
    return customizations.map(c => c.name).join(', ');
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
      image: this.selectedFood.image,
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
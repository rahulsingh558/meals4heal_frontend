import { Component, Inject, PLATFORM_ID, OnInit } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { CartService } from '../../services/cart.service';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faCartPlus, faCheck, faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons';

export interface Ingredient {
  id: string;
  name: string;
  price: number;
  description?: string;
  protein?: number;
  calories?: number;
  category: 'base' | 'protein' | 'veggies' | 'dressing' | 'crunch';
  isPremium?: boolean;
}

@Component({
  standalone: true,
  selector: 'app-build-bowl',
  templateUrl: './build-bowl.html',
  styleUrls: ['./build-bowl.css'],
  imports: [CommonModule, FontAwesomeModule],
})
export class BuildBowl implements OnInit {
  isBrowser = false;
  faCartPlus = faCartPlus;
  faCheck = faCheck;
  faChevronDown = faChevronDown;
  faChevronUp = faChevronUp;

  // Base price for a custom bowl
  basePrice = 0;

  activeCategory: string = 'base';

  categories = [
    { id: 'base', title: '1. Choose Base', icon: '🥗' },
    { id: 'protein', title: '2. Add Protein', icon: '💪' },
    { id: 'veggies', title: '3. Select Veggies', icon: '🥒' },
    { id: 'dressing', title: '4. Pick Dressing', icon: '🍋' },
    { id: 'crunch', title: '5. Extra Crunch', icon: '🥜' }
  ];

  ingredients: Ingredient[] = [
    // Bases
    { id: 'b1', name: 'Moong Sprouts', price: 30, description: '50g raw moong', protein: 12, calories: 174, category: 'base' },
    { id: 'b2', name: 'Chana Sprouts', price: 27, description: '50g raw chana', protein: 10, calories: 182, category: 'base' },
    { id: 'b3', name: 'Soyabean Sprouts', price: 38, description: '50g raw soyabean', protein: 18, calories: 223, category: 'base' },
    { id: 'b4', name: 'Mix Sprouts', price: 70, description: '100g mixed', category: 'base' },

    // Proteins
    { id: 'p1', name: 'Boiled Egg', price: 20, description: '2 whole eggs', protein: 12, calories: 144, category: 'protein' },
    { id: 'p2', name: 'Paneer', price: 70, description: '50g raw paneer', protein: 8, calories: 135, category: 'protein', isPremium: true },
    { id: 'p3', name: 'Air Fried Chicken', price: 90, description: '150g raw chicken', protein: 34, calories: 180, category: 'protein', isPremium: true },
    { id: 'p4', name: 'Tofu', price: 35, description: '50g raw tofu', protein: 7.8, calories: 76, category: 'protein', isPremium: true },

    // Veggies
    { id: 'v1', name: 'Onion', price: 5, category: 'veggies' },
    { id: 'v2', name: 'Tomato', price: 5, category: 'veggies' },
    { id: 'v3', name: 'Cucumber', price: 10, category: 'veggies' },
    { id: 'v4', name: 'Capsicum', price: 5, category: 'veggies' },
    { id: 'v5', name: 'Boiled Sweet Corn', price: 20, description: '100g peeled sweetcorn', category: 'veggies', isPremium: true },
    { id: 'v6', name: 'Air Fried Broccoli', price: 50, description: '100g raw broccoli', category: 'veggies', isPremium: true },

    // Dressings
    { id: 'd1', name: 'Lemon', price: 2, category: 'dressing' },
    { id: 'd2', name: 'Black Pepper Powder', price: 1, category: 'dressing' },
    { id: 'd3', name: 'Black Salt', price: 1, category: 'dressing' },
    { id: 'd4', name: 'Peri Peri Powder', price: 1, category: 'dressing' },

    // Crunch
    { id: 'c1', name: 'Peanuts', price: 10, description: '25g', protein: 7, calories: 142, category: 'crunch', isPremium: true },
    { id: 'c2', name: 'Pumpkin Seeds', price: 15, description: '10g', protein: 2, calories: 56, category: 'crunch', isPremium: true },
    { id: 'c3', name: 'Chia Seeds', price: 15, description: '20g', protein: 3, calories: 97, category: 'crunch', isPremium: true }
  ];

  selectedIngredientIds: Set<string> = new Set();
  ingredientQuantities: Map<string, number> = new Map();

  // Track order of selection to stagger animations
  selectedIngredientsOrder: Ingredient[] = [];

  constructor(
    @Inject(PLATFORM_ID) platformId: Object,
    private cartService: CartService,
    private router: Router
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit() {
    // Select default base
    this.incrementQuantity(this.ingredients[0]);
  }

  getIngredientsByCategory(categoryId: string) {
    return this.ingredients.filter(i => i.category === categoryId);
  }

  isSelected(ingredient: Ingredient) {
    return this.selectedIngredientIds.has(ingredient.id);
  }

  toggleIngredient(ingredient: Ingredient) {
    if (this.selectedIngredientIds.has(ingredient.id)) {
      this.selectedIngredientIds.delete(ingredient.id);
      this.ingredientQuantities.delete(ingredient.id);
      this.selectedIngredientsOrder = this.selectedIngredientsOrder.filter(i => i.id !== ingredient.id);
    } else {
      this.selectedIngredientIds.add(ingredient.id);
      this.ingredientQuantities.set(ingredient.id, 1);
      this.selectedIngredientsOrder.push(ingredient);
    }
  }

  getQuantity(ingredient: Ingredient): number {
    return this.ingredientQuantities.get(ingredient.id) || 0;
  }

  incrementQuantity(ingredient: Ingredient, event?: Event) {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    const current = this.getQuantity(ingredient);
    if (current === 0) {
      this.selectedIngredientIds.add(ingredient.id);
      this.selectedIngredientsOrder.push(ingredient);
    }
    this.ingredientQuantities.set(ingredient.id, current + 1);
  }

  decrementQuantity(ingredient: Ingredient, event?: Event) {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    const current = this.getQuantity(ingredient);
    if (current > 1) {
      this.ingredientQuantities.set(ingredient.id, current - 1);
    } else if (current === 1) {
      this.selectedIngredientIds.delete(ingredient.id);
      this.ingredientQuantities.delete(ingredient.id);
      this.selectedIngredientsOrder = this.selectedIngredientsOrder.filter(i => i.id !== ingredient.id);
    }
  }

  setActiveCategory(categoryId: string) {
    this.activeCategory = categoryId;
  }

  get totalPrice(): number {
    let total = this.basePrice;
    this.selectedIngredientsOrder.forEach(i => {
      total += i.price * this.getQuantity(i);
    });
    return total;
  }

  get totalProtein(): number {
    let total = 0;
    this.selectedIngredientsOrder.forEach(i => {
      total += (i.protein || 0) * this.getQuantity(i);
    });
    return total;
  }

  get totalCalories(): number {
    let total = 0;
    this.selectedIngredientsOrder.forEach(i => {
      total += (i.calories || 0) * this.getQuantity(i);
    });
    return total;
  }

  getIngredientPosition(index: number, total: number) {
    // Distribute ingredients randomly but evenly inside the bowl
    // We use golden ratio for pseudo-random but even distribution
    const goldenRatio = 0.618033988749895;
    const r = Math.sqrt(index + 0.5) / Math.sqrt(total);
    const theta = index * goldenRatio * Math.PI * 2;

    // Max radius 40% to keep inside the bowl visually
    const maxRadius = 40;
    const x = 50 + r * maxRadius * Math.cos(theta);
    const y = 50 + r * maxRadius * Math.sin(theta);

    return {
      left: `${x}%`,
      top: `${y}%`,
      transform: 'translate(-50%, -50%)',
    };
  }

  addToCart() {
    if (this.selectedIngredientsOrder.length === 0) return;

    // We generate a unique ID for this custom bowl or use a standard one
    const customBowlId = 'custom_bowl_' + new Date().getTime();

    const customizations = this.selectedIngredientsOrder.map(i => ({
      id: i.id, // mapped to id for cart format
      name: i.name,
      price: i.price,
      quantity: this.getQuantity(i)
    }));

    this.cartService.addToCart({
      menuItemId: 'custom-bowl',
      name: 'Build Your Own Bowl',
      price: this.totalPrice,
      quantity: 1,
      customizations: customizations as any
    }).subscribe({
      next: (res: any) => {
        console.log('Added custom bowl to cart', res);
        this.router.navigate(['/cart']);
      },
      error: (err: any) => console.error('Error adding custom bowl to cart', err)
    });
  }
}

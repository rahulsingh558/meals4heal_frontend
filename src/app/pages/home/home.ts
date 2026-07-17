import {
  Component,
  AfterViewInit,
  Inject,
  PLATFORM_ID,
  signal
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { isPlatformBrowser } from '@angular/common';
import { CartService } from '../../services/cart.service';
import { ChatWidgetComponent } from '../../components/chat/chat.component';
import { environment } from '../../../environments/environment';

@Component({
  standalone: true,
  imports: [ChatWidgetComponent],
  template: `
    <!-- Your existing page content -->
    <app-chat-widget></app-chat-widget>
  `
})
export class YourPageComponent { }



interface WishlistItem {
  id: number;
  name: string;
  price: number;
}

interface BowlType {
  type: 'sprouts' | 'egg' | 'paneer' | 'chicken';
  title: string;
  description: string;
  calories: string;
  ingredients: string[];
  image: string;
  basePrice: number;
}

interface Testimonial {
  name: string;
  role: string;
  text: string;
  rating: number;
  avatar: string;
}



@Component({
  standalone: true,
  templateUrl: './home.html',
  styleUrls: ['./home.css'],
  imports: [
    RouterLink,
    CommonModule
  ],
})


export class Home implements AfterViewInit {

  private isBrowser = false;
  wishlist: WishlistItem[] = [];

  /* =========================
     ROTATING BOWL STATE
  ========================== */
  activeBowlIndex = signal(0);
  isBowlAnimating = signal(false);

  bowls: BowlType[] = [
    {
      type: 'sprouts',
      title: 'Moong Sprouts Bowl',
      description: 'Fresh moong beans packed with protein, vitamins, and refreshing crunch.',
      calories: '320 cal',
      ingredients: ['Moong', 'Cucumber', 'Tomato', 'Corn', 'Lemon Dressing'],
      image: `${environment.backendUrl}/uploads/seed/Moong%20bowl.jpeg`,
      basePrice: 90
    },
    {
      type: 'egg',
      title: 'Boiled Eggs',
      description: 'Healthy boiled eggs paired with a seasoned mix of crunchy, fresh vegetables.',
      calories: '320 cal',
      ingredients: ['Egg', 'Onion', 'Capsicum', 'Corn', 'Tomato', 'Lemon Dressing'],
      image: `${environment.backendUrl}/uploads/seed/egg%20bowl.jpeg`,
      basePrice: 60
    },
    {
      type: 'paneer',
      title: 'Air Fried Paneer',
      description: 'Delicious air-fried paneer cubes tossed with perfectly roasted capsicum and crunchy onions.',
      calories: '430 cal',
      ingredients: ['Paneer', 'Capsicum', 'Tomato', 'Corn', 'Tomato', 'Lemon Dressing'],
      image: `${environment.backendUrl}/uploads/seed/Air%20friedPaneer.jpeg`,
      basePrice: 170
    },
    {
      type: 'chicken',
      title: 'Air Fried Chicken',
      description: 'Crispy, guilt-free air-fried chicken breast tenderly cooked with minimal oil.',
      calories: '480 cal',
      ingredients: ['Chicken Breast', 'Capsicum', 'Onion', 'Lemon Dressing'],
      image: `${environment.backendUrl}/uploads/seed/Airfried%20chicken.jpeg`,
      basePrice: 180
    }
  ];

  /* =========================
     CAROUSEL STATE
  ========================== */
  activeTestimonialIndex = signal(0);

  testimonials: Testimonial[] = [
    {
      name: 'Ayushman',
      role: 'Fitness Influencer',
      text: 'The protein bowls are perfectly balanced and help in protein intake for vegetarian and non vegetarians.',
      rating: 4,
      avatar: `${environment.backendUrl}/uploads/review/ayushman.jpg`
    },
    {
      name: 'Puneet',
      role: 'IT Professional',
      text: 'Working long hours made healthy eating tough. Now with meals4heal, I get nutritious meals delivered. Lost 5kg in 2 months!',
      rating: 5,
      avatar: `${environment.backendUrl}/uploads/review/puneet.jpg`
    },
    {
      name: 'Lalit Kr Choudhary',
      role: 'Nutritionist',
      text: 'The quality of ingredients and nutritional balance is impressive. My patients love the variety and taste while staying healthy.',
      rating: 5,
      avatar: `${environment.backendUrl}/uploads/review/lalit.jpg`
    }
  ];

  /* =========================
     HEALTH BENEFITS
  ========================== */
  healthBenefits = [
    {
      icon: '🥬',
      title: 'Fresh Ingredients',
      description: 'Locally sourced, chemical-free vegetables delivered daily'
    },
    {
      icon: '⚖️',
      title: 'Balanced Nutrition',
      description: '30% protein, 40% carbs, 30% healthy fats in every meal'
    },
    {
      icon: '⚡',
      title: 'Quick Delivery',
      description: 'Within 30 minutes in Bangalore, hot and fresh'
    },
    {
      icon: '💚',
      title: 'Customizable',
      description: 'Choose your base, protein, and add-ons as per your diet'
    }
  ];

  constructor(
    @Inject(PLATFORM_ID) platformId: Object,
    private cartService: CartService
  ) {
    this.isBrowser = isPlatformBrowser(platformId);

    if (this.isBrowser) {
      this.wishlist = JSON.parse(
        localStorage.getItem('wishlist') || '[]'
      );
    }
  }

  /* =========================
     ROTATING BOWL FUNCTIONS
  ========================== */
  get activeBowl(): BowlType {
    return this.bowls[this.activeBowlIndex()];
  }

  nextBowl(): void {
    if (this.isBowlAnimating()) return;

    this.isBowlAnimating.set(true);
    this.activeBowlIndex.update(current => (current + 1) % this.bowls.length);

    setTimeout(() => this.isBowlAnimating.set(false), 600);
  }

  prevBowl(): void {
    if (this.isBowlAnimating()) return;

    this.isBowlAnimating.set(true);
    this.activeBowlIndex.update(current =>
      current === 0 ? this.bowls.length - 1 : current - 1
    );

    setTimeout(() => this.isBowlAnimating.set(false), 600);
  }

  goToBowl(index: number): void {
    if (this.isBowlAnimating() || index === this.activeBowlIndex()) return;

    this.isBowlAnimating.set(true);
    this.activeBowlIndex.set(index);
    setTimeout(() => this.isBowlAnimating.set(false), 600);
  }

  get isMobileView(): boolean {
    return this.isBrowser ? window.innerWidth < 640 : false;
  }

  getIngredientPosition(index: number): any {
    const total = this.activeBowl.ingredients.length;
    const angle = (index * 360 / total) * (Math.PI / 180);
    const radius = this.isMobileView ? 115 : 200;

    return {
      left: `calc(50% + ${Math.cos(angle) * radius}px)`,
      top: `calc(50% + ${Math.sin(angle) * radius}px)`,
      transform: 'translate(-50%, -50%)',
      'animation-delay': `${index * 0.1}s`
    };
  }

  // Helper function for title case (replaces the pipe)
  toTitleCase(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /* =========================
     TESTIMONIAL CAROUSEL
  ========================== */
  nextTestimonial(): void {
    this.activeTestimonialIndex.update(current =>
      (current + 1) % this.testimonials.length
    );
  }

  prevTestimonial(): void {
    this.activeTestimonialIndex.update(current =>
      current === 0 ? this.testimonials.length - 1 : current - 1
    );
  }

  goToTestimonial(index: number): void {
    this.activeTestimonialIndex.set(index);
  }

  get activeTestimonial(): Testimonial {
    return this.testimonials[this.activeTestimonialIndex()];
  }

  getStars(rating: number): boolean[] {
    return Array(5).fill(false).map((_, i) => i < rating);
  }

  /* =========================
     CART
  ========================== */
  addToCartFromHome(food: {
    foodId: number;
    name: string;
    basePrice: number;
  }) {
    this.cartService.addToCart({
      menuItemId: String(food.foodId),
      name: food.name,
      price: food.basePrice,
      quantity: 1,
      customizations: [],
    }).subscribe({
      next: (res: any) => console.log('Added to cart from home', res),
      error: (err: any) => console.error('Error adding to cart from home', err)
    });
  }

  /* =========================
     WISHLIST (FIXED)
  ========================== */
  toggleWishlist(item: WishlistItem) {
    if (!this.isBrowser) return;

    const index = this.wishlist.findIndex(i => i.id === item.id);

    if (index > -1) {
      this.wishlist.splice(index, 1);
    } else {
      this.wishlist.push(item);
    }

    localStorage.setItem(
      'wishlist',
      JSON.stringify(this.wishlist)
    );
  }

  isWishlisted(id: number): boolean {
    return this.wishlist.some(item => item.id === id);
  }

  /* =========================
     SCROLL ANIMATIONS
  ========================== */
  ngAfterViewInit(): void {
    if (!this.isBrowser) return;

    setTimeout(() => {
      const elements =
        document.querySelectorAll('.animate-on-scroll');

      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-show');
          }
        });
      });

      elements.forEach(el => observer.observe(el));
    }, 0);
  }
}
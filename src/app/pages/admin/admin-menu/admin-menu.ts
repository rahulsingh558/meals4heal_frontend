import { Component, OnInit, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FoodApiService, ApiFood } from '../../../services/food-api.service';
import { environment } from '../../../../environments/environment';
interface Addon {
  id: number;
  name: string;
  price: number;
}

@Component({
  selector: 'app-admin-menu',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-menu.html',
})
export class AdminMenuComponent implements OnInit {
  isBrowser = false;
  backendUrl = environment.backendUrl;
  items: ApiFood[] = [];
  loading = false;
  showMenuForm = false;
  editMode = false;
  editingId: string | null = null;
  errorMessage = '';
  successMessage = '';

  // Form fields
  formData = {
    name: '',
    subtitle: 'Healthy • Fresh • Protein-rich',
    basePrice: 0,
    calories: 200,
    type: 'veg' as 'veg' | 'egg' | 'nonveg',
    category: 'sprouts',
    image: null as File | null,
    imagePreview: '',
    defaultAddons: [] as Addon[],
    extraAddons: [] as Addon[],
  };

  // Available addons
  availableDefaultAddons: Addon[] = [
    { id: 1, name: 'Onion', price: 0 },
    { id: 2, name: 'Tomato', price: 0 },
    { id: 3, name: 'Cucumber', price: 0 },
    { id: 4, name: 'Lemon', price: 0 },
    { id: 5, name: 'Coriander', price: 0 },
  ];

  availableExtraAddons: Addon[] = [
    { id: 6, name: 'Sweet Corn', price: 20 },
    { id: 7, name: 'Broccoli', price: 25 },
    { id: 8, name: 'Beans', price: 15 },
    { id: 9, name: 'Peas', price: 15 },
    { id: 11, name: 'Capsicum', price: 20 },
    { id: 12, name: 'Cheese', price: 30 },
    { id: 13, name: 'Mushroom', price: 25 },
  ];

  constructor(
    private foodApi: FoodApiService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit() {
    this.loadItems();
  }

  loadItems() {
    this.loading = true;
    this.foodApi.getAllFoods().subscribe({
      next: (foods) => {
        this.items = foods;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load foods:', err);
        this.showError('Failed to load menu items');
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  openAddForm() {
    this.resetForm();
    this.editMode = false;
    this.showMenuForm = true;
  }

  openEditForm(item: ApiFood) {
    this.editMode = true;
    this.editingId = item._id;
    this.formData = {
      name: item.name,
      subtitle: item.subtitle,
      basePrice: item.basePrice,
      calories: item.calories,
      type: item.type,
      category: item.category,
      image: null,
      imagePreview: `${environment.backendUrl}${item.image}`,
      defaultAddons: [...item.defaultAddons],
      extraAddons: [...item.extraAddons],
    };
    this.showMenuForm = true;
  }

  onImageSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.formData.image = file;

      // Create preview
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.formData.imagePreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  toggleDefaultAddon(addon: Addon) {
    const index = this.formData.defaultAddons.findIndex(a => a.id === addon.id);
    if (index > -1) {
      this.formData.defaultAddons.splice(index, 1);
    } else {
      this.formData.defaultAddons.push(addon);
    }
  }

  toggleExtraAddon(addon: Addon) {
    const index = this.formData.extraAddons.findIndex(a => a.id === addon.id);
    if (index > -1) {
      this.formData.extraAddons.splice(index, 1);
    } else {
      this.formData.extraAddons.push(addon);
    }
  }

  isDefaultAddonSelected(id: number): boolean {
    return this.formData.defaultAddons.some(a => a.id === id);
  }

  isExtraAddonSelected(id: number): boolean {
    return this.formData.extraAddons.some(a => a.id === id);
  }

  saveItem() {
    if (!this.formData.name || this.formData.basePrice <= 0) {
      this.showError('Please fill in all required fields');
      return;
    }

    // For edit mode, image is optional
    if (!this.editMode && !this.formData.image) {
      this.showError('Please select an image');
      return;
    }

    this.loading = true;
    const formData = new FormData();

    formData.append('name', this.formData.name);
    formData.append('subtitle', this.formData.subtitle);
    formData.append('basePrice', this.formData.basePrice.toString());
    formData.append('calories', this.formData.calories.toString());
    formData.append('type', this.formData.type);
    formData.append('category', this.formData.category);
    formData.append('defaultAddons', JSON.stringify(this.formData.defaultAddons));
    formData.append('extraAddons', JSON.stringify(this.formData.extraAddons));

    if (this.formData.image) {
      formData.append('image', this.formData.image);
    }

    if (this.editMode && this.editingId) {
      // Update existing item
      this.foodApi.updateFood(this.editingId, formData).subscribe({
        next: () => {
          this.showSuccess('Menu item updated successfully');
          this.loadItems();
          this.closeForm();
        },
        error: (err) => {
          console.error('Failed to update food:', err);
          this.showError('Failed to update menu item');
          this.loading = false;
        }
      });
    } else {
      // Create new item
      this.foodApi.createFood(formData).subscribe({
        next: () => {
          this.showSuccess('Menu item added successfully');
          this.loadItems();
          this.closeForm();
        },
        error: (err) => {
          console.error('Failed to add food:', err);
          this.showError('Failed to add menu item');
          this.loading = false;
        }
      });
    }
  }

  deleteItem(id: string, name: string) {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) {
      return;
    }

    this.loading = true;
    this.foodApi.deleteFood(id).subscribe({
      next: () => {
        this.showSuccess('Menu item deleted successfully');
        this.loadItems();
      },
      error: (err) => {
        console.error('Failed to delete food:', err);
        this.showError('Failed to delete menu item');
        this.loading = false;
      }
    });
  }

  closeForm() {
    this.showMenuForm = false;
    this.resetForm();
  }

  resetForm() {
    this.formData = {
      name: '',
      subtitle: 'Healthy • Fresh • Protein-rich',
      basePrice: 0,
      calories: 200,
      type: 'veg',
      category: 'sprouts',
      image: null,
      imagePreview: '',
      defaultAddons: [],
      extraAddons: [],
    };
    this.editMode = false;
    this.editingId = null;
  }

  showError(message: string) {
    this.errorMessage = message;
    setTimeout(() => this.errorMessage = '', 5000);
  }

  showSuccess(message: string) {
    this.successMessage = message;
    setTimeout(() => this.successMessage = '', 5000);
  }
}
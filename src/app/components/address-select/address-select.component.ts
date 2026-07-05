import { Component, OnInit, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AddressService } from '../../services/address.service';
import { Address, AddressFormData } from '../../pages/address/address';
import { CartService, Cart } from '../../services/cart.service';

@Component({
  standalone: true,
  selector: 'app-address-select',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './address-select.component.html',
})
export class AddressSelectComponent implements OnInit {
  addresses: Address[] = [];
  selectedAddressIndex: number | null = null;
  showAddressForm = false;
  isEditing = false;
  editingAddressIndex: number | null = null;
  cartTotal = 0;
  isBrowser = false;
  isLoading = false;

  addressForm: FormGroup;

  constructor(
    private addressService: AddressService,
    private cartService: CartService,
    private router: Router,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);

    // Initialize form
    this.addressForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      phone: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      addressLine1: ['', [Validators.required, Validators.minLength(5)]],
      addressLine2: [''],
      city: ['', [Validators.required]],
      state: ['', [Validators.required]],
      pincode: ['', [Validators.required, Validators.pattern(/^[0-9]{6}$/)]],
      landmark: [''],
      isDefault: [false]
    });
  }

  ngOnInit() {
    // Load addresses from API
    if (this.isBrowser) {
      this.addressService.loadAddresses();
    }

    // Subscribe to addresses
    this.addressService.addresses$.subscribe(addresses => {
      this.addresses = addresses;

      // Auto-select default address if none selected
      if (this.isBrowser && this.selectedAddressIndex === null) {
        const defaultIndex = addresses.findIndex(addr => addr.isDefault);
        if (defaultIndex !== -1) {
          this.selectedAddressIndex = defaultIndex;
          this.addressService.setSelectedAddress(defaultIndex);
        }
      }

      // Force UI refresh after async address load
      this.cdr.detectChanges();
    });

    // Get cart total
    this.cartService.cart$.subscribe((cart: Cart) => {
      this.cartTotal = cart.total;
    });

    // Load initially selected address
    if (this.isBrowser) {
      const selectedAddress = this.addressService.getSelectedAddress();
      if (selectedAddress) {
        const index = this.addresses.findIndex(a =>
          a.addressLine1 === selectedAddress.addressLine1 && a.phone === selectedAddress.phone
        );
        if (index !== -1) {
          this.selectedAddressIndex = index;
        }
      }
    }
  }

  // Get selected address object
  get selectedAddress(): Address | null {
    if (this.selectedAddressIndex !== null && this.addresses[this.selectedAddressIndex]) {
      return this.addresses[this.selectedAddressIndex];
    }
    return null;
  }

  // Select an address
  selectAddress(index: number) {
    this.selectedAddressIndex = index;
    this.addressService.setSelectedAddress(index);
  }

  // Set as default address
  setDefaultAddress(index: number, event: Event) {
    event.stopPropagation();
    this.addressService.setDefaultAddress(index).subscribe({
      next: () => {
        this.selectedAddressIndex = index;
      },
      error: (err) => {
        console.error('Failed to set default address:', err);
        alert('Failed to set default address');
      }
    });
  }

  // Delete address
  deleteAddress(index: number, event: Event) {
    event.stopPropagation();
    if (confirm('Are you sure you want to delete this address?')) {
      this.addressService.deleteAddress(index).subscribe({
        next: () => {
          if (this.selectedAddressIndex === index) {
            this.selectedAddressIndex = null;
          }
        },
        error: (err) => {
          console.error('Failed to delete address:', err);
          alert('Failed to delete address');
        }
      });
    }
  }

  // Show add address form
  showAddForm() {
    this.showAddressForm = true;
    this.isEditing = false;
    this.editingAddressIndex = null;
    this.addressForm.reset({
      isDefault: false
    });
  }

  // Show edit address form
  showEditForm(address: Address, index: number, event: Event) {
    event.stopPropagation();
    this.showAddressForm = true;
    this.isEditing = true;
    this.editingAddressIndex = index;

    this.addressForm.patchValue({
      name: address.name,
      phone: address.phone,
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2 || '',
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      landmark: address.landmark || '',
      isDefault: address.isDefault
    });
  }

  // Submit address form
  submitAddress() {
    if (this.addressForm.invalid) {
      this.markFormGroupTouched(this.addressForm);
      return;
    }

    const formData: AddressFormData = this.addressForm.value;
    this.isLoading = true;

    if (this.isEditing && this.editingAddressIndex !== null) {
      this.addressService.updateAddress(this.editingAddressIndex, formData).subscribe({
        next: () => {
          this.isLoading = false;
          this.cancelForm();
        },
        error: (err) => {
          this.isLoading = false;
          console.error('Failed to update address:', err);
          alert('Failed to update address');
        }
      });
    } else {
      this.addressService.addAddress(formData).subscribe({
        next: () => {
          this.isLoading = false;
          this.cancelForm();
        },
        error: (err) => {
          this.isLoading = false;
          console.error('Failed to add address:', err);
          alert('Failed to add address');
        }
      });
    }
  }

  // Cancel form
  cancelForm() {
    this.showAddressForm = false;
    this.isEditing = false;
    this.editingAddressIndex = null;
    this.addressForm.reset({
      isDefault: false
    });
  }

  // Proceed to checkout
  proceedToCheckout() {
    if (this.selectedAddressIndex === null) {
      alert('Please select a delivery address');
      return;
    }

    this.router.navigate(['/checkout']);
  }

  // Back to cart
  backToCart() {
    this.router.navigate(['/cart']);
  }

  // Helper method to mark all form controls as touched
  private markFormGroupTouched(formGroup: FormGroup) {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  // Get formatted address string
  getFormattedAddress(address: Address): string {
    let parts = [
      address.addressLine1,
      address.addressLine2,
      address.city,
      address.state,
      address.pincode,
      address.landmark
    ].filter(part => part && part.trim() !== '');

    return parts.join(', ');
  }
}
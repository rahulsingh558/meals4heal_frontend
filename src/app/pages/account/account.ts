import { Component, OnInit, Inject, PLATFORM_ID, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { UserService, UserProfile, Address } from '../../services/user.service';
import { AddressService } from '../../services/address.service';
import { Address as AddressModel } from '../../pages/address/address';
import { AuthService } from '../../services/auth.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './account.html',
  styleUrls: ['./account.css']
})
export class Account implements OnInit {
  isBrowser = false;
  isAuthenticated = false;
  isLoading = true;
  isEditing = false;
  isSaving = false;
  errorMessage = '';
  successMessage = '';

  // User profile data
  userProfile: UserProfile | null = null;

  // Form data (editable)
  formData = {
    name: '',
    phone: '',
    profilePicture: ''
  };

  // Original data for cancel functionality
  private originalData: any;

  // Password Form Data
  passwordData = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  };
  isPasswordEditing = false;
  isPasswordSaving = false;
  passwordErrorMessage = '';
  passwordSuccessMessage = '';

  // Address Management
  addresses: AddressModel[] = [];
  showAddressForm = false;
  isAddressSaving = false;
  addressMessage = '';
  addressError = '';
  newAddress = {
    name: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pincode: '',
    landmark: '',
    isDefault: false
  };

  constructor(
    private userService: UserService,
    private addressService: AddressService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private zone: NgZone,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit() {
    if (!this.isBrowser) {
      return;
    }

    // Check authentication
    const token = localStorage.getItem('token');
    if (!token) {
      this.router.navigate(['/login']);
      return;
    }

    this.isAuthenticated = true;

    // Trigger initial change detection
    this.cdr.markForCheck();

    this.loadUserProfile();
    this.loadAddresses();
  }

  loadUserProfile() {
    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    this.userService.getUserProfile().subscribe({
      next: (response) => {
        this.zone.run(() => {
          this.userProfile = response.user;
          this.populateFormData(response.user);
          this.isLoading = false;
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        });
      },
      error: (error) => {
        this.zone.run(() => {
          console.error('Error loading profile:', error);
          this.errorMessage = 'Failed to load profile. Please try again.';
          this.isLoading = false;
          this.cdr.markForCheck();
          this.cdr.detectChanges();

          // If unauthorized, redirect to login
          if (error.status === 401) {
            localStorage.removeItem('token');
            this.router.navigate(['/login']);
          }
        });
      }
    });
  }

  loadAddresses() {
    this.addressService.loadAddresses();
    this.addressService.addresses$.subscribe(addresses => {
      this.addresses = addresses;
      this.cdr.detectChanges();
    });
  }

  populateFormData(user: UserProfile) {
    this.formData.name = user.name || '';
    this.formData.phone = user.phone || '';
    this.formData.profilePicture = user.profilePicture || '';

    // Save original data for cancel functionality
    this.originalData = JSON.parse(JSON.stringify(this.formData));
  }

  toggleEdit() {
    this.isEditing = !this.isEditing;
    this.errorMessage = '';
    this.successMessage = '';
  }

  cancelEdit() {
    // Restore original data
    this.formData = JSON.parse(JSON.stringify(this.originalData));
    this.isEditing = false;
    this.errorMessage = '';
    this.successMessage = '';
  }

  saveProfile() {
    // Validate form
    if (!this.formData.name.trim()) {
      this.errorMessage = 'Name is required';
      this.cdr.detectChanges();
      return;
    }

    if (this.formData.phone && !this.isValidPhone(this.formData.phone)) {
      this.errorMessage = 'Please enter a valid phone number';
      this.cdr.detectChanges();
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.markForCheck();

    const updateData = {
      name: this.formData.name,
      phone: this.formData.phone,
      profilePicture: this.formData.profilePicture
    };

    this.userService.updateUserProfile(updateData).subscribe({
      next: (response) => {
        this.zone.run(() => {
          this.userProfile = response.user;
          this.populateFormData(response.user);
          this.successMessage = 'Profile updated successfully!';
          this.isEditing = false;
          this.isSaving = false;

          // Update localStorage userName for consistency
          if (this.isBrowser) {
            localStorage.setItem('userName', response.user.name);
          }

          this.cdr.markForCheck();
          this.cdr.detectChanges();

          // Clear success message after 3 seconds
          setTimeout(() => {
            this.zone.run(() => {
              this.successMessage = '';
              this.cdr.detectChanges();
            });
          }, 3000);
        });
      },
      error: (error) => {
        this.zone.run(() => {
          console.error('Error updating profile:', error);
          this.errorMessage = error.error?.message || 'Failed to update profile. Please try again.';
          this.isSaving = false;
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        });
      }
    });
  }

  // Address Management Methods
  toggleAddressForm() {
    this.showAddressForm = !this.showAddressForm;
    this.addressError = '';
    this.addressMessage = '';
    if (!this.showAddressForm) {
      this.resetAddressForm();
    }
  }

  resetAddressForm() {
    this.newAddress = {
      name: '',
      phone: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      pincode: '',
      landmark: '',
      isDefault: false
    };
  }

  addAddress() {
    if (!this.newAddress.name.trim() || !this.newAddress.phone.trim() ||
        !this.newAddress.addressLine1.trim() || !this.newAddress.city.trim() ||
        !this.newAddress.state.trim() || !this.newAddress.pincode.trim()) {
      this.addressError = 'Please fill in all required fields';
      this.cdr.detectChanges();
      return;
    }

    this.isAddressSaving = true;
    this.addressError = '';

    this.addressService.addAddress(this.newAddress).subscribe({
      next: () => {
        this.zone.run(() => {
          this.addressMessage = 'Address added successfully!';
          this.isAddressSaving = false;
          this.showAddressForm = false;
          this.resetAddressForm();
          this.cdr.detectChanges();

          setTimeout(() => {
            this.zone.run(() => {
              this.addressMessage = '';
              this.cdr.detectChanges();
            });
          }, 3000);
        });
      },
      error: (error) => {
        this.zone.run(() => {
          console.error('Error adding address:', error);
          this.addressError = 'Failed to add address. Please try again.';
          this.isAddressSaving = false;
          this.cdr.detectChanges();
        });
      }
    });
  }

  setDefaultAddress(index: number) {
    this.addressService.setDefaultAddress(index).subscribe({
      next: () => {
        this.zone.run(() => {
          this.addressMessage = 'Default address updated!';
          this.cdr.detectChanges();
          setTimeout(() => {
            this.zone.run(() => {
              this.addressMessage = '';
              this.cdr.detectChanges();
            });
          }, 3000);
        });
      },
      error: (error) => {
        this.zone.run(() => {
          console.error('Error setting default address:', error);
          this.addressError = 'Failed to set default address.';
          this.cdr.detectChanges();
        });
      }
    });
  }

  deleteAddress(index: number) {
    if (!confirm('Are you sure you want to delete this address?')) {
      return;
    }

    this.addressService.deleteAddress(index).subscribe({
      next: () => {
        this.zone.run(() => {
          this.addressMessage = 'Address deleted successfully!';
          this.cdr.detectChanges();
          setTimeout(() => {
            this.zone.run(() => {
              this.addressMessage = '';
              this.cdr.detectChanges();
            });
          }, 3000);
        });
      },
      error: (error) => {
        this.zone.run(() => {
          console.error('Error deleting address:', error);
          this.addressError = 'Failed to delete address.';
          this.cdr.detectChanges();
        });
      }
    });
  }

  // Password Management
  togglePasswordEdit() {
    this.isPasswordEditing = !this.isPasswordEditing;
    this.passwordErrorMessage = '';
    this.passwordSuccessMessage = '';
    this.passwordData = { currentPassword: '', newPassword: '', confirmPassword: '' };
  }

  cancelPasswordEdit() {
    this.isPasswordEditing = false;
    this.passwordErrorMessage = '';
    this.passwordSuccessMessage = '';
    this.passwordData = { currentPassword: '', newPassword: '', confirmPassword: '' };
  }

  savePassword() {
    if (!this.passwordData.currentPassword || !this.passwordData.newPassword || !this.passwordData.confirmPassword) {
      this.passwordErrorMessage = 'All fields are required';
      return;
    }

    if (this.passwordData.newPassword !== this.passwordData.confirmPassword) {
      this.passwordErrorMessage = 'New passwords do not match';
      return;
    }

    if (this.passwordData.newPassword.length < 6) {
      this.passwordErrorMessage = 'New password must be at least 6 characters';
      return;
    }

    this.isPasswordSaving = true;
    this.passwordErrorMessage = '';
    this.passwordSuccessMessage = '';

    this.authService.updatePassword(this.passwordData.currentPassword, this.passwordData.newPassword).subscribe({
      next: (res) => {
        this.isPasswordSaving = false;
        this.passwordSuccessMessage = 'Password updated successfully';
        this.isPasswordEditing = false;
        this.passwordData = { currentPassword: '', newPassword: '', confirmPassword: '' };

        // Clear message after 3s
        setTimeout(() => {
          this.passwordSuccessMessage = '';
          this.cdr.detectChanges();
        }, 3000);
      },
      error: (err) => {
        this.isPasswordSaving = false;
        this.passwordErrorMessage = err.error?.message || 'Failed to update password';
      }
    });
  }

  isValidPhone(phone: string): boolean {
    const phoneRegex = /^[\d\s\-\+\(\)]{10,15}$/;
    return phoneRegex.test(phone);
  }

  getAvatarUrl(): string {
    if (this.formData.profilePicture) {
      return this.formData.profilePicture;
    }
    const initial = this.formData.name.charAt(0).toUpperCase() || 'U';
    return `https://ui-avatars.com/api/?name=${initial}&size=200&background=16a34a&color=fff&bold=true`;
  }
}
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-settings.html',
})
export class AdminSettingsComponent {
  settings = {
    restaurantName: 'meals4heal',
    email: 'admin@meals4heal.in',
    phone: '+91 8151070458',
    address: '123 Healthy Street, Nutrition City',
    deliveryRadius: 5,
    taxRate: 5,
    deliveryCharge: 30,
    openingTime: '10:00',
    closingTime: '22:00',
    notificationEnabled: true,
    lowStockAlert: 10
  };

  saveSettings() {
    console.log('Settings saved:', this.settings);
    alert('Settings saved successfully!');
  }
}
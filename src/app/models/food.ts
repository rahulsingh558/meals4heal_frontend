import { Addon } from './addon';

export interface Food {
  id: number;
  name: string;
  subtitle?: string; // ✅ ADD THIS (optional)
  basePrice: number;
  calories?: number;
  protein?: number;
  category: 'sprouts' | 'airfried';
  addons: Addon[];
}
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Addon {
  id: number;
  name: string;
  price: number;
}

export interface ApiFood {
  _id: string;
  name: string;
  subtitle: string;
  basePrice: number;
  calories: number;
  protein?: number;
  type: 'veg' | 'egg' | 'nonveg';
  category: string;
  image: string;
  defaultAddons: Addon[];
  extraAddons: Addon[];
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class FoodApiService {
  private API_URL = `${environment.apiUrl}/food`;

  constructor(private http: HttpClient) { }

  // User methods
  getAllFoods(): Observable<ApiFood[]> {
    return this.http.get<ApiFood[]>(this.API_URL);
  }

  getFoodById(id: string): Observable<ApiFood> {
    return this.http.get<ApiFood>(`${this.API_URL}/${id}`);
  }

  getFoodsByCategory(category: string): Observable<ApiFood[]> {
    return this.http.get<ApiFood[]>(`${this.API_URL}/category/${category}`);
  }

  // Admin methods
  createFood(foodData: FormData): Observable<ApiFood> {
    return this.http.post<ApiFood>(this.API_URL, foodData);
  }

  updateFood(id: string, foodData: FormData | Partial<ApiFood>): Observable<ApiFood> {
    return this.http.put<ApiFood>(`${this.API_URL}/${id}`, foodData);
  }

  deleteFood(id: string): Observable<any> {
    return this.http.delete(`${this.API_URL}/${id}`);
  }
}
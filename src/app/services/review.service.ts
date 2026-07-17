import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Review {
  _id?: string;
  userId: any;
  foodId: string;
  orderId: string;
  rating: number;
  comment?: string;
  createdAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ReviewService {
  private API_URL = `${environment.apiUrl}/reviews`;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  submitReview(reviewData: { foodId: string, orderId: string, rating: number, comment: string }): Observable<any> {
    return this.http.post<any>(this.API_URL, reviewData, { headers: this.getHeaders() });
  }

  getReviewsByFood(foodId: string): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/${foodId}`);
  }
}

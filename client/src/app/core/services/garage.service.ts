import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponse, PaginatedResponse } from '../models/api-response.model';
import { Garage } from '../models/garage.model';

@Injectable({ providedIn: 'root' })
export class GarageService {
  private readonly api = inject(ApiService);

  list(page = 1): Observable<PaginatedResponse<Garage>> {
    const params = new HttpParams().set('page', page);
    return this.api.get<PaginatedResponse<Garage>>('/garages', params);
  }

  show(id: number): Observable<ApiResponse<Garage>> {
    return this.api.get<ApiResponse<Garage>>(`/garages/${id}`);
  }

  store(data: Partial<Garage>): Observable<ApiResponse<Garage>> {
    return this.api.post<ApiResponse<Garage>>('/garages', data);
  }

  update(id: number, data: Partial<Garage>): Observable<ApiResponse<Garage>> {
    return this.api.put<ApiResponse<Garage>>(`/garages/${id}`, data);
  }

  remove(id: number): Observable<ApiResponse<void>> {
    return this.api.delete<ApiResponse<void>>(`/garages/${id}`);
  }

  assignPerson(garageId: number, data: object): Observable<ApiResponse<unknown>> {
    return this.api.post<ApiResponse<unknown>>(`/garages/${garageId}/persons`, data);
  }

  removePerson(garageId: number, roleId: number): Observable<ApiResponse<void>> {
    return this.api.delete<ApiResponse<void>>(`/garages/${garageId}/persons/${roleId}`);
  }
}

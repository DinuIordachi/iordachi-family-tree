import { inject, Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponse, Association, PaginatedResponse } from '@app/core/models';

@Injectable({ providedIn: 'root' })
export class AssociationService {
  private readonly api = inject(ApiService);

  list(page = 1, pageSize = 10): Observable<PaginatedResponse<Association>> {
    const params = new HttpParams().appendAll({ page, pageSize });
    return this.api.get<PaginatedResponse<Association>>('/associations', params);
  }

  show(id: number): Observable<ApiResponse<Association>> {
    return this.api.get<ApiResponse<Association>>(`/associations/${id}`);
  }

  store(data: Partial<Association>): Observable<ApiResponse<Association>> {
    return this.api.post<ApiResponse<Association>>('/associations', data);
  }

  update(id: number, data: Partial<Association>): Observable<ApiResponse<Association>> {
    return this.api.put<ApiResponse<Association>>(`/associations/${id}`, data);
  }

  remove(id: number): Observable<ApiResponse<void>> {
    return this.api.delete<ApiResponse<void>>(`/associations/${id}`);
  }

  assignPerson(associationId: number, data: object): Observable<ApiResponse<unknown>> {
    return this.api.post<ApiResponse<unknown>>(`/associations/${associationId}/persons`, data);
  }

  updatePersonRole(
    associationId: number,
    roleId: number,
    data: object,
  ): Observable<ApiResponse<unknown>> {
    return this.api.put<ApiResponse<unknown>>(
      `/associations/${associationId}/persons/${roleId}`,
      data,
    );
  }

  removePerson(associationId: number, roleId: number): Observable<ApiResponse<void>> {
    return this.api.delete<ApiResponse<void>>(`/associations/${associationId}/persons/${roleId}`);
  }
}

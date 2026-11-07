import { inject, Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from './api.service';
import {
  ApiResponse,
  FamilyMember,
  FamilyMemberMedia,
  FamilyMemberPayload,
  PaginatedResponse,
} from '@app/core/models';

export interface FamilyMemberQuery {
  page?: number;
  pageSize?: number;
  orderBy?: 'firstName' | 'lastName' | 'birthdate' | 'createdAt' | 'updatedAt' | 'id';
  orderDirection?: 'asc' | 'desc';
  term?: string;
  firstName?: string;
  lastName?: string;
  gender?: 'M' | 'F';
}

@Injectable({ providedIn: 'root' })
export class FamilyTreeService {
  private readonly api = inject(ApiService);

  /**
   * Full tree (unpaginated) — feeds the engraved tree on /tree.
   */
  list(): Observable<FamilyMember[]> {
    return this.api
      .get<ApiResponse<FamilyMember[]>>('/family-tree')
      .pipe(map((res) => res.data));
  }

  /**
   * Paginated list for the back-office table. Pass `asTree=false` to
   * the API so it skips the unpaginated tree branch.
   */
  paginate(query: FamilyMemberQuery = {}): Observable<PaginatedResponse<FamilyMember>> {
    let params = new HttpParams().set('asTree', 'false');
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    }
    return this.api.get<PaginatedResponse<FamilyMember>>('/family-tree', params);
  }

  show(id: string | number): Observable<FamilyMember> {
    return this.api
      .get<ApiResponse<FamilyMember>>(`/family-tree/${id}`)
      .pipe(map((res) => res.data));
  }

  store(payload: FamilyMemberPayload): Observable<FamilyMember> {
    return this.api
      .post<ApiResponse<FamilyMember>>('/family-tree', payload)
      .pipe(map((res) => res.data));
  }

  update(id: string | number, payload: Partial<FamilyMemberPayload>): Observable<FamilyMember> {
    return this.api
      .put<ApiResponse<FamilyMember>>(`/family-tree/${id}`, payload)
      .pipe(map((res) => res.data));
  }

  remove(id: string | number): Observable<void> {
    return this.api.delete<void>(`/family-tree/${id}`);
  }

  forceRemove(id: string | number): Observable<void> {
    return this.api.delete<void>(`/family-tree/${id}/force-delete`);
  }

  uploadThumbnail(id: string | number, file: File): Observable<FamilyMember> {
    const form = new FormData();
    form.append('file', file);
    return this.api
      .post<ApiResponse<FamilyMember>>(`/family-tree/${id}/thumbnail`, form)
      .pipe(map((res) => res.data));
  }

  removeThumbnail(id: string | number): Observable<void> {
    return this.api.delete<void>(`/family-tree/${id}/thumbnail`);
  }

  uploadMedia(id: string | number, file: File): Observable<FamilyMemberMedia> {
    const form = new FormData();
    form.append('file', file);
    return this.api
      .post<ApiResponse<FamilyMemberMedia>>(`/family-tree/${id}/media`, form)
      .pipe(map((res) => res.data));
  }

  removeMedia(id: string | number, mediaId: number): Observable<void> {
    return this.api.delete<void>(`/family-tree/${id}/media/${mediaId}`);
  }
}
